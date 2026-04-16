import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import {
  FileText, Image, Table2, Archive, FileCode, File, Folder,
  CalendarDays, Upload, Share2, MessageCircle, Settings,
  MessageSquare, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "\u{1F305} Good morning";
  if (h < 17) return "\u{2600}\u{FE0F} Good afternoon";
  return "\u{1F319} Good evening";
}

function formatBytes(bytes: number) {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + " GB";
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + " MB";
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + " KB";
  return bytes + " B";
}

function getFileIcon(mimeType: string | null, type: string) {
  if (type === "folder") return { icon: Folder, color: "text-indigo-400" };
  if (!mimeType) return { icon: File, color: "text-slate-400" };
  if (mimeType === "application/pdf") return { icon: FileText, color: "text-red-500" };
  if (mimeType.startsWith("image/")) return { icon: Image, color: "text-purple-500" };
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return { icon: Table2, color: "text-green-600" };
  if (mimeType.includes("wordprocessing") || mimeType.includes("document")) return { icon: FileText, color: "text-blue-500" };
  if (mimeType.includes("tar") || mimeType.includes("gzip") || mimeType.includes("zip")) return { icon: Archive, color: "text-orange-500" };
  if (mimeType.startsWith("text/")) return { icon: FileCode, color: "text-slate-500" };
  if (mimeType.includes("presentation")) return { icon: FileText, color: "text-orange-500" };
  return { icon: File, color: "text-slate-400" };
}

const activityIcons: Record<string, { icon: React.ElementType; bg: string; fg: string }> = {
  file: { icon: Upload, bg: "bg-blue-100 dark:bg-blue-900/30", fg: "text-blue-600 dark:text-blue-400" },
  share: { icon: Share2, bg: "bg-green-100 dark:bg-green-900/30", fg: "text-green-600 dark:text-green-400" },
  comment: { icon: MessageCircle, bg: "bg-purple-100 dark:bg-purple-900/30", fg: "text-purple-600 dark:text-purple-400" },
  system: { icon: Settings, bg: "bg-slate-100 dark:bg-slate-800", fg: "text-slate-600 dark:text-slate-400" },
  talk: { icon: MessageSquare, bg: "bg-indigo-100 dark:bg-indigo-900/30", fg: "text-indigo-600 dark:text-indigo-400" },
};

function StorageRing({ used, quota, size = 80 }: { used: number; quota: number; size?: number }) {
  const ratio = used / quota;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#4F46E5" strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-500" />
    </svg>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/dashboard"],
    queryFn: () => fetch("/api/dashboard").then((r) => r.json()).then((r) => r.data),
  });

  return (
    <div className="p-6 space-y-4">
      {/* Welcome Banner */}
      <div className="col-span-7 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{getGreeting()}, Piyush 👋</h1>
            <p className="mt-1 text-indigo-100 text-sm">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
          </div>
          <div className="flex items-center gap-3">
            <StorageRing used={data?.storageUsed ?? 19764235469} quota={data?.storageQuota ?? 53687091200} size={48} />
            <div className="text-right text-sm">
              <p className="font-medium">{formatBytes(data?.storageUsed ?? 19764235469)}</p>
              <p className="text-indigo-200 text-xs">of {formatBytes(data?.storageQuota ?? 53687091200)} used</p>
            </div>
          </div>
        </div>
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-7 gap-4">
        {/* Recent Files */}
        <Card className="col-span-4 flex flex-col">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <h3 className="font-medium">Recent Files</h3>
            <Link to="/files" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="flex-1 pt-0">
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <div className="space-y-1">
                {data?.recentFiles?.map((f: any) => {
                  const { icon: Icon, color } = getFileIcon(f.mimeType, f.type);
                  return (
                    <div key={f.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50 transition-colors">
                      <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                      <span className="flex-1 truncate text-sm font-medium">{f.name}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatBytes(f.size || 0)}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(f.modifiedAt), { addSuffix: true })}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="col-span-3 flex flex-col">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <h3 className="font-medium">Upcoming Events</h3>
            <Link to="/calendar" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              Open Calendar <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="flex-1 pt-0">
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : data?.upcomingEvents?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CalendarDays className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data?.upcomingEvents?.map((e: any) => (
                  <div key={e.id} className="flex items-start gap-3 rounded-lg px-2 py-2">
                    <div className="mt-1 w-1 self-stretch rounded-full" style={{ backgroundColor: e.color }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.allDay
                          ? `${format(new Date(e.startAt), "EEE, d MMM")} · All day`
                          : `${format(new Date(e.startAt), "EEE, d MMM · HH:mm")} – ${format(new Date(e.endAt), "HH:mm")}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Storage Ring */}
        <Card className="col-span-1 flex flex-col items-center justify-center p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Storage</p>
          <StorageRing used={data?.storageUsed ?? 19764235469} quota={data?.storageQuota ?? 53687091200} />
          <p className="mt-3 text-sm font-semibold">{formatBytes(data?.storageUsed ?? 19764235469)}</p>
          <p className="text-xs text-muted-foreground">of {formatBytes(data?.storageQuota ?? 53687091200)}</p>
        </Card>

        {/* Recent Messages */}
        <Card className="col-span-3 flex flex-col">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">Messages</h3>
              {(data?.unreadMessages ?? 0) > 0 && <Badge className="h-5 px-1.5 text-[10px]">{data.unreadMessages}</Badge>}
            </div>
            <Link to="/talk" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              Open Talk <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="flex-1 pt-0">
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : (
              <div className="space-y-1">
                {data?.recentMessages?.map((rm: any) => {
                  const c = rm.conversation;
                  const initials = c.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2);
                  return (
                    <div key={c.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50 transition-colors">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-muted-foreground">
                          {c.lastMessageAt ? formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: true }) : ""}
                        </span>
                        {(c.unreadCount || 0) > 0 && (
                          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Activity */}
        <Card className="col-span-3 flex flex-col">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <h3 className="font-medium">Recent Activity</h3>
            <Link to="/activity" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="flex-1 pt-0">
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <div className="space-y-1">
                {data?.recentActivity?.map((a: any) => {
                  const ai = activityIcons[a.type] || activityIcons.system;
                  const Icon = ai.icon;
                  return (
                    <div key={a.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ai.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${ai.fg}`} />
                      </div>
                      <p className="flex-1 text-sm truncate">{a.description}</p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                        {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
