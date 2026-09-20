"use client";

const KEY = "wcc_scope_branch";

export function getScopedBranchId(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(KEY) || fallback;
}

export function setScopedBranchId(branchId: string) {
  localStorage.setItem(KEY, branchId);
  window.dispatchEvent(new CustomEvent("wcc:branch-scope", { detail: branchId }));
}

export function useBranchScopeListener(onChange: (id: string) => void) {
  if (typeof window === "undefined") return;
  const handler = (e: Event) => {
    const id = (e as CustomEvent<string>).detail;
    if (id) onChange(id);
  };
  window.addEventListener("wcc:branch-scope", handler);
  return () => window.removeEventListener("wcc:branch-scope", handler);
}
