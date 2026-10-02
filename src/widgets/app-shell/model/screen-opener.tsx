"use client";

import { createContext, useContext, type MouseEvent } from "react";

type ScreenOpener = (e: MouseEvent<HTMLAnchorElement>, href: string) => void;

const ScreenOpenerContext = createContext<ScreenOpener>(() => {});

/** Lets navigation links open screens as workspace tabs without knowing how tabs work. */
export const ScreenOpenerProvider = ScreenOpenerContext.Provider;

export function useScreenOpener(): ScreenOpener {
  return useContext(ScreenOpenerContext);
}
