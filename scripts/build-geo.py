#!/usr/bin/env python3
"""
Builds the static location catalogue from GeoNames (CC BY 4.0, https://www.geonames.org).

Outputs
  public/geo/<version>/cities/<CC>.json      one file per country, fetched on demand
  src/entities/geo/model/countries.generated.ts   country codes and default time zones

Every populated place with 500+ inhabitants or an administrative seat is included
(GeoNames `cities500`); city districts and historical / abandoned places are not.

Run: python3 scripts/build-geo.py [--cache DIR]
Downloads (~200 MB, cached in DIR) are only needed when refreshing the data.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import shutil
import sys
import unicodedata
import urllib.request
import zipfile
from collections import defaultdict
from pathlib import Path

VERSION = "v2"
BASE_URL = "https://download.geonames.org/export/dump/"
ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "geo" / VERSION / "cities"
COUNTRIES_TS = ROOT / "src" / "entities" / "geo" / "model" / "countries.generated.ts"

# Sections of a city, historical, abandoned or destroyed places are not cities to pick.
EXCLUDED_FEATURES = {"PPLX", "PPLH", "PPLQ", "PPLW", "PPLCH"}
MAX_CITY_LENGTH = 80  # backend `company.City` limit
LANGUAGE_CODE = re.compile(r"[a-z]{2,3}")  # excludes pseudo codes such as link, wkdt, iata, post
# English names of the surrounding unit ("Tokat Province") are not city names.
ADMIN_SUFFIX = re.compile(r"\b(Province|Governorate|District|Region|County|Municipality|Prefecture|Oblast)$", re.I)
DOMINANT = 10  # a place this many times larger than its namesakes keeps the bare name

csv.field_size_limit(sys.maxsize)


def fetch(cache: Path, name: str) -> Path:
    target = cache / name
    if not target.exists():
        print(f"downloading {name} …", file=sys.stderr)
        with urllib.request.urlopen(BASE_URL + name) as res, open(target, "wb") as out:
            shutil.copyfileobj(res, out)
    return target


def read_tsv(path: Path, member: str | None = None):
    if member:
        with zipfile.ZipFile(path) as zf, zf.open(member) as raw:
            for line in (b.decode("utf-8") for b in raw):
                if line and not line.startswith("#"):
                    yield line.rstrip("\n").split("\t")
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            if line and not line.startswith("#"):
                yield line.rstrip("\n").split("\t")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", default="/tmp/geo", help="download cache directory")
    args = parser.parse_args()
    cache = Path(args.cache)
    cache.mkdir(parents=True, exist_ok=True)

    countries = {
        row[0]: frozenset(code.split("-")[0] for code in row[15].split(",") if code)
        for row in read_tsv(fetch(cache, "countryInfo.txt"))
        if len(row) > 15 and len(row[0]) == 2
    }
    admin1 = {
        row[0]: {"id": row[3], "name": clean(row[1]) or row[2], "country": row[0].split(".")[0]}
        for row in read_tsv(fetch(cache, "admin1CodesASCII.txt"))
        if len(row) > 3
    }

    cities: dict[str, dict] = {}
    for row in read_tsv(fetch(cache, "cities500.zip"), "cities500.txt"):
        geoname_id, name, feature, country = row[0], clean(row[1]), row[7], row[8]
        if feature in EXCLUDED_FEATURES or country not in countries or not name or not row[17]:
            continue
        region = admin1.get(f"{country}.{row[10]}", {})
        cities[geoname_id] = {
            "name": name,
            "country": country,
            "region_id": region.get("id", ""),
            "region": region.get("name", ""),
            "timezone": row[17],
            "population": int(row[14] or 0),
            "capital": feature == "PPLC",
        }

    regions = {r["id"]: r for r in admin1.values() if r["id"]}
    places = {**cities, **regions}
    wanted = {gid: countries.get(place["country"], frozenset()) for gid, place in places.items()}
    names, local, languages = load_names(cache, wanted)
    for geoname_id, place in places.items():
        localized = names.get(geoname_id, {})
        english = localized.get("en", "")
        # "Şanlıurfa" is how Turkish writes it, so it beats "Sanliurfa"; "Ţarţūs" is a
        # transliteration nobody writes, so "Tartus" wins.
        native = fold(english) == fold(place["name"]) and place["name"] in local.get(geoname_id, ())
        if english and not native:
            place["name"] = english
        place["ar"] = localized.get("ar", "")
    for geoname_id, city in cities.items():
        city["prominence"] = math.log10(city["population"] + 1) + math.log10(1 + languages.get(geoname_id, 0))
    for city in cities.values():
        region = regions.get(city["region_id"])
        if region:
            city["region"], city["region_ar"] = region["name"], region["ar"]
        city["region"] = ADMIN_SUFFIX.sub("", city["region"]).strip(" ,-") or city["region"]

    by_country: dict[str, list[dict]] = defaultdict(list)
    for city in cities.values():
        by_country[city["country"]].append(city)

    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True)

    country_rows = []
    total = 0
    for code in sorted(by_country):
        entries = build_country(by_country[code])
        if not entries["c"]:
            continue
        total += len(entries["c"])
        (OUT_DIR / f"{code}.json").write_text(json.dumps(entries, ensure_ascii=False, separators=(",", ":")), "utf-8")
        country_rows.append((code, default_timezone(by_country[code])))

    write_countries(country_rows)
    print(f"{len(country_rows)} countries, {total} cities → {OUT_DIR.relative_to(ROOT)}", file=sys.stderr)


BIDI_MARKS = dict.fromkeys(map(ord, "\u200e\u200f\u061c\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069\ufeff"))


def clean(text: str) -> str:
    return " ".join(text.translate(BIDI_MARKS).split())


def fold(text: str) -> str:
    """Accent-, case- and punctuation-free form: "Şanlıurfa" and "Sanliurfa" fold alike."""
    plain = unicodedata.normalize("NFKD", text.replace("ı", "i").replace("İ", "I"))
    return "".join(ch for ch in plain.lower() if ch.isalnum() and not unicodedata.combining(ch))


def is_arabic(text: str) -> bool:
    return any("\u0600" <= ch <= "\u06ff" for ch in text) and not any(ch.isascii() and ch.isalpha() for ch in text)


def load_names(
    cache: Path, wanted: dict[str, frozenset[str]]
) -> tuple[dict[str, dict[str, str]], dict[str, set[str]], dict[str, int]]:
    """
    For each wanted place (mapped to its country's languages):
      - display names: the best English name (GeoNames' own name is often a transliteration
        such as "Ḩamāh") and the best Arabic-script Arabic name. Preferred names win, then
        full names, then the earliest entry; colloquial and historic are skipped;
      - its names in the country's own languages;
      - the number of languages naming it (ISO 639 codes only), a fame signal.
    """
    best: dict[tuple[str, str], tuple[int, str]] = {}
    local: dict[str, set[str]] = defaultdict(set)
    languages: dict[str, set[str]] = defaultdict(set)
    for row in read_tsv(fetch(cache, "alternateNamesV2.zip"), "alternateNamesV2.txt"):
        if len(row) < 8:
            continue
        own = wanted.get(row[1])
        if own is None:
            continue
        if LANGUAGE_CODE.fullmatch(row[2]):
            languages[row[1]].add(row[2])
        name, preferred = clean(row[3]), row[4] == "1"
        if not name or row[6] == "1" or row[7] == "1":
            continue
        if row[2] in own:
            local[row[1]].add(name)
        if row[2] not in ("en", "ar"):
            continue
        if row[2] == "ar" and not is_arabic(name):
            continue
        if row[2] == "en" and ADMIN_SUFFIX.search(name):
            continue
        rank = (2 if preferred else 0) + (1 if row[5] != "1" else 0)
        key = (row[1], row[2])
        if key not in best or rank > best[key][0]:
            best[key] = (rank, name)
    names: dict[str, dict[str, str]] = defaultdict(dict)
    for (gid, lang), (_, name) in best.items():
        names[gid][lang] = name
    return names, local, {gid: len(codes) for gid, codes in languages.items()}


def build_country(rows: list[dict]) -> dict:
    """
    Unique city values, most prominent first; the order is the rank the picker uses.
    Prominence weighs population and the number of languages naming the place equally
    (log scale), so big districts of a metropolis and bot-translated villages both rank
    below well-known cities. A shared name gets its region unless one place dwarfs its
    namesakes (Houston, Texas stays "Houston"); same name and region keeps the most prominent.
    """
    rows = sorted(rows, key=lambda r: (-r["prominence"], r["name"]))
    namesakes: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        namesakes[r["name"]].append(r)
    bare = set()
    for group in namesakes.values():
        biggest = max(group, key=lambda r: r["population"])
        others = max((r["population"] for r in group if r is not biggest), default=0)
        if biggest["population"] >= DOMINANT * max(others, 1):
            bare.add(id(biggest))

    seen: set[str] = set()
    timezones: list[str] = []
    tz_index: dict[str, int] = {}
    out = []
    for r in rows:
        shared = id(r) not in bare and len(namesakes[r["name"]]) > 1 and r["region"] and r["region"] != r["name"]
        value = f"{r['name']}, {r['region']}" if shared else r["name"]
        if value in seen or len(value) > MAX_CITY_LENGTH:
            continue
        seen.add(value)
        ar = r.get("ar", "")
        if ar and shared:
            ar = f"{ar} ({r.get('region_ar') or r['region']})"
        if r["timezone"] not in tz_index:
            tz_index[r["timezone"]] = len(timezones)
            timezones.append(r["timezone"])
        out.append([value, ar, tz_index[r["timezone"]]])
    return {"tz": timezones, "c": out}


def default_timezone(rows: list[dict]) -> str:
    capital = next((r for r in rows if r["capital"]), None)
    return (capital or max(rows, key=lambda r: r["population"]))["timezone"]


def write_countries(rows: list[tuple[str, str]]) -> None:
    body = ",\n".join(f'  ["{code}", "{tz}"]' for code, tz in rows)
    COUNTRIES_TS.parent.mkdir(parents=True, exist_ok=True)
    COUNTRIES_TS.write_text(
        "// Generated by scripts/build-geo.py from GeoNames (CC BY 4.0). Do not edit.\n\n"
        f'export const GEO_DATA_VERSION = "{VERSION}";\n\n'
        "/** ISO 3166-1 alpha-2 code and the IANA time zone of the capital (or largest city). */\n"
        "export const COUNTRY_ROWS: readonly (readonly [code: string, timezone: string])[] = [\n"
        f"{body},\n];\n",
        "utf-8",
    )


if __name__ == "__main__":
    main()
