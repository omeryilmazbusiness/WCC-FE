"use client";

import { useRef, useState, type DragEvent } from "react";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { deleteAvatar, uploadAvatar, UserAvatar, type Profile } from "@/entities/profile";
import { cn } from "@/shared/lib/cn";
import { ConfirmDialog, useMutationFeedback, useToast } from "@/shared/ui";
import { AVATAR_ACCEPT, AvatarFileError, prepareAvatar } from "../lib/prepare-avatar";

type Props = { profile: Profile; onSaved: (profile: Profile) => void };

/** Large avatar with change / remove; a photo can be picked or dropped onto it. */
export function ProfilePhoto({ profile, onSaved }: Props) {
  const t = useTranslations("settings.profile.photo");
  const feedback = useMutationFeedback();
  const { push } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  async function upload(file: File | undefined) {
    if (!file || busy) return;
    setBusy("upload");
    try {
      const saved = await uploadAvatar(await prepareAvatar(file));
      onSaved(saved);
      feedback.success(t("updated"));
    } catch (err) {
      if (err instanceof AvatarFileError) push({ title: t(`problem.${err.problem}`), tone: "error" });
      else feedback.error(err, t("uploadFailed"));
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy("remove");
    try {
      onSaved(await deleteAvatar());
      feedback.success(t("removed"));
      setConfirmRemove(false);
    } catch (err) {
      feedback.error(err, t("removeFailed"));
    } finally {
      setBusy(null);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    void upload(e.dataTransfer.files?.[0]);
  }

  const hasPhoto = Boolean(profile.avatarVersion);

  return (
    <div className="flex flex-col items-center gap-3" data-testid="profile-photo">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={busy !== null}
        aria-label={hasPhoto ? t("change") : t("add")}
        className={cn(
          "group relative rounded-full outline-none ring-offset-4 transition focus-visible:ring-2 focus-visible:ring-[#007AFF]",
          dragging && "ring-2 ring-[#007AFF]",
        )}
      >
        <UserAvatar
          id={profile.id}
          name={profile.fullName || profile.email}
          avatarVersion={profile.avatarVersion}
          size="xl"
          className="shadow-[0_18px_40px_-18px_rgba(79,70,229,0.75)] ring-4 ring-white"
        />
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100",
            (busy || dragging) && "opacity-100",
          )}
          aria-hidden
        >
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : dragging ? <Upload className="h-6 w-6" /> : <Camera className="h-6 w-6" />}
        </span>
        <span
          className="absolute bottom-0.5 end-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#007AFF] text-white shadow-md ring-[3px] ring-white"
          aria-hidden
        >
          <Camera className="h-4 w-4" strokeWidth={2.4} />
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept={AVATAR_ACCEPT.join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void upload(e.target.files?.[0])}
        data-testid="profile-photo-input"
      />
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy !== null}
          className="rounded-full px-3 py-1.5 text-[13.5px] font-semibold text-[#007AFF] transition hover:bg-[#007AFF]/10 disabled:opacity-50"
          data-testid="profile-photo-change"
        >
          {hasPhoto ? t("change") : t("add")}
        </button>
        {hasPhoto ? (
          <button
            type="button"
            onClick={() => setConfirmRemove(true)}
            disabled={busy !== null}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[13.5px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
            data-testid="profile-photo-remove"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            {t("remove")}
          </button>
        ) : null}
      </div>
      <p className="text-center text-[11.5px] text-zinc-400">{t("hint")}</p>
      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={t("removeTitle")}
        description={t("removeBody")}
        confirmLabel={t("remove")}
        cancelLabel={t("cancel")}
        onConfirm={() => void remove()}
        pending={busy === "remove"}
        destructive
      />
    </div>
  );
}
