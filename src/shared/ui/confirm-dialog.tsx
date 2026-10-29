"use client";

import { useEffect, useState } from "react";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Input } from "./input";
import { Label } from "./label";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  destructive?: boolean;
  /** When set, Delete stays disabled until the typed value matches. */
  challenge?: string;
  challengeLabel?: string;
};

/** Controlled yes / no confirmation; the caller closes it once its action settles. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  pending = false,
  destructive = false,
  challenge,
  challengeLabel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const expected = challenge?.trim() ?? "";
  const matched = !expected || typed.trim().toLowerCase() === expected.toLowerCase();

  useEffect(() => {
    if (open) setTyped("");
  }, [open, expected]);

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {expected ? (
          <div className="space-y-2">
            <Label htmlFor="confirm-challenge">{challengeLabel}</Label>
            <Input
              id="confirm-challenge"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              data-testid="confirm-challenge"
            />
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" disabled={pending} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={pending || !matched}
            onClick={onConfirm}
            data-testid="confirm-submit"
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
