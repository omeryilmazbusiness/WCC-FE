"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Building2, CircleAlert, CircleCheck, Clock, FileSignature, ShieldX, User } from "lucide-react";
import { mapPublicLetter, type PublicLetter } from "@/entities/finance";
import { cn } from "@/shared/lib/cn";
import { formatDateTime, formatDay, formatMoney } from "@/shared/lib/format";
import { Button, Field, IconInput, LoadingState, Textarea } from "@/shared/ui";

type State = { kind: "loading" } | { kind: "missing" } | { kind: "error" } | { kind: "ready"; letter: PublicLetter };

const endpoint = (token: string) => `/api/public/reconciliation/${encodeURIComponent(token)}`;

async function readLetter(res: Response): Promise<PublicLetter> {
  const json = (await res.json()) as { data?: Record<string, unknown> } & Record<string, unknown>;
  return mapPublicLetter((json.data ?? json) as Record<string, unknown>);
}

/** Recipient side of a balance confirmation: shows the balance and records a signed confirm / dispute. */
export function PublicLetterCard({ token }: { token: string }) {
  const t = useTranslations("financeHub.confirm");
  const locale = useLocale();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"confirm" | "dispute" | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(endpoint(token), { cache: "no-store" })
      .then(async (res) => {
        if (!live) return;
        if (res.status === 404) return setState({ kind: "missing" });
        if (!res.ok) return setState({ kind: "error" });
        setState({ kind: "ready", letter: await readLetter(res) });
      })
      .catch(() => live && setState({ kind: "error" }));
    return () => {
      live = false;
    };
  }, [token]);

  async function respond(confirm: boolean) {
    if (busy || !name.trim() || (!confirm && !note.trim())) return;
    setBusy(confirm ? "confirm" : "dispute");
    setFailed(false);
    try {
      const res = await fetch(endpoint(token), {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "wcc" },
        body: JSON.stringify({ confirm, name: name.trim(), note: note.trim() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState({ kind: "ready", letter: await readLetter(res) });
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  if (state.kind === "loading") return <LoadingState variant="detail" />;
  if (state.kind !== "ready") {
    return (
      <Shell>
        <Hero icon={ShieldX} tone="rose" title={state.kind === "missing" ? t("missing") : t("error")} subtitle={state.kind === "missing" ? t("missingHint") : t("errorHint")} />
      </Shell>
    );
  }

  const l = state.letter;
  const open = l.status === "sent";
  const money = formatMoney(l.balance, locale, l.currency);

  return (
    <Shell>
      <Hero icon={FileSignature} tone="emerald" title={t("title")} subtitle={t("subtitle", { company: l.company })} />
      <div className="mt-6 rounded-[24px] bg-gradient-to-br from-emerald-50 via-white to-white p-5 text-center ring-1 ring-inset ring-emerald-100">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">{t("balanceAt", { date: formatDay(l.periodEnd, locale) })}</div>
        <div className="mt-1 text-[34px] font-semibold tracking-tight tabular-nums text-zinc-950" data-testid="confirm-balance">
          {money}
        </div>
        <div className="mt-1 flex items-center justify-center gap-1.5 text-[13px] text-zinc-600">
          <Building2 className="h-4 w-4" aria-hidden />
          {l.partyName}
        </div>
        <p className="mt-3 text-[12.5px] text-zinc-500">{l.balance >= 0 ? t("owesUs") : t("weOwe")}</p>
      </div>

      {open ? (
        <div className="mt-6 space-y-4">
          <Field label={t("name")} htmlFor="cf-name">
            <IconInput id="cf-name" icon={User} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" data-testid="confirm-name" />
          </Field>
          <Field label={t("note")} htmlFor="cf-note" hint={t("noteHint")}>
            <Textarea id="cf-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
          </Field>
          {failed ? <p className="text-[12.5px] font-semibold text-rose-700">{t("failed")}</p> : null}
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Button variant="outline" className="h-12 border-rose-200 text-rose-700" disabled={!name.trim() || !note.trim() || busy !== null} onClick={() => void respond(false)} data-testid="confirm-dispute">
              <CircleAlert className="h-5 w-5" aria-hidden />
              {t("dispute")}
            </Button>
            <Button className="h-12 bg-emerald-600 hover:bg-emerald-700" disabled={!name.trim() || busy !== null} onClick={() => void respond(true)} data-testid="confirm-accept">
              <CircleCheck className="h-5 w-5" aria-hidden />
              {t("accept")}
            </Button>
          </div>
          <p className="flex items-center justify-center gap-1.5 text-[12px] text-zinc-400">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {t("expires", { date: formatDateTime(l.expiresAt, locale) })}
          </p>
        </div>
      ) : (
        <div className={cn("mt-6 rounded-[22px] p-4 text-center", l.status === "confirmed" ? "bg-emerald-50" : l.status === "disputed" ? "bg-rose-50" : "bg-zinc-50")} data-testid="confirm-done">
          <div className="text-[15px] font-semibold text-zinc-900">{t(`status.${l.status}`)}</div>
          {l.respondedAt ? (
            <div className="mt-1 text-[12.5px] text-zinc-600">
              {l.respondedBy} · {formatDateTime(l.respondedAt, locale)}
            </div>
          ) : null}
          {l.responseNote ? <p className="mt-2 text-[13px] text-zinc-700">“{l.responseNote}”</p> : null}
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-emerald-50/40 px-4 py-10">
      <div className="w-full max-w-md rounded-[32px] border border-zinc-200/60 bg-white/90 p-7 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">{children}</div>
    </main>
  );
}

function Hero({ icon: Icon, tone, title, subtitle }: { icon: typeof ShieldX; tone: "emerald" | "rose"; title: string; subtitle: string }) {
  return (
    <div className="text-center">
      <span
        className={cn(
          "mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] text-white",
          tone === "emerald" ? "bg-gradient-to-br from-emerald-400 to-teal-600" : "bg-gradient-to-br from-rose-400 to-pink-600",
        )}
        aria-hidden
      >
        <Icon className="h-8 w-8" />
      </span>
      <h1 className="mt-4 text-[22px] font-semibold tracking-tight text-zinc-950">{title}</h1>
      <p className="mt-1 text-[13.5px] text-zinc-500">{subtitle}</p>
    </div>
  );
}
