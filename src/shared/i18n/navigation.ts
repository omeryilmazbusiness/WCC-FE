import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Server-side helpers target the plain app routes; the middleware moves them into the
 * viewer's `/{company}/{branch}` workspace. Client navigation keeps the current one.
 */
export const { redirect, getPathname } = createNavigation(routing);

export {
  Link,
  usePathname,
  useRouter,
  useWorkspaceRef,
  WorkspaceRefProvider,
} from "./workspace-navigation";
