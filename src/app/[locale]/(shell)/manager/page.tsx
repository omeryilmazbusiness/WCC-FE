import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import {
  AlertTriangle,
  ClipboardList,
  FileWarning,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { Screen } from "@/shared/ui/screen";

type Props = { params: Promise<{ locale: string }> };

const KPIS = [
  {
    label: "Leads open",
    icon: ClipboardList,
    accent: "bg-sky-50 text-sky-700",
  },
  {
    label: "Overdue tasks",
    icon: AlertTriangle,
    accent: "bg-amber-50 text-amber-700",
  },
  {
    label: "Unpaid",
    icon: Wallet,
    accent: "bg-rose-50 text-rose-700",
  },
  {
    label: "Missing docs",
    icon: FileWarning,
    accent: "bg-violet-50 text-violet-700",
  },
] as const;

export default async function ManagerPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("manager");

  return (
    <Screen>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map(({ label, icon: Icon, accent }) => (
          <div
            key={label}
            className="group relative flex min-h-[124px] flex-col justify-between overflow-hidden rounded-[22px] border border-zinc-200/70 bg-gradient-to-br from-white to-zinc-50/80 px-4 py-4 transition-all duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-[0_12px_32px_-18px_rgba(24,24,27,0.35)]"
          >
            <span
              className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${accent}`}
            >
              <Icon className="h-6 w-6" strokeWidth={1.6} />
            </span>
            <div className="mt-3 min-w-0">
              <p className="text-[32px] font-semibold leading-none tracking-tight tabular-nums text-zinc-900">
                —
              </p>
              <p className="mt-1.5 truncate text-[13px] font-medium text-zinc-500">
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Screen>
  );
}
