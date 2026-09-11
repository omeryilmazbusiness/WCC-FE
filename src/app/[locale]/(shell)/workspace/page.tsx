import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Briefcase, GitBranch } from "lucide-react";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { PageHeader } from "@/shared/ui/page-header";
import { Screen } from "@/shared/ui/screen";

type Props = { params: Promise<{ locale: string }> };

export default async function WorkspacePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("workspace");

  return (
    <Screen>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[24px] border border-zinc-200/70 bg-white p-6 shadow-[0_12px_36px_-22px_rgba(15,23,42,0.22)] sm:p-7">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <Briefcase className="h-6 w-6" strokeWidth={1.6} />
          </span>
          <h2 className="mt-5 text-[15px] font-semibold tracking-tight text-zinc-950">
            {t("tasksTitle")}
          </h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500">
            {t("tasksBody")}
          </p>
        </section>

        <Link
          href={routes.pipeline}
          className="group rounded-[24px] border border-zinc-200/70 bg-white p-6 shadow-[0_12px_36px_-22px_rgba(15,23,42,0.22)] transition-all duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-[0_16px_40px_-22px_rgba(15,23,42,0.3)] sm:p-7"
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
            <GitBranch className="h-6 w-6" strokeWidth={1.6} />
          </span>
          <h2 className="mt-5 text-[15px] font-semibold tracking-tight text-zinc-950">
            {t("pipelineTitle")}
          </h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500">
            {t("pipelineBody")}
          </p>
        </Link>
      </div>
    </Screen>
  );
}
