"use client";

import { createContext, useContext } from "react";
import type { SessionUser } from "@/shared/api/session";

const SessionUserContext = createContext<SessionUser | null>(null);

export function SessionUserProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <SessionUserContext.Provider value={user}>
      {children}
    </SessionUserContext.Provider>
  );
}

export function useSessionUser(): SessionUser {
  const user = useContext(SessionUserContext);
  if (!user) {
    throw new Error("useSessionUser must be used within SessionUserProvider");
  }
  return user;
}
