import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isYesterday } from "date-fns";
import {
  MessageSquare, SquarePen, Phone, Video, MonitorUp,
  Search, PanelRight, Paperclip, Smile, SendHorizontal,
  Users, PhoneOff, X, FileText, Image, File,
  Bell, BellOff, Crown, Trash2, UserPlus, Mic, MicOff,
  Volume2, VolumeX, Grid3x3, MoreHorizontal, VideoOff,
  ChevronRight, PhoneIncoming,
} from "lucide-react";
import { cn, getAvatarColor, getInitials } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { Conversation, Message } from "@shared/schema";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function formatMessageTime(dateStr: string) {
  return format(new Date(dateStr), "h:mm a");
}

function formatDateSeparator(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, d MMM");
}

function formatRelativeTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return format(d, "MMM d");
}

function formatCallDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const EMOJI_LIST = ["ðŸ˜€","ðŸ˜‚","ðŸ‘","â¤ï¸","ðŸŽ‰","ðŸ”¥","ðŸ‘€","ðŸ™","ðŸ’¯","âœ…","ðŸš€","ðŸ˜Ž","ðŸ¤”","ðŸ’¡","ðŸ“Œ","âœ¨","ðŸŽ¯","ðŸ“Š","ðŸ†","ðŸ‘"];

const SEEDED_CONTACTS = [
  "Rohan Mehra", "Priya Kapoor", "Arjun Singh", "Neha Joshi", "Vikram Patel",
  "Anjali Gupta", "Rahul Verma", "Kavita Reddy", "Deepak Malhotra", "Sneha Iyer",
  "QA Alex", "QA Bella", "QA Chris", "QA Diana", "QA Ethan",
];

// â”€â”€â”€ Toast system â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function useToast() {
  const [toast, setToast] = useState<{ message: string; action?: React.ReactNode } | null>(null);
  const show = useCallback((message: string, action?: React.ReactNode) => {
    setToast({ message, action });
    setTimeout(() => setToast(null), 4000);
  }, []);
  const dismiss = useCallback(() => setToast(null), []);
  return { toast, show, dismiss };
}

function ToastOverlay({ toast, onDismiss }: { toast: { message: string; action?: React.ReactNode } | null; onDismiss: () => void }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
      <div className="bg-foreground text-background rounded-lg px-4 py-3 shadow-lg flex items-center gap-3 text-sm max-w-sm">
        <span className="flex-1">{toast.message}</span>
        {toast.action}
        <button onClick={onDismiss} className="hover:opacity-70"><X size={14} /></button>
      </div>
    </div>
  );
}

// â”€â”€â”€ Mock members data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MOCK_MEMBERS: Record<string, { name: string; email: string }[]> = {
  "Product Team": [
    { name: "Piyush Sharma", email: "piyush@cloudspace.home" },
    { name: "Rohan Mehra", email: "rohan@cloudspace.home" },
    { name: "Priya Kapoor", email: "priya@cloudspace.home" },
    { name: "Arjun Singh", email: "arjun@cloudspace.home" },
  ],
  "HomeServer Admins": [
    { name: "Piyush Sharma", email: "piyush@cloudspace.home" },
    { name: "Vikram Patel", email: "vikram@cloudspace.home" },
    { name: "Deepak Malhotra", email: "deepak@cloudspace.home" },
  ],
};

const MOCK_SHARED_FILES = [
  { name: "Q1 Report.pdf", size: "2.5 MB", icon: FileText },
  { name: "Design Mockups.fig", size: "8.5 MB", icon: File },
  { name: "Team Photo.jpg", size: "3.4 MB", icon: Image },
];

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type CallState = {
  active: boolean;
  type: "voice" | "video" | "screen";
  conversationId: number;
  conversationName: string;
  startedAt: Date;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn: boolean;
  isScreenSharing: boolean;
  participants: { id: number; name: string; isSpeaking: boolean }[];
  duration: number;
};

type ConversationCallSignal = {
  conversationId: number;
  type: "voice" | "video" | "screen";
  initiatorName: string;
  active: boolean;
  acceptedBy: string[];
  declinedBy: string[];
  isScreenSharing: boolean;
  startedAt: string;
  updatedAt: string;
  offer?: RTCSessionDescriptionInit;
  offerFrom?: string;
  answer?: RTCSessionDescriptionInit;
  answerFrom?: string;
  iceCandidates?: Array<{
    id: string;
    from: string;
    candidate: RTCIceCandidateInit;
  }>;
};

// â”€â”€â”€ Components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Avatar({ name, size = 38, isGroup = false }: { name: string; size?: number; isGroup?: boolean }) {
  const colorClass = getAvatarColor(name);
  return (
    <div
      className={cn("relative shrink-0 rounded-full flex items-center justify-center font-semibold", colorClass)}
      style={{ width: size, height: size, fontSize: size * 0.32 }}
    >
      {isGroup ? <Users size={size * 0.45} /> : getInitials(name)}
    </div>
  );
}

function OnlineDot({ size = 8, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn("rounded-full bg-green-500 border-2 border-background", className)}
      style={{ width: size, height: size }}
    />
  );
}

// â”€â”€â”€ Conversation List Item â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ConversationRow({
  conversation: c,
  isActive,
  onClick,
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-lg mx-1 text-left transition-colors",
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/60"
      )}
    >
      <div className="relative">
        <Avatar name={c.name} size={38} isGroup={c.type === "group"} />
        {c.type === "dm" && (
          <OnlineDot size={8} className="absolute bottom-0 right-0" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-medium truncate">{c.name}</span>
            {c.isMuted && <BellOff size={12} className="text-muted-foreground/50 shrink-0" />}
          </div>
          {c.lastMessageAt && (
            <span className="text-xs text-muted-foreground shrink-0 ml-2">
              {formatRelativeTime(c.lastMessageAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate">
            {c.lastMessage || "No messages yet"}
          </span>
          {(c.unreadCount || 0) > 0 && (
            <span className="bg-primary text-white text-[10px] rounded-full px-1.5 min-w-[18px] text-center shrink-0 ml-2">
              {c.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// â”€â”€â”€ Date Separator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground px-2">{formatDateSeparator(date)}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// â”€â”€â”€ Message Bubble â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MessageBubble({
  message: m,
  isSent,
  showAvatar,
  showSenderName,
}: {
  message: Message;
  isSent: boolean;
  showAvatar: boolean;
  showSenderName: boolean;
}) {
  const reactions = m.reactions ? JSON.parse(m.reactions) as Record<string, number> : null;

  if (isSent) {
    return (
      <div className={cn("flex items-end gap-2 max-w-[70%] ml-auto flex-row-reverse", !showAvatar && "mt-0.5")}>
        <div>
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3.5 py-2 text-sm">
            {m.content}
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 mr-1 text-right block">
            {formatMessageTime(m.sentAt)} Â· âœ“âœ“
          </span>
          {reactions && (
            <div className="flex gap-1 mt-1 justify-end">
              {Object.entries(reactions).map(([emoji, count]) => (
                <span key={emoji} className="bg-muted border rounded-full px-2 py-0.5 text-xs cursor-pointer hover:bg-accent">
                  {emoji} {count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-end gap-2 max-w-[70%]", !showAvatar && "mt-0.5 ml-[32px]")}>
      {showAvatar ? (
        <Avatar name={m.senderName} size={24} />
      ) : null}
      <div>
        {showSenderName && (
          <span className="text-[11px] text-muted-foreground mb-1 ml-1 block">{m.senderName}</span>
        )}
        <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm">
          {m.content}
        </div>
        <span className="text-[11px] text-muted-foreground mt-1 ml-1 block">
          {formatMessageTime(m.sentAt)}
        </span>
        {reactions && (
          <div className="flex gap-1 mt-1">
            {Object.entries(reactions).map(([emoji, count]) => (
              <span key={emoji} className="bg-muted border rounded-full px-2 py-0.5 text-xs cursor-pointer hover:bg-accent">
                {emoji} {count}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// â”€â”€â”€ Typing Indicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{name} is typing...</span>
    </div>
  );
}

// â”€â”€â”€ Voice Call Overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function VoiceCallOverlay({ callState, onUpdate, onEnd }: {
  callState: CallState;
  onUpdate: (partial: Partial<CallState>) => void;
  onEnd: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-gray-800 to-gray-900 flex flex-col items-center justify-center text-white">
      {/* Main caller */}
      <Avatar name={callState.conversationName} size={96} />
      <p className="text-xl font-semibold mt-4">{callState.conversationName}</p>
      <p className="text-lg text-white/70 mt-1 font-mono">{formatCallDuration(callState.duration)}</p>

      {/* Participants for group calls */}
      {callState.participants.length > 2 && (
        <div className="flex gap-4 mt-6">
          {callState.participants.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-1">
              <div className={cn("relative", p.isSpeaking && "ring-2 ring-green-400 rounded-full")}>
                <Avatar name={p.name} size={48} />
                {p.isSpeaking && (
                  <div className="absolute inset-0 rounded-full ring-2 ring-green-400 animate-ping opacity-40" />
                )}
              </div>
              <span className="text-xs text-white/70">{p.name.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4 mt-12">
        <button
          onClick={() => onUpdate({ isMuted: !callState.isMuted })}
          className={cn(
            "h-14 w-14 rounded-full flex items-center justify-center transition-colors",
            callState.isMuted ? "bg-red-500/70 text-white" : "bg-white/10 hover:bg-white/20 text-white"
          )}
        >
          {callState.isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        <button
          onClick={() => onUpdate({ isSpeakerOn: !callState.isSpeakerOn })}
          className={cn(
            "h-14 w-14 rounded-full flex items-center justify-center transition-colors",
            !callState.isSpeakerOn ? "bg-white/30" : "bg-white/10 hover:bg-white/20"
          )}
        >
          {callState.isSpeakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
        </button>
        <Popover>
          <PopoverTrigger asChild>
            <button className="h-14 w-14 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors">
              <Grid3x3 size={22} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-2">
            <div className="grid grid-cols-3 gap-1">
              {["1","2","3","4","5","6","7","8","9","*","0","#"].map((k) => (
                <button key={k} className="h-10 rounded-lg bg-muted hover:bg-accent text-sm font-medium">{k}</button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-14 w-14 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors">
              <MoreHorizontal size={22} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Add participant</DropdownMenuItem>
            <DropdownMenuItem>Hold</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* End call */}
      <button
        onClick={onEnd}
        className="mt-8 h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
      >
        <PhoneOff size={28} />
      </button>
    </div>
  );
}

// â”€â”€â”€ Video Call Overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function VideoCallOverlay({ callState, onUpdate, onEnd, currentUserName }: {
  callState: CallState;
  onUpdate: (partial: Partial<CallState>) => void;
  onEnd: () => void;
  currentUserName: string;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoEnabled: boolean;
  localVideoEnabled: boolean;
  remoteParticipantName: string;
}) {
  const isDm = callState.participants.length <= 2;

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      {/* Duration header */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/40 backdrop-blur rounded-full px-4 py-1.5 text-white text-sm font-mono">
        {formatCallDuration(callState.duration)}
      </div>

      {/* Video tiles */}
      <div className="flex-1 p-4 relative">
        {callState.isScreenSharing ? (
          /* Screen share layout */
          <div className="h-full flex flex-col gap-3">
            <div className="flex-1 rounded-xl bg-gray-800 flex flex-col items-center justify-center">
              {remoteVideoEnabled ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full rounded-xl object-cover" />
              ) : (
                <>
                  <MonitorUp size={64} className="text-white/30 mb-3" />
                  <p className="text-white font-medium">{remoteParticipantName} is sharing their screen</p>
                </>
              )}
            </div>
            <div className="flex gap-2 justify-center">
              {callState.participants.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "w-24 h-[72px] rounded-lg bg-gray-800 flex flex-col items-center justify-center relative",
                    p.isSpeaking && "ring-2 ring-green-400"
                  )}
                >
                  <Avatar name={p.name} size={32} />
                  <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/40 px-1 rounded">{p.name.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          </div>
        ) : isDm ? (
          /* DM video: main tile + self PIP */
          <div className="h-full relative">
            <div className={cn(
              "h-full rounded-xl bg-gray-800 flex items-center justify-center relative overflow-hidden",
              callState.participants[0]?.isSpeaking && "ring-2 ring-green-400"
            )}>
              {remoteVideoEnabled ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
              ) : (
                <Avatar name={callState.participants[0]?.name || callState.conversationName} size={64} />
              )}
              <span className="absolute bottom-3 left-3 text-white text-xs font-medium bg-black/40 px-2 py-0.5 rounded">
                {callState.participants[0]?.name || callState.conversationName}
              </span>
            </div>
            {/* Self PIP */}
            <div className="absolute bottom-4 right-4 w-[240px] h-[135px] rounded-xl bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-700">
              {!callState.isVideoOff && localVideoEnabled ? (
                <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              ) : callState.isVideoOff ? (
                <div className="flex flex-col items-center gap-1">
                  <Avatar name={currentUserName} size={48} />
                  <span className="text-[10px] text-white/60">Camera off</span>
                </div>
              ) : (
                <Avatar name={currentUserName} size={48} />
              )}
              <span className="absolute bottom-2 left-2 text-[10px] text-white bg-black/40 px-1.5 py-0.5 rounded">You</span>
            </div>
          </div>
        ) : (
          /* Group video: grid */
          <div className="h-full grid grid-cols-2 gap-3">
            {callState.participants.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "rounded-xl bg-gray-800 flex items-center justify-center relative overflow-hidden",
                  p.isSpeaking && "ring-2 ring-green-400"
                )}
              >
                <Avatar name={p.name} size={64} />
                <span className="absolute bottom-2 left-2 text-white text-xs font-medium bg-black/40 px-2 py-0.5 rounded">
                  {p.name}{p.name === currentUserName ? " (You)" : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-gray-900/80 backdrop-blur rounded-2xl px-6 py-4">
        <button
          onClick={() => onUpdate({ isMuted: !callState.isMuted })}
          className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center transition-colors",
            callState.isMuted ? "bg-red-500/70 text-white" : "bg-white/10 hover:bg-white/20 text-white"
          )}
        >
          {callState.isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <button
          onClick={() => onUpdate({ isVideoOff: !callState.isVideoOff })}
          className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center transition-colors",
            callState.isVideoOff ? "bg-red-500/70 text-white" : "bg-white/10 hover:bg-white/20 text-white"
          )}
        >
          {callState.isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>
        <button
          onClick={() => onUpdate({ isScreenSharing: !callState.isScreenSharing })}
          className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center transition-colors",
            callState.isScreenSharing ? "bg-green-600/80 text-white" : "bg-white/10 hover:bg-white/20 text-white"
          )}
        >
          <MonitorUp size={20} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-12 w-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors">
              <MoreHorizontal size={20} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Add participant</DropdownMenuItem>
            <DropdownMenuItem>Hold</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          onClick={onEnd}
          className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors ml-2"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€ Incoming Call Notification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function IncomingCallBanner({ callerName, onAccept, onDecline }: {
  callerName: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-50 bg-card border shadow-2xl rounded-2xl p-4 animate-fade-in w-80">
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <Avatar name={callerName} size={48} />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <Phone size={10} className="text-white" />
          </div>
        </div>
        <div>
          <p className="font-semibold text-sm">{callerName}</p>
          <p className="text-xs text-muted-foreground">Incoming video call...</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" size="sm" onClick={onDecline}>
          <PhoneOff size={14} className="mr-1" /> Decline
        </Button>
        <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white" size="sm" onClick={onAccept}>
          <Phone size={14} className="mr-1" /> Accept
        </Button>
      </div>
    </div>
  );
}

// â”€â”€â”€ Info Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function InfoPanel({
  conversation,
  onMuteToggle,
  onLeaveGroup,
  onDeleteGroup,
  onTransferAdmin,
  showToast,
  currentUserName,
  currentUserId,
}: {
  conversation: Conversation;
  onMuteToggle: () => void;
  onLeaveGroup: () => void;
  onDeleteGroup: () => void;
  onTransferAdmin: (memberId: number, memberName: string) => void;
  showToast: (msg: string) => void;
  currentUserName: string;
  currentUserId: number;
}) {
  const isDm = conversation.type === "dm";
  const members = (MOCK_MEMBERS[conversation.name] || []).map((member) =>
    member.name === "Piyush Sharma"
      ? { ...member, name: currentUserName, email: `${currentUserName.toLowerCase().replace(/\s+/g, ".")}@cloudspace.home` }
      : member,
  );
  const isAdmin = conversation.adminId === currentUserId;

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedTransferMember, setSelectedTransferMember] = useState<{ id: number; name: string } | null>(null);

  const otherMembers = members.filter((m) => m.name !== currentUserName);

  return (
    <div className="w-[260px] flex-shrink-0 border-l flex flex-col overflow-hidden bg-background">
      <div className="p-4 flex flex-col items-center text-center">
        <Avatar name={conversation.name} size={64} isGroup={!isDm} />
        <p className="font-semibold mt-3">{conversation.name}</p>
        {isDm ? (
          <>
            <p className="text-sm text-muted-foreground">
              {conversation.name.toLowerCase().replace(/\s/g, ".")}@cloudspace.home
            </p>
            <div className="flex items-center gap-1 mt-1">
              <OnlineDot size={6} />
              <span className="text-xs text-green-500">Online</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{members.length} members</p>
        )}
      </div>

      <Separator />

      {isDm ? (
        <>
          <div className="p-3 space-y-1">
            <Button variant="ghost" className="w-full justify-start text-sm h-9">View profile</Button>
            <Button variant="ghost" className="w-full justify-start text-sm h-9" onClick={onMuteToggle}>
              {conversation.isMuted ? <><BellOff size={16} className="mr-2" /> Unmute notifications</> : <><Bell size={16} className="mr-2" /> Mute notifications</>}
            </Button>
            <Button variant="ghost" className="w-full justify-start text-sm h-9">Block user</Button>
          </div>
          <Separator />
          <div className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">SHARED FILES</p>
            <div className="space-y-2">
              {MOCK_SHARED_FILES.map((f) => (
                <div key={f.name} className="flex items-center gap-2 text-sm">
                  <f.icon size={16} className="text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{f.name}</span>
                  <span className="text-xs text-muted-foreground">{f.size}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="p-3 flex-1 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground mb-2">MEMBERS</p>
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.name} className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar name={member.name} size={36} />
                    <OnlineDot size={6} className="absolute bottom-0 right-0" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      {member.name === currentUserName && (
                        <span className="text-[11px] text-muted-foreground">(you)</span>
                      )}
                      {/* Admin badge */}
                      {(() => {
                        const aid = conversation.adminId;
                        if (!aid) return null;
                        if (aid === currentUserId && member.name === currentUserName) {
                          return <Badge variant="secondary" className="text-[10px] px-1.5">Admin</Badge>;
                        }
                        return null;
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Admin actions */}
            {isAdmin && !isDm && (
              <>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pt-3 pb-1">Admin</p>
                <div className="space-y-1">
                  <Button variant="ghost" className="w-full justify-start text-sm h-9" onClick={() => setAddMemberOpen(true)}>
                    <UserPlus size={16} className="mr-2" /> Add member
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-sm h-9" onClick={() => setTransferOpen(true)}>
                    <Crown size={16} className="mr-2" /> Transfer admin
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-sm h-9 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                    <Trash2 size={16} className="mr-2" /> Delete group
                  </Button>
                </div>
              </>
            )}
          </div>
          <Separator />
          <div className="p-3 space-y-1">
            <Button variant="ghost" className="w-full justify-start text-sm h-9" onClick={onMuteToggle}>
              {conversation.isMuted ? <><BellOff size={16} className="mr-2" /> Unmute notifications</> : <><Bell size={16} className="mr-2" /> Mute notifications</>}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-sm h-9 text-destructive hover:text-destructive"
              onClick={() => setLeaveOpen(true)}
            >
              Leave group
            </Button>
          </div>
        </>
      )}

      {/* Leave group confirm */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave group?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You'll no longer receive messages from {conversation.name}. You can rejoin if someone adds you back.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setLeaveOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setLeaveOpen(false); onLeaveGroup(); }}>Leave group</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete group confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete group?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete {conversation.name} and all its messages for all members.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setDeleteOpen(false); onDeleteGroup(); }}>Delete group</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer admin */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer admin role</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Choose a new admin for {conversation.name}. You'll become a regular member.
          </p>
          <div className="space-y-1">
            {otherMembers.map((m) => {
              const memberId = Math.max(
                2,
                Array.from(m.name).reduce((acc, ch) => acc + ch.charCodeAt(0), 0),
              );
              const isSelected = selectedTransferMember?.name === m.name;
              return (
                <button
                  key={m.name}
                  onClick={() => setSelectedTransferMember({ id: memberId, name: m.name })}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    isSelected ? "bg-accent" : "hover:bg-muted"
                  )}
                >
                  <div className={cn("h-4 w-4 rounded-full border-2", isSelected ? "border-primary bg-primary" : "border-muted-foreground")} />
                  <Avatar name={m.name} size={32} />
                  <span className="text-sm font-medium">{m.name}</span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button
              disabled={!selectedTransferMember}
              onClick={() => {
                if (selectedTransferMember) {
                  onTransferAdmin(selectedTransferMember.id, selectedTransferMember.name);
                  setTransferOpen(false);
                  setSelectedTransferMember(null);
                }
              }}
            >
              Transfer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add member */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {SEEDED_CONTACTS.filter((n) => !members.some((m) => m.name === n)).map((name) => (
              <button
                key={name}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => {
                  showToast(`Member added: ${name}`);
                  setAddMemberOpen(false);
                }}
              >
                <Avatar name={name} size={32} />
                <span className="text-sm font-medium">{name}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// â”€â”€â”€ Main Talk Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function Talk() {
  const queryClient = useQueryClient();
  const { toast, show: showToast, dismiss: dismissToast } = useToast();

  // State
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [composerContent, setComposerContent] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [callState, setCallState] = useState<CallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<string | null>(null);
  const [newGroupTab, setNewGroupTab] = useState<"dm" | "group">("dm");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);
  const [newDmSearch, setNewDmSearch] = useState("");
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(false);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const incomingCallTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const isCallInitiatorRef = useRef(false);
  const isMediaReadyRef = useRef(false);
  const sentOfferRef = useRef(false);
  const sentAnswerRef = useRef(false);
  const processedCandidateIdsRef = useRef<Set<string>>(new Set());
  const sawActiveSignalRef = useRef<Set<number>>(new Set());

  // Queries
  const { data: conversationsData } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const res = await fetch("/api/conversations");
      return res.json() as Promise<{ data: Conversation[] }>;
    },
  });

  const conversations = conversationsData?.data || [];
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const { data: currentUserData } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user");
      return res.json() as Promise<{ data: { id?: number; name?: string } }>;
    },
  });
  const currentUserId = currentUserData?.data?.id || 0;
  const currentUserName = currentUserData?.data?.name || "You";

  const { data: messagesData } = useQuery({
    queryKey: ["/api/conversations/messages", activeConversationId],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${activeConversationId}/messages`);
      return res.json() as Promise<{ data: Message[] }>;
    },
    enabled: !!activeConversationId,
  });

  const messagesList = messagesData?.data || [];

  const { data: callSignalData } = useQuery({
    queryKey: ["/api/conversations/call", activeConversationId],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${activeConversationId}/call`);
      return res.json() as Promise<{ data: ConversationCallSignal | null }>;
    },
    enabled: !!activeConversationId,
    refetchInterval: 1500,
  });
  const callSignal = callSignalData?.data;

  // Set first conversation as active on load
  useEffect(() => {
    if (conversations.length && !activeConversationId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  // Scroll to bottom on messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesList]);

  // Call duration counter
  useEffect(() => {
    if (!callState?.active) return;
    const interval = setInterval(() => {
      setCallState((prev) => prev ? { ...prev, duration: prev.duration + 1 } : null);
    }, 1000);
    return () => clearInterval(interval);
  }, [callState?.active]);

  // Speaking simulation
  useEffect(() => {
    if (!callState?.active) return;
    const interval = setInterval(() => {
      setCallState((prev) => {
        if (!prev) return null;
        const speakingIdx = Math.floor(Math.random() * prev.participants.length);
        return {
          ...prev,
          participants: prev.participants.map((p, i) => ({ ...p, isSpeaking: i === speakingIdx })),
        };
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [callState?.active]);

  // Incoming call auto-dismiss
  useEffect(() => {
    if (!incomingCall) return;
    incomingCallTimeoutRef.current = setTimeout(() => setIncomingCall(null), 15000);
    return () => { if (incomingCallTimeoutRef.current) clearTimeout(incomingCallTimeoutRef.current); };
  }, [incomingCall]);

  useEffect(() => {
    if (!remoteAudioRef.current) return;
    if (!callState?.active) return;
    remoteAudioRef.current.muted = !callState.isSpeakerOn;
    remoteAudioRef.current.volume = callState.isSpeakerOn ? 1 : 0;
  }, [callState?.active, callState?.isSpeakerOn]);

  useEffect(() => {
    return () => {
      stopMediaAndPeer();
    };
  }, []);

  useEffect(() => {
    if (!activeConversationId) return;

    if (callSignal?.active && callSignal.initiatorName !== currentUserName && !callState?.active) {
      sawActiveSignalRef.current.add(activeConversationId);
      setIncomingCall(callSignal.initiatorName);
      return;
    }

    if (
      callSignal?.active &&
      callState?.active &&
      callState.conversationId === activeConversationId &&
      callState.isScreenSharing !== callSignal.isScreenSharing
    ) {
      setCallState((prev) => (prev ? { ...prev, isScreenSharing: callSignal.isScreenSharing } : null));
    }

    if (callSignal?.active) {
      sawActiveSignalRef.current.add(activeConversationId);
    }

    const hasResolvedCallSignal = typeof callSignalData !== "undefined";
    if (
      hasResolvedCallSignal &&
      sawActiveSignalRef.current.has(activeConversationId) &&
      !callSignal?.active &&
      callState?.active &&
      callState.conversationId === activeConversationId
    ) {
      showToast("Call ended");
      stopMediaAndPeer();
      setCallState(null);
      setIncomingCall(null);
      sawActiveSignalRef.current.delete(activeConversationId);
    }
  }, [activeConversationId, callSignal, callSignalData, callState, currentUserName, showToast]);

  useEffect(() => {
    if (!activeConversationId || !callSignal?.active || !callState?.active) return;
    if (callState.conversationId !== activeConversationId) return;
    const pc = peerConnectionRef.current;
    if (!pc) return;

    const syncSignal = async () => {
      if (!isCallInitiatorRef.current && callSignal.offer && !sentAnswerRef.current) {
        if (!pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(callSignal.offer));
        }
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await apiRequest("PATCH", `/api/conversations/${activeConversationId}/call`, {
          answer,
          answerFrom: currentUserName,
        });
        sentAnswerRef.current = true;
      }

      if (isCallInitiatorRef.current && callSignal.answer && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(callSignal.answer));
      }

      const candidates = callSignal.iceCandidates || [];
      for (const candidateItem of candidates) {
        if (candidateItem.from === currentUserName) continue;
        if (processedCandidateIdsRef.current.has(candidateItem.id)) continue;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidateItem.candidate));
          processedCandidateIdsRef.current.add(candidateItem.id);
        } catch (_err) {
          // Candidate may arrive before remote description; ignore and retry on next poll.
        }
      }
    };

    void syncSignal().catch(() => undefined);
  }, [activeConversationId, callSignal, callState?.active, callState?.conversationId, currentUserName]);

  // Build participants from conversation
  function buildParticipants(conv: Conversation) {
    const memberNames: string[] = conv.members ? JSON.parse(conv.members) : [];
    if (conv.type === "dm") {
      return [
        { id: 2, name: conv.name, isSpeaking: false },
        { id: 1, name: currentUserName, isSpeaking: false },
      ];
    }
    const withSelf = memberNames.includes(currentUserName) ? memberNames : [currentUserName, ...memberNames];
    return withSelf.map((name, i) => ({ id: i + 1, name, isSpeaking: false }));
  }

  function stopMediaAndPeer() {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    remoteStreamRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setRemoteVideoEnabled(false);
    setLocalVideoEnabled(false);
    sentOfferRef.current = false;
    sentAnswerRef.current = false;
    isMediaReadyRef.current = false;
    processedCandidateIdsRef.current.clear();
  }

  async function getLocalMedia(type: "voice" | "video" | "screen") {
    if (!(navigator?.mediaDevices?.getUserMedia)) {
      throw new Error("Media devices are unavailable in this browser.");
    }
    if (type === "screen") {
      if (!navigator.mediaDevices.getDisplayMedia) {
        throw new Error("Screen share is unavailable in this browser.");
      }
      return navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    }
    if (type === "video") {
      return navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    }
    return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  }

  function ensurePeerConnection(conversationId: number) {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = async (event) => {
      if (!event.candidate) return;
      await apiRequest("PATCH", `/api/conversations/${conversationId}/call`, {
        iceCandidate: event.candidate.toJSON(),
        iceFrom: currentUserName,
      }).catch(() => undefined);
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (!remoteStream) return;
      remoteStreamRef.current = remoteStream;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        void remoteAudioRef.current.play().catch(() => undefined);
      }
      const hasVideo = remoteStream.getVideoTracks().length > 0;
      setRemoteVideoEnabled(hasVideo);
      if (hasVideo && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        void remoteVideoRef.current.play().catch(() => undefined);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }

  async function ensureMediaAndTracks(type: "voice" | "video" | "screen", conversationId: number) {
    const pc = ensurePeerConnection(conversationId);
    if (isMediaReadyRef.current) return pc;
    const stream = await getLocalMedia(type);
    localStreamRef.current = stream;
    const hasLocalVideo = stream.getVideoTracks().length > 0;
    setLocalVideoEnabled(hasLocalVideo);
    if (hasLocalVideo && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      void localVideoRef.current.play().catch(() => undefined);
    }
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });
    isMediaReadyRef.current = true;
    return pc;
  }

  async function startCall(type: "voice" | "video" | "screen") {
    if (!activeConversation) return;
    stopMediaAndPeer();
    let mediaReady = true;
    try {
      await ensureMediaAndTracks(type, activeConversation.id);
    } catch (_error) {
      mediaReady = false;
      showToast("Media permissions unavailable. Running in signaling-only mode.");
    }

    await apiRequest("POST", `/api/conversations/${activeConversation.id}/call/start`, {
      type,
      initiatorName: currentUserName,
    }).catch(() => undefined);

    isCallInitiatorRef.current = true;
    if (mediaReady) {
      const pc = ensurePeerConnection(activeConversation.id);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type !== "voice",
      });
      await pc.setLocalDescription(offer);
      await apiRequest("PATCH", `/api/conversations/${activeConversation.id}/call`, {
        offer,
        offerFrom: currentUserName,
      }).catch(() => undefined);
      sentOfferRef.current = true;
    }

    setCallState({
      active: true,
      type,
      conversationId: activeConversation.id,
      conversationName: activeConversation.name,
      startedAt: new Date(),
      isMuted: false,
      isVideoOff: type === "voice",
      isSpeakerOn: true,
      isScreenSharing: type === "screen",
      participants: buildParticipants(activeConversation),
      duration: 0,
    });
    setIncomingCall(null);
  }

  async function endCall() {
    if (callState) {
      await apiRequest("POST", `/api/conversations/${callState.conversationId}/call/end`, {
        endedBy: currentUserName,
      }).catch(() => undefined);
      showToast(`Call ended · ${formatCallDuration(callState.duration)}`);
      sawActiveSignalRef.current.delete(callState.conversationId);
    }
    stopMediaAndPeer();
    setCallState(null);
  }

  function updateCall(partial: Partial<CallState>) {
    setCallState((prev) => {
      if (!prev) return null;
      if (typeof partial.isMuted === "boolean") {
        localStreamRef.current?.getAudioTracks().forEach((track) => {
          track.enabled = !partial.isMuted;
        });
      }
      if (typeof partial.isVideoOff === "boolean") {
        localStreamRef.current?.getVideoTracks().forEach((track) => {
          track.enabled = !partial.isVideoOff;
        });
      }
      if (typeof partial.isScreenSharing === "boolean") {
        apiRequest("PATCH", `/api/conversations/${prev.conversationId}/call`, {
          isScreenSharing: partial.isScreenSharing,
        }).catch(() => undefined);
      }
      return { ...prev, ...partial };
    });
  }

  async function acceptIncomingCall() {
    if (!activeConversationId || !callSignal) return;
    let mediaReady = true;
    try {
      await ensureMediaAndTracks(callSignal.type, activeConversationId);
    } catch (_error) {
      mediaReady = false;
      showToast("Media permissions unavailable. Running in signaling-only mode.");
    }
    await apiRequest("POST", `/api/conversations/${activeConversationId}/call/accept`, {
      userName: currentUserName,
    }).catch(() => undefined);
    isCallInitiatorRef.current = false;
    sentOfferRef.current = false;
    sentAnswerRef.current = false;
    if (!mediaReady) {
      stopMediaAndPeer();
    }

    const conversation = activeConversation || conversations.find((c) => c.id === activeConversationId);
    if (!conversation) return;

    setCallState({
      active: true,
      type: callSignal.type,
      conversationId: conversation.id,
      conversationName: conversation.name,
      startedAt: new Date(callSignal.startedAt),
      isMuted: false,
      isVideoOff: callSignal.type === "voice",
      isSpeakerOn: true,
      isScreenSharing: callSignal.isScreenSharing,
      participants: buildParticipants(conversation),
      duration: 0,
    });
    setIncomingCall(null);
  }

  async function declineIncomingCall() {
    if (activeConversationId) {
      await apiRequest("POST", `/api/conversations/${activeConversationId}/call/decline`, {
        userName: currentUserName,
      }).catch(() => undefined);
    }
    stopMediaAndPeer();
    setIncomingCall(null);
  }

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/conversations/${activeConversationId}/messages`, { content });
      return res.json() as Promise<{ data: Message }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/messages", activeConversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/conversations/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  // Mute mutation
  const muteMutation = useMutation({
    mutationFn: async ({ id, muted }: { id: number; muted: boolean }) => {
      await apiRequest("PATCH", `/api/conversations/${id}/mute`, { muted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/conversations/${id}/members/me`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  // Transfer admin mutation
  const transferAdminMutation = useMutation({
    mutationFn: async ({ id, adminId }: { id: number; adminId: number }) => {
      await apiRequest("PATCH", `/api/conversations/${id}/admin`, { adminId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (data: { name: string; type: string; adminId?: number; createdBy?: number; members?: string }) => {
      const res = await apiRequest("POST", "/api/conversations", data);
      return res.json() as Promise<{ data: Conversation }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setActiveConversationId(result.data.id);
    },
  });

  const handleSelectConversation = useCallback((id: number) => {
    setActiveConversationId(id);
    queryClient.setQueryData(["/api/conversations"], (old: { data: Conversation[] } | undefined) => {
      if (!old) return old;
      return { data: old.data.map((c) => c.id === id ? { ...c, unreadCount: 0 } : c) };
    });
    markReadMutation.mutate(id);
  }, [markReadMutation, queryClient]);

  const handleSend = useCallback(() => {
    const content = composerContent.trim();
    if (!content || !activeConversationId) return;

    const optimisticMsg: Message = {
      id: Date.now(),
      conversationId: activeConversationId,
      senderId: currentUserId,
      senderName: currentUserName,
      content,
      sentAt: new Date().toISOString(),
      reactions: null,
      replyToId: null,
    };
    queryClient.setQueryData(
      ["/api/conversations/messages", activeConversationId],
      (old: { data: Message[] } | undefined) => ({
        data: [...(old?.data || []), optimisticMsg],
      })
    );

    setComposerContent("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    sendMutation.mutate(content);
  }, [composerContent, activeConversationId, currentUserId, currentUserName, sendMutation, queryClient]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleComposerFocus = () => {
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleComposerBlur = () => {
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
  };

  const handleMuteToggle = () => {
    if (!activeConversation) return;
    const newMuted = !activeConversation.isMuted;
    muteMutation.mutate({ id: activeConversation.id, muted: newMuted });
    showToast(newMuted ? "Notifications muted" : "Notifications unmuted");
  };

  const handleLeaveGroup = () => {
    if (!activeConversation) return;
    const name = activeConversation.name;
    leaveGroupMutation.mutate(activeConversation.id);
    // Select next conversation
    const remaining = conversations.filter((c) => c.id !== activeConversation.id);
    setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
    showToast(`You left ${name}`);
  };

  const handleDeleteGroup = () => {
    if (!activeConversation) return;
    const name = activeConversation.name;
    deleteGroupMutation.mutate(activeConversation.id);
    const remaining = conversations.filter((c) => c.id !== activeConversation.id);
    setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
    showToast(`Group deleted: ${name}`);
  };

  const handleTransferAdmin = (memberId: number, memberName: string) => {
    if (!activeConversation) return;
    transferAdminMutation.mutate({ id: activeConversation.id, adminId: memberId });
    showToast(`Admin role transferred to ${memberName}`);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || newGroupMembers.length === 0) return;
    const allMembers = [currentUserName, ...newGroupMembers];
    createConversationMutation.mutate({
      name: newGroupName,
      type: "group",
      adminId: currentUserId,
      createdBy: currentUserId,
      members: JSON.stringify(allMembers),
    });
    setNewChatOpen(false);
    setNewGroupName("");
    setNewGroupMembers([]);
    showToast("Group created");
  };

  const handleStartDm = (contactName: string) => {
    // Check if DM already exists
    const existing = conversations.find((c) => c.type === "dm" && c.name === contactName);
    if (existing) {
      handleSelectConversation(existing.id);
    } else {
      createConversationMutation.mutate({
        name: contactName,
        type: "dm",
        members: JSON.stringify([currentUserName, contactName]),
      });
    }
    setSearchQuery("");
    setNewChatOpen(false);
    setNewDmSearch("");
    textareaRef.current?.focus();
  };

  // Group messages by date for rendering
  const groupedMessages = messagesList.reduce<{ date: string; messages: Message[] }[]>((groups, msg) => {
    const dateKey = new Date(msg.sentAt).toDateString();
    const last = groups[groups.length - 1];
    if (last && last.date === dateKey) {
      last.messages.push(msg);
    } else {
      groups.push({ date: dateKey, messages: [msg] });
    }
    return groups;
  }, []);

  // Filter conversations by search
  const query = searchQuery.toLowerCase().trim();
  const dmConversations = conversations.filter((c) => c.type === "dm");
  const groupConversations = conversations.filter((c) => c.type === "group");

  const filteredDm = query
    ? dmConversations.filter((c) => c.name.toLowerCase().includes(query) || (c.lastMessage || "").toLowerCase().includes(query))
    : dmConversations;
  const filteredGroups = query
    ? groupConversations.filter((c) => c.name.toLowerCase().includes(query) || (c.lastMessage || "").toLowerCase().includes(query))
    : groupConversations;

  // People search â€” contacts not already in conversations
  const peopleResults = query
    ? SEEDED_CONTACTS.filter((name) => {
        if (!name.toLowerCase().includes(query)) return false;
        // Show if they don't match an existing visible conversation
        return !conversations.some((c) => c.type === "dm" && c.name === name && c.name.toLowerCase().includes(query));
      })
    : [];

  const noResults = query && filteredDm.length === 0 && filteredGroups.length === 0 && peopleResults.length === 0;
  const remoteParticipantName = callState?.participants.find((p) => p.name !== currentUserName)?.name
    || callSignal?.initiatorName
    || activeConversation?.name
    || "Other participant";

  return (
    <>
      <ToastOverlay toast={toast} onDismiss={dismissToast} />

      {/* Call overlays */}
      {callState?.active && callState.type === "voice" && (
        <VoiceCallOverlay callState={callState} onUpdate={updateCall} onEnd={endCall} />
      )}
      {callState?.active && (callState.type === "video" || callState.type === "screen") && (
        <VideoCallOverlay
          callState={callState}
          onUpdate={updateCall}
          onEnd={endCall}
          currentUserName={currentUserName}
          remoteVideoRef={remoteVideoRef}
          localVideoRef={localVideoRef}
          remoteVideoEnabled={remoteVideoEnabled}
          localVideoEnabled={localVideoEnabled}
          remoteParticipantName={remoteParticipantName}
        />
      )}

      {/* Incoming call notification */}
        {incomingCall && (
          <IncomingCallBanner
            callerName={incomingCall}
            onAccept={acceptIncomingCall}
            onDecline={declineIncomingCall}
          />
        )}

      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <div className="flex h-[calc(100vh-var(--topbar-height,56px))] overflow-hidden">
        {/* â”€â”€â”€ Panel 1: Conversation List â”€â”€â”€ */}
        <div className="w-[280px] flex-shrink-0 border-r flex flex-col bg-background">
          {/* Header */}
          <div className="p-3 flex items-center gap-2">
            <Input
              placeholder="Search conversations..."
              className="flex-1 h-9 rounded-lg bg-muted border-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setNewChatOpen(true)}>
                  <SquarePen size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New chat</TooltipContent>
            </Tooltip>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="dm" className="flex-1 flex flex-col overflow-hidden px-2">
            <TabsList className="w-full">
              <TabsTrigger value="dm" className="flex-1">Direct Messages</TabsTrigger>
              <TabsTrigger value="groups" className="flex-1">Groups</TabsTrigger>
            </TabsList>

            <TabsContent value="dm" className="flex-1 overflow-y-auto mt-1">
              {noResults ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Search size={32} className="text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground text-center">No results for "{searchQuery}"</p>
                </div>
              ) : (
                <>
                  <div className="space-y-0.5">
                    {filteredDm.map((c) => (
                      <ConversationRow
                        key={c.id}
                        conversation={c}
                        isActive={c.id === activeConversationId}
                        onClick={() => handleSelectConversation(c.id)}
                      />
                    ))}
                  </div>
                  {peopleResults.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">People</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div className="space-y-0.5">
                        {peopleResults.map((name) => (
                          <button
                            key={name}
                            onClick={() => handleStartDm(name)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mx-1 text-left hover:bg-muted/60 transition-colors"
                          >
                            <Avatar name={name} size={38} />
                            <span className="text-sm font-medium flex-1 truncate">{name}</span>
                            <ChevronRight size={14} className="text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="groups" className="flex-1 overflow-y-auto mt-1">
              {query && filteredGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Search size={32} className="text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground text-center">No results for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredGroups.map((c) => (
                    <ConversationRow
                      key={c.id}
                      conversation={c}
                      isActive={c.id === activeConversationId}
                      onClick={() => handleSelectConversation(c.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* â”€â”€â”€ Panel 2: Chat Area â”€â”€â”€ */}
        {activeConversation ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat TopBar */}
            <div className="border-b px-4 h-14 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar name={activeConversation.name} size={36} isGroup={activeConversation.type === "group"} />
                  {activeConversation.type === "dm" && (
                    <OnlineDot size={8} className="absolute bottom-0 right-0" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm">{activeConversation.name}</p>
                  {activeConversation.type === "dm" ? (
                    <div className="flex items-center gap-1">
                      <OnlineDot size={6} />
                      <span className="text-xs text-green-500">Online</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {(MOCK_MEMBERS[activeConversation.name] || []).length} members
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Voice call */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => callState?.active ? endCall() : startCall("voice")}
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                        callState?.active && callState.type === "voice"
                          ? "bg-red-100 text-red-600 dark:bg-red-900/30"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <Phone size={18} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{callState?.active ? "End call" : "Voice call"}</TooltipContent>
                </Tooltip>

                {/* Video call */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => callState?.active && callState.type === "video" ? endCall() : startCall("video")}
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                        callState?.active && callState.type === "video"
                          ? "bg-red-100 text-red-600 dark:bg-red-900/30"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <Video size={18} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{callState?.active && callState.type === "video" ? "End call" : "Video call"}</TooltipContent>
                </Tooltip>

                {/* Screen share */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => callState?.active ? updateCall({ isScreenSharing: !callState.isScreenSharing }) : startCall("screen")}
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                        callState?.isScreenSharing
                          ? "bg-green-100 text-green-600 dark:bg-green-900/30"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <MonitorUp size={18} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Screen share</TooltipContent>
                </Tooltip>

                {/* Simulate incoming call */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setIncomingCall(activeConversation.name)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <PhoneIncoming size={18} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Simulate incoming call</TooltipContent>
                </Tooltip>

                {/* Search */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowSearch((s) => !s)}
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                        showSearch ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <Search size={18} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Search in chat</TooltipContent>
                </Tooltip>

                {/* Info panel */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowInfoPanel((s) => !s)}
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                        showInfoPanel ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <PanelRight size={18} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Info</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Screen share banner */}
            {callState?.isScreenSharing && (
              <div className="bg-green-50 dark:bg-green-950/30 border-b border-green-200 dark:border-green-800 px-4 py-2 flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <MonitorUp size={14} />
                {currentUserName} is sharing their screen
                <Button variant="ghost" size="sm" className="ml-auto text-green-700 dark:text-green-400">View</Button>
              </div>
            )}

            {/* Search Bar (collapsible) */}
            <div className={cn("overflow-hidden transition-all duration-200", showSearch ? "max-h-14" : "max-h-0")}>
              <div className="px-4 py-2 border-b bg-muted/30">
                <Input placeholder="Search in conversation..." className="h-8 text-sm" />
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {groupedMessages.map((group, gi) => (
                <div key={group.date}>
                  <DateSeparator date={group.messages[0].sentAt} />
                  {group.messages.map((msg, mi) => {
                    const isSent = currentUserId > 0
                      ? msg.senderId === currentUserId
                      : msg.senderName === currentUserName;
                    const prevMsg = mi > 0 ? group.messages[mi - 1] : gi > 0 ? groupedMessages[gi - 1].messages.at(-1) : undefined;
                    const isConsecutive = prevMsg
                      && prevMsg.senderId === msg.senderId
                      && (new Date(msg.sentAt).getTime() - new Date(prevMsg.sentAt).getTime()) < 120000;

                    return (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        isSent={isSent}
                        showAvatar={!isSent && !isConsecutive}
                        showSenderName={!isSent && !isConsecutive}
                      />
                    );
                  })}
                </div>
              ))}

              {isTyping && activeConversation && (
                <TypingIndicator name={activeConversation.name} />
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer */}
            <div className="border-t bg-background px-3 py-3 flex-shrink-0">
              <div className="flex items-end gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => showToast("File sharing coming soon")}
                      className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mb-0.5"
                    >
                      <Paperclip size={18} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Attach file</TooltipContent>
                </Tooltip>

                <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                  <PopoverTrigger asChild>
                    <button className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mb-0.5">
                      <Smile size={18} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-3" align="start">
                    <div className="grid grid-cols-5 gap-2">
                      {EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-lg"
                          onClick={() => {
                            setComposerContent((prev) => prev + emoji);
                            setEmojiOpen(false);
                            textareaRef.current?.focus();
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <textarea
                  ref={textareaRef}
                  value={composerContent}
                  onChange={(e) => setComposerContent(e.target.value)}
                  onInput={handleTextareaInput}
                  onKeyDown={handleKeyDown}
                  onFocus={handleComposerFocus}
                  onBlur={handleComposerBlur}
                  placeholder={`Message ${activeConversation.name}...`}
                  rows={1}
                  className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[36px] max-h-[120px]"
                />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      className="h-9 w-9 rounded-lg shrink-0 mb-0.5"
                      disabled={!composerContent.trim()}
                      onClick={handleSend}
                    >
                      <SendHorizontal size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send message</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center space-y-3">
              <MessageSquare size={48} className="text-muted-foreground/30 mx-auto" />
              <p className="font-medium text-muted-foreground">Select a conversation</p>
              <p className="text-sm text-muted-foreground/70">Choose from your direct messages or groups</p>
            </div>
          </div>
        )}

        {/* â”€â”€â”€ Panel 3: Info Panel â”€â”€â”€ */}
        {showInfoPanel && activeConversation && (
          <InfoPanel
            conversation={activeConversation}
            onMuteToggle={handleMuteToggle}
            onLeaveGroup={handleLeaveGroup}
            onDeleteGroup={handleDeleteGroup}
            onTransferAdmin={handleTransferAdmin}
            showToast={showToast}
            currentUserName={currentUserName}
            currentUserId={currentUserId}
          />
        )}
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={newChatOpen} onOpenChange={(open) => {
        setNewChatOpen(open);
        if (!open) { setNewGroupTab("dm"); setNewGroupName(""); setNewGroupMembers([]); setNewDmSearch(""); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New conversation</DialogTitle>
          </DialogHeader>
          <Tabs value={newGroupTab} onValueChange={(v) => setNewGroupTab(v as "dm" | "group")}>
            <TabsList className="w-full mb-3">
              <TabsTrigger value="dm" className="flex-1">Direct message</TabsTrigger>
              <TabsTrigger value="group" className="flex-1">New group</TabsTrigger>
            </TabsList>

            <TabsContent value="dm">
              <Input
                placeholder="Search people..."
                className="mb-3"
                value={newDmSearch}
                onChange={(e) => setNewDmSearch(e.target.value)}
              />
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {SEEDED_CONTACTS
                  .filter((n) => !newDmSearch || n.toLowerCase().includes(newDmSearch.toLowerCase()))
                  .map((name) => (
                    <button
                      key={name}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
                      onClick={() => handleStartDm(name)}
                    >
                      <Avatar name={name} size={36} />
                      <span className="text-sm font-medium">{name}</span>
                    </button>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="group">
              <Input
                placeholder="Group name"
                className="mb-3"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mb-2">Add members (at least 1)</p>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {SEEDED_CONTACTS.map((name) => {
                  const isSelected = newGroupMembers.includes(name);
                  return (
                    <button
                      key={name}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                        isSelected ? "bg-accent" : "hover:bg-muted"
                      )}
                      onClick={() => {
                        setNewGroupMembers((prev) =>
                          isSelected ? prev.filter((n) => n !== name) : [...prev, name]
                        );
                      }}
                    >
                      <div className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center",
                        isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                      )}>
                        {isSelected && <span className="text-white text-[10px]">âœ“</span>}
                      </div>
                      <Avatar name={name} size={32} />
                      <span className="text-sm font-medium">{name}</span>
                    </button>
                  );
                })}
              </div>
              {newGroupMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {newGroupMembers.map((name) => (
                    <span key={name} className="inline-flex items-center gap-1 bg-muted rounded-full px-2.5 py-1 text-xs font-medium">
                      <Avatar name={name} size={16} />
                      {name.split(" ")[0]}
                      <button onClick={() => setNewGroupMembers((prev) => prev.filter((n) => n !== name))} className="hover:opacity-70">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <Button
                className="w-full mt-3"
                disabled={!newGroupName.trim() || newGroupMembers.length === 0}
                onClick={handleCreateGroup}
              >
                Create group
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}



