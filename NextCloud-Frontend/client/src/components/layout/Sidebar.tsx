import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  CalendarDays,
  StickyNote,
  Users,
  Kanban,
  Mail,
  Activity,
  Image,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { CloudSpaceLogo } from "./CloudSpaceLogo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Conversation, Activity as ActivityType } from "@shared/schema";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Files", icon: FolderOpen, href: "/files" },
  { label: "Talk", icon: MessageSquare, href: "/talk" },
  { label: "Calendar", icon: CalendarDays, href: "/calendar" },
  { label: "Notes", icon: StickyNote, href: "/notes" },
  { label: "Contacts", icon: Users, href: "/contacts" },
  { label: "Deck", icon: Kanban, href: "/deck" },
  { label: "Mail", icon: Mail, href: "/mail" },
  { label: "Activity", icon: Activity, href: "/activity" },
  { label: "Media", icon: Image, href: "/media" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [location] = useLocation();
  const { data: userData } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user");
      return res.json() as Promise<{ data: { name?: string; email?: string } }>;
    },
  });
  const userName = userData?.data?.name || "User";
  const userEmail = userData?.data?.email || "";

  const { data: convosData } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const res = await fetch("/api/conversations");
      return res.json() as Promise<{ data: Conversation[] }>;
    },
  });
  const totalUnread = (convosData?.data || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const { data: emailCountsData } = useQuery({
    queryKey: ["/api/emails/counts"],
    queryFn: async () => {
      const res = await fetch("/api/emails/counts");
      return res.json() as Promise<{ data: { inbox: number; drafts: number; spam: number } }>;
    },
    staleTime: 30_000,
  });
  const mailUnread = emailCountsData?.data?.inbox ?? 0;

  const { data: activityData } = useQuery({
    queryKey: ["/api/activity", "all"],
    queryFn: async () => {
      const res = await fetch("/api/activity?limit=50&type=all");
      return res.json() as Promise<{ data: ActivityType[] }>;
    },
    staleTime: 30_000,
  });
  const activityUnread = (activityData?.data || []).filter(a => !a.isRead).length;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 flex h-screen flex-col border-r bg-sidebar transition-all duration-200",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
      style={{ borderColor: "hsl(var(--sidebar-border))" }}
    >
      {/* Logo */}
      <div className={cn("flex h-14 items-center gap-2 border-b px-4", collapsed && "justify-center px-0")}>
        <CloudSpaceLogo size={28} />
        {!collapsed && <span className="text-base font-semibold text-foreground">CloudSpace</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;

            const badgeCount =
              item.label === "Talk" ? totalUnread :
              item.label === "Mail" ? mailUnread :
              item.label === "Activity" ? activityUnread : 0;
            const showBadge = badgeCount > 0;

            const linkContent = (
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-0"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {showBadge && (
                      <span className="bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 min-w-[18px] text-center animate-badge-pulse">
                        {badgeCount}
                      </span>
                    )}
                  </>
                )}
                {collapsed && showBadge && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-primary rounded-full animate-badge-pulse" />
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <li key={item.href} className="relative">
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                </li>
              );
            }

            return <li key={item.href} className="relative">{linkContent}</li>;
          })}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground w-full border-t transition-colors",
          collapsed && "justify-center"
        )}
      >
        {collapsed ? <PanelLeftOpen size={16} /> : (
          <>
            <PanelLeftClose size={16} />
            <span>Collapse</span>
          </>
        )}
      </button>

      {/* User info */}
      <div className={cn("border-t p-3", collapsed && "flex justify-center p-2")}>
        <div className={cn("flex items-center gap-3", collapsed && "gap-0")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {getInitials(userName)}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
