import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";

export function formatRelative(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return formatDistanceToNow(date, { addSuffix: true });
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d, yyyy");
}

export function formatEventTime(startAt: string, endAt: string, allDay: boolean): string {
  if (allDay) return "All day";
  const start = parseISO(startAt);
  const end = parseISO(endAt);
  return `${format(start, "h:mm a")} \u2013 ${format(end, "h:mm a")}`;
}

export function formatEventDate(startAt: string, allDay: boolean): string {
  const date = parseISO(startAt);
  return format(date, allDay ? "EEEE, d MMMM" : "EEEE, d MMMM \u00B7 h:mm a");
}
