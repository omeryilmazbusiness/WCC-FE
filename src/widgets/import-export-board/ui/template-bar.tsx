"use client";

import { useState } from "react";
import { BookmarkPlus, Bookmark, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  applyTemplate,
  sameMapping,
  type FieldDef,
  type ImportEntityType,
  type ImportExportRepository,
} from "@/entities/importexport";
import { cn } from "@/shared/lib/cn";
import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  TONES,
  useToast,
} from "@/shared/ui";
import { useMappingTemplates } from "../model/use-mapping-templates";

type Props = {
  repo: ImportExportRepository;
  entity: ImportEntityType;
  fields: FieldDef[];
  headers: string[];
  mapping: Record<string, string>;
  onApply: (mapping: Record<string, string>) => void;
};

/** Saved mappings for this entity: one tap to apply, save the current one, delete. */
export function TemplateBar({ repo, entity, fields, headers, mapping, onApply }: Props) {
  const t = useTranslations("importExport.templates");
  const { push } = useToast();
  const { templates, saving, save, remove } = useMappingTemplates(repo, entity);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const canSave = Object.values(mapping).some(Boolean);

  function apply(id: string) {
    const tpl = templates.find((x) => x.id === id);
    if (!tpl) return;
    const result = applyTemplate(fields, headers, tpl);
    if (result.applied === 0) {
      push({ title: t("noMatch"), tone: "error" });
      return;
    }
    onApply(result.mapping);
    push({ title: t("applied", { count: result.applied }), tone: "success" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (await save(name, mapping)) {
      setNaming(false);
      setName("");
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2 rounded-[20px] border border-zinc-200/60 bg-gradient-to-br p-3", TONES.violet.tint)} data-testid="ie-templates">
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", TONES.violet.soft)} aria-hidden>
        <Bookmark className="h-4 w-4" strokeWidth={2.2} />
      </span>
      <span className="me-1 text-[13px] font-semibold text-zinc-800">{t("title")}</span>
      {templates.length === 0 ? <span className="text-[12px] text-zinc-500">{t("empty")}</span> : null}
      {templates.map((tpl) => {
        const active = sameMapping(applyTemplate(fields, headers, tpl).mapping, mapping);
        return (
          <span
            key={tpl.id}
            className={cn(
              "flex items-center rounded-full ring-1 ring-inset transition",
              active ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-zinc-700 ring-zinc-900/[0.08] hover:ring-violet-300",
            )}
          >
            <button type="button" onClick={() => apply(tpl.id)} aria-pressed={active} className="max-w-[180px] truncate py-1.5 ps-3 pe-1.5 text-[12.5px] font-semibold">
              {tpl.name}
            </button>
            <button
              type="button"
              onClick={() => setDeleting(tpl.id)}
              aria-label={t("delete", { name: tpl.name })}
              className={cn("me-1 flex h-6 w-6 items-center justify-center rounded-full transition", active ? "hover:bg-white/20" : "text-zinc-400 hover:bg-rose-50 hover:text-rose-600")}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </span>
        );
      })}
      <Button type="button" size="sm" variant="secondary" className="ms-auto" disabled={!canSave} onClick={() => setNaming(true)} data-testid="ie-template-save">
        <BookmarkPlus className="h-4 w-4" aria-hidden />
        {t("save")}
      </Button>

      <Dialog open={naming} onOpenChange={(open) => !saving && setNaming(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("saveTitle")}</DialogTitle>
            <DialogDescription>{t("saveHint")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <Input autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} aria-label={t("name")} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setNaming(false)} disabled={saving}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={saving || !name.trim()}>
                {t("save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteTitle")}
        description={t("deleteBody", { name: templates.find((x) => x.id === deleting)?.name ?? "" })}
        confirmLabel={t("deleteConfirm")}
        cancelLabel={t("cancel")}
        destructive
        onConfirm={() => {
          const id = deleting;
          setDeleting(null);
          if (id) void remove(id);
        }}
      />
    </div>
  );
}
