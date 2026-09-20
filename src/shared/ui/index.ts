/**
 * Shared UI kit — Soft Light design system.
 *
 * Prefer importing from `@/shared/ui` so screens stay consistent:
 *
 * ```tsx
 * import { Button, SearchField, FilterBar, FilterChip, useToast } from "@/shared/ui";
 * import { NotificationBell, pushNotification } from "@/features/notifications";
 * ```
 *
 * Layering (FSD):
 * - `shared/ui`     → presentational primitives (no domain)
 * - `features/*`    → stateful product modules (notifications, auth, …)
 * - `widgets/*`     → composed shells that wire features + ui
 */
export { Button, buttonVariants, type ButtonProps } from "./button";
export { IconButton } from "./icon-button";
export { Input } from "./input";
export { Label } from "./label";
export { Badge } from "./badge";
export {
  StageBadge,
  LEAD_STAGE_TONES,
  TASK_STATUS_TONES,
  type StageBadgeTone,
} from "./stage-badge";
export { CapacityBadge } from "./capacity-badge";
export { MetricCard, type MetricAccent } from "./metric-card";
export { SurfacePanel, type SurfaceAccent } from "./surface-panel";
export { SegmentedControl } from "./segmented-control";
export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./select";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./card";
export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./dialog";
export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "./form";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
export { Separator } from "./separator";
export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./table";
export { DataTable } from "./data-table";
export { SearchField } from "./search-field";
export { SearchFilterBar, FilterEditIcon } from "./search-filter-bar";
export {
  FilterBar,
  FilterChip,
  FilterMenu,
  type FilterOption,
} from "./filter-bar";
export { PageHeader } from "./page-header";
export { EmptyState } from "./empty-state";
export { ErrorState } from "./error-state";
export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
} from "./drawer";
export { Screen } from "./screen";
export { ListScreen } from "./list-screen";
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuShortcut,
} from "./dropdown-menu";
export { ToastProvider, useToast, type ToastTone } from "./toast";
