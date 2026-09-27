/** Pure model behind every search + filter bar: a filter is "active" when it differs from its default. */

export type FilterOptionLike = { value: string; label: string };

export type FilterSectionLike = {
  id: string;
  label: string;
  value: string;
  options: readonly FilterOptionLike[];
  /** Falls back to the first option. */
  defaultValue?: string;
};

export type ActiveFilter = {
  sectionId: string;
  sectionLabel: string;
  value: string;
  valueLabel: string;
  defaultValue: string;
};

export function defaultOf(section: FilterSectionLike): string {
  return section.defaultValue ?? section.options[0]?.value ?? "";
}

export function activeFilters(sections: readonly FilterSectionLike[]): ActiveFilter[] {
  const out: ActiveFilter[] = [];
  for (const section of sections) {
    const def = defaultOf(section);
    if (section.value === def) continue;
    out.push({
      sectionId: section.id,
      sectionLabel: section.label,
      value: section.value,
      valueLabel: section.options.find((o) => o.value === section.value)?.label ?? section.value,
      defaultValue: def,
    });
  }
  return out;
}

export type FilterValues = Readonly<Record<string, string>>;

export function countActive(values: FilterValues, defaults: FilterValues): number {
  return Object.keys(defaults).reduce((n, id) => n + (values[id] !== undefined && values[id] !== defaults[id] ? 1 : 0), 0);
}

export function setFilter<V extends FilterValues>(values: V, id: keyof V & string, value: string): V {
  return values[id] === value ? values : { ...values, [id]: value };
}
