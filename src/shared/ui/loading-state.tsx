import { Skeleton, type SkeletonVariant } from "./skeleton";

type LoadingStateProps = {
  label?: string;
  className?: string;
  /** Shape of the content being loaded (list rows by default). */
  variant?: SkeletonVariant;
  withHeader?: boolean;
};

/** Loading panel — a layout-shaped skeleton; pairs with EmptyState / ErrorState. */
export function LoadingState({ label, className, variant = "list", withHeader }: LoadingStateProps) {
  return <Skeleton variant={variant} label={label} withHeader={withHeader} className={className} />;
}
