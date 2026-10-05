/**
 * Resolve hook for `node --experimental-strip-types` self-tests: maps `@/…` to `src/…`, adds
 * the `.ts` extension (or `/index.ts`) to extensionless imports, and swaps barrels that pull
 * in React components for the test shims in `scripts/shims`.
 * Use: node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/selftest-x.ts
 */
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const SHIMS = {
  "@/entities/finance": new URL("./shims/finance-entity.ts", import.meta.url).href,
  "@/entities/hotel": new URL("./shims/hotel-entity.ts", import.meta.url).href,
  "@/entities/supplier": new URL("./shims/supplier-entity.ts", import.meta.url).href,
};

function withExtension(path) {
  for (const candidate of [path, `${path}.ts`, `${path}/index.ts`]) {
    if (candidate.endsWith(".ts") && existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, next) {
    if (SHIMS[specifier]) return { url: SHIMS[specifier], shortCircuit: true };
    if (specifier.startsWith("@/")) {
      const url = withExtension(SRC + specifier.slice(2));
      if (url) return { url, shortCircuit: true };
    }
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
      const url = withExtension(fileURLToPath(new URL(specifier, context.parentURL)));
      if (url) return { url, shortCircuit: true };
    }
    return next(specifier, context);
  },
});
