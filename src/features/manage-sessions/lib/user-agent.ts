export type DeviceInfo = {
  browser: string | null;
  os: string | null;
  mobile: boolean;
};

// Order matters: Chromium forks and in-app iOS browsers also contain "Chrome" / "Safari".
const BROWSERS: readonly [RegExp, string][] = [
  [/Edg(?:e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Version\/[\d.]+.*Safari\//, "Safari"],
];

const SYSTEMS: readonly [RegExp, string, boolean][] = [
  [/iPhone|iPad|iPod/, "iOS", true],
  [/Android/, "Android", true],
  [/Windows/, "Windows", false],
  [/CrOS/, "ChromeOS", false],
  [/Mac OS X|Macintosh/, "macOS", false],
  [/Linux/, "Linux", false],
];

/** Coarse, dependency-free browser / OS detection for the active sessions list. */
export function parseUserAgent(userAgent: string | null | undefined): DeviceInfo {
  const ua = userAgent ?? "";
  const browser = BROWSERS.find(([pattern]) => pattern.test(ua))?.[1] ?? null;
  const system = SYSTEMS.find(([pattern]) => pattern.test(ua));
  return { browser, os: system?.[1] ?? null, mobile: system?.[2] ?? false };
}
