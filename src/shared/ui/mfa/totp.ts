export const TOTP_CODE_PATTERN = /^\d{6}$/;

export function normalizeTotp(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

/** Groups a base32 secret into blocks of four for manual entry. */
export function formatSecret(secret: string): string {
  return secret.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}
