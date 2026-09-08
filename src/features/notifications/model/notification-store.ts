import { routes } from "@/shared/config/routes";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
  tone?: "default" | "warning" | "critical" | "success";
};

type Listener = () => void;

let notifications: AppNotification[] = [
  {
    id: "n1",
    title: "Overdue follow-up",
    body: "3 leads need a call before EOD.",
    createdAt: new Date().toISOString(),
    read: false,
    href: routes.workspace,
    tone: "warning",
  },
  {
    id: "n2",
    title: "Missing documents",
    body: "Ahmed Al-Rashid — passport copy pending.",
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    read: false,
    href: routes.customers,
    tone: "critical",
  },
  {
    id: "n3",
    title: "Booking confirmed",
    body: "PKG-UMR-2401 balance updated.",
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    read: true,
    tone: "success",
  },
];

const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

export function getNotifications() {
  return notifications;
}

export function subscribeNotifications(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function markNotificationRead(id: string) {
  notifications = notifications.map((n) =>
    n.id === id ? { ...n, read: true } : n,
  );
  emit();
}

export function markAllNotificationsRead() {
  notifications = notifications.map((n) => ({ ...n, read: true }));
  emit();
}

export function dismissNotification(id: string) {
  notifications = notifications.filter((n) => n.id !== id);
  emit();
}

export function pushNotification(
  input: Omit<AppNotification, "id" | "createdAt" | "read"> & {
    id?: string;
    createdAt?: string;
    read?: boolean;
  },
) {
  const item: AppNotification = {
    id: input.id ?? crypto.randomUUID(),
    title: input.title,
    body: input.body,
    href: input.href,
    tone: input.tone ?? "default",
    createdAt: input.createdAt ?? new Date().toISOString(),
    read: input.read ?? false,
  };
  notifications = [item, ...notifications];
  emit();
  return item.id;
}

export function unreadNotificationCount() {
  return notifications.filter((n) => !n.read).length;
}
