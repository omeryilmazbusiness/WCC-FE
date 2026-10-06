export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

/** Rough 0–4 strength for the meter only; the policy itself is `passwordIssues`. */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return 0;
  const length = [...password].length;
  let score = 0;
  if (length >= 10) score++;
  if (length >= 14) score++;
  if (/\p{Ll}/u.test(password) && /\p{Lu}/u.test(password)) score++;
  if (/\p{Nd}/u.test(password) && /[^\p{L}\p{Nd}]/u.test(password)) score++;
  if (length < 10) score = Math.min(score, 1);
  return Math.max(1, Math.min(4, score)) as PasswordStrength;
}
