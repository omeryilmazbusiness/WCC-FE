import { getTranslations } from "next-intl/server";

export default async function LocaleNotFound() {
  const t = await getTranslations("errors");
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">{t("notFoundTitle")}</h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">{t("notFoundDescription")}</p>
    </div>
  );
}
