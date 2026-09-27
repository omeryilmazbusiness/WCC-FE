"use client";

import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { normalizeTotp } from "./totp";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  autoFocus?: boolean;
};

export function TotpInput({ id, label, value, onChange, error, autoFocus }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(normalizeTotp(e.target.value))}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        placeholder="123456"
        className="text-center font-mono text-lg tracking-[0.5em]"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-[var(--destructive)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
