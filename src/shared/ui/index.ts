/**
 * Shared UI kit — Soft Light design system.
 *
 * Prefer importing from `@/shared/ui` so screens stay consistent:
 *
 * ```tsx
 * import { Button, SearchField, FilterBar, FilterChip, useToast } from "@/shared/ui";
 * import { NotificationBell } from "@/features/notifications";
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
export { Textarea } from "./textarea";
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
export { TONES, type Tone } from "./tone";
export { IconTile } from "./icon-tile";
export { WidgetCard } from "./widget-card";
export { StatTile } from "./stat-tile";
export { ActionTile } from "./action-tile";
export { ControlTile } from "./control-tile";
export { ProgressRing } from "./progress-ring";
export { SoftGradientBackground } from "./soft-gradient-background";
export { ListRow } from "./list-row";
export { Pager } from "./pager";
export { PagedList } from "./paged-list";
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
export { ConfirmDialog } from "./confirm-dialog";
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
export { DataTable, type DataTableColumnMeta } from "./data-table";
export { SearchField } from "./search-field";
export {
  SearchFilterBar,
  ActiveFilterChips,
  FilterEditIcon,
  type FilterSection,
  type FilterSectionOption,
} from "./search-filter-bar";
export {
  FilterBar,
  FilterChip,
  FilterMenu,
  type FilterOption,
} from "./filter-bar";
export { PageHeader } from "./page-header";
export { EmptyState } from "./empty-state";
export { ErrorState } from "./error-state";
export { LoadingState } from "./loading-state";
export { Bone, Skeleton, type SkeletonVariant } from "./skeleton";
export { ScrollFlyIn } from "./scroll-fly-in";
export { LiquidGlassTypewriter, type GlassWord } from "./liquid-glass-text";
export { PermissionDenied } from "./permission-denied";
export { QueryState } from "./query-state";
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
export { Popover, PopoverTrigger, PopoverContent } from "./popover";
export { ToastProvider, useToast, type ToastTone } from "./toast";
export {
  useDescribeError,
  errorKind,
  type ErrorKind,
  type DescribedError,
} from "./use-describe-error";
export { useMutationFeedback } from "./use-mutation-feedback";
export { MaskedSecret } from "./masked-secret";
export { CopyButton } from "./copy-button";
export { InitialsAvatar } from "./initials-avatar";
export { FormSection, GroupLabel } from "./form-section";
export { ActionDialog, ChoiceCard, Field } from "./action-dialog";
export { IconInput } from "./icon-input";
export { ChipSet, ChoiceGrid, MoneyInput, StarPicker, Stepper, SwitchRow, type ChoiceOption } from "./form-controls";
export { InfoRow, InfoSection, infoActionClass } from "./info-section";
