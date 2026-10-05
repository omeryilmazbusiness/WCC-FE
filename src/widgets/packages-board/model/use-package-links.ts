"use client";

import { useMemo } from "react";
import { createBookingRepository, type Booking } from "@/entities/booking";
import { createLeadRepository, type Lead } from "@/entities/lead";
import { createTaskRepository, type Task } from "@/entities/task";
import { useCan } from "@/entities/viewer";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { summarizeLinks } from "./links";

const leads = createLeadRepository();
const tasks = createTaskRepository();
const bookings = createBookingRepository();

/** Leads, tasks and bookings tied to a package, each loaded only when the viewer may read it. */
export function usePackageLinks(packageId: string) {
  const can = { leads: useCan("leads.read"), tasks: useCan("tasks.read"), bookings: useCan("bookings.read") };
  const leadQ = useApiQuery<Lead[]>(() => leads.list({ packageId }), [packageId], {
    cacheKey: ["package-links", "leads", packageId],
    enabled: can.leads,
    liveTopics: ["lead"],
  });
  const taskQ = useApiQuery<Task[]>(() => tasks.list({ packageId }), [packageId], {
    cacheKey: ["package-links", "tasks", packageId],
    enabled: can.tasks,
    liveTopics: ["task"],
  });
  const bookingQ = useApiQuery<Booking[]>(() => bookings.list({ packageId }), [packageId], {
    cacheKey: ["package-links", "bookings", packageId],
    enabled: can.bookings,
    liveTopics: ["booking"],
  });
  const data = useMemo(
    () => ({ leads: leadQ.data ?? [], tasks: taskQ.data ?? [], bookings: bookingQ.data ?? [] }),
    [leadQ.data, taskQ.data, bookingQ.data],
  );
  const summary = useMemo(() => summarizeLinks(data), [data]);
  return {
    can,
    ...data,
    summary,
    loading: { leads: leadQ.loading, tasks: taskQ.loading, bookings: bookingQ.loading },
    error: { leads: leadQ.error, tasks: taskQ.error, bookings: bookingQ.error },
    reload: { leads: leadQ.refresh, tasks: taskQ.refresh, bookings: bookingQ.refresh },
    setLeads: leadQ.setData,
    setTasks: taskQ.setData,
    repositories: { leads, tasks },
  };
}

export type PackageLinks = ReturnType<typeof usePackageLinks>;
