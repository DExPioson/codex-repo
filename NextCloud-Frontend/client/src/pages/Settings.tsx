import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User, Shield, Bell, Palette, HardDrive, Puzzle, Info,
  Camera, Lock, Laptop, Smartphone, Check, CheckCircle,
  Trash2, Download, Zap, Plus, ExternalLink, X, AlertCircle,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ─── Toast ─────────────────────────────────────────────────
let toastTimeout: ReturnType<typeof setTimeout>;
function showToast(msg: string) {
  const existing = document.getElementById("cs-toast");
  if (existing) existing.remove();
  clearTimeout(toastTimeout);
  const el = document.createElement("div");
  el.id = "cs-toast";
  el.className =
    "fixed bottom-4 right-4 z-50 bg-foreground text-background px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in";
  el.textContent = msg;
  document.body.appendChild(el);
  toastTimeout = setTimeout(() => el.remove(), 2500);
}

// ─── Nav Config ────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: "Account",
    items: [
      { id: "profile", label: "Profile", icon: User },
      { id: "security", label: "Security", icon: Shield },
      { id: "notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "App",
    items: [
      { id: "appearance", label: "Appearance", icon: Palette },
      { id: "storage", label: "Storage", icon: HardDrive },
      { id: "connected", label: "Connected Apps", icon: Puzzle },
    ],
  },
  {
    label: "Admin",
    items: [
      { id: "about", label: "About CloudSpace", icon: Info },
    ],
  },
];

// ─── Profile Section ───────────────────────────────────────
function ProfileSection() {
  const queryClient = useQueryClient();
  const { data } = useQuery<{ data: { name: string; email: string } }>({
    queryKey: ["/api/user"],
    queryFn: () => fetch("/api/user").then((r) => r.json()),
  });
  const user = data?.data;

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("asia-calcutta");

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  useEffect(() => {
    if (!user?.email) return;
    const derivedUsername = user.email.split("@")[0] || "";
    setUsername(derivedUsername);
  }, [user?.email]);

  const isDirty = useMemo(() => {
    const origName = user?.name || "";
    const origUsername = (user?.email || "").split("@")[0] || "";
    return name !== origName || bio !== "" || username !== origUsername || language !== "en" || timezone !== "asia-calcutta";
  }, [name, bio, username, language, timezone, user?.name, user?.email]);

  const handleDiscard = () => {
    setName(user?.name || "");
    setUsername((user?.email || "").split("@")[0] || "");
    setBio("");
    setLanguage("en");
    setTimezone("asia-calcutta");
  };

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/user", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      showToast("Profile updated");
    },
  });

  return (
    <div className="relative">
      <h2 className="text-xl font-bold">Profile</h2>
      <p className="text-sm text-muted-foreground mb-4">Manage your personal information</p>
      <Separator className="mb-6" />

      {/* Avatar */}
      <div className="flex items-center gap-6 py-6 border-b">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-semibold">
          {getInitials(name || user?.name || "User")}
        </div>
        <div>
          <p className="text-sm font-medium mb-2">Profile photo</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={() => showToast("Photo upload coming soon")}>
              <Camera size={14} /> Upload new photo
            </Button>
            <Button variant="ghost" size="sm">Remove</Button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4 py-6">
        <div>
          <Label className="text-sm">Display name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Email</Label>
            <div className="relative mt-1">
              <Input value={user?.email || ""} disabled className="pr-8" />
              <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          <div>
            <Label className="text-sm">Username</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} className="pl-7" />
            </div>
          </div>
        </div>
        <div>
          <Label className="text-sm">Bio</Label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 160))}
            placeholder="Tell people about yourself…"
            className="mt-1"
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">{bio.length}/160</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">Hindi</SelectItem>
                <SelectItem value="pa">Punjabi</SelectItem>
                <SelectItem value="ur">Urdu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="asia-calcutta">Asia/Calcutta (IST, UTC+5:30)</SelectItem>
                <SelectItem value="utc">UTC</SelectItem>
                <SelectItem value="us-eastern">US/Eastern (EST, UTC-5)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-4 border-t mt-4 gap-2">
        <Button variant="ghost" onClick={handleDiscard}>
          Discard changes
        </Button>
        <Button className="gap-1" onClick={() => saveMutation.mutate()}>
          <CheckCircle size={14} /> Save profile
        </Button>
      </div>

      {/* Unsaved changes banner */}
      {isDirty && (
        <div className="sticky bottom-0 left-0 right-0 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200 dark:border-amber-800 px-6 py-3 flex items-center justify-between mt-4 -mx-8 -mb-8 rounded-b-lg">
          <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <AlertCircle size={14} /> Unsaved changes
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleDiscard}>Discard</Button>
            <Button size="sm" onClick={() => saveMutation.mutate()}>Save changes</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Security Section ──────────────────────────────────────
function SecuritySection() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaDialogOpen, setTwoFaDialogOpen] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  const [sessions, setSessions] = useState([
    { id: 1, device: "laptop", name: "MacBook Pro", browser: "Chrome 124", location: "New Delhi, IN", lastSeen: "Active now", isCurrent: true },
    { id: 2, device: "laptop", name: "Windows PC", browser: "Firefox 125", location: "New Delhi, IN", lastSeen: "2 days ago", isCurrent: false },
    { id: 3, device: "phone", name: "iPhone 15", browser: "Safari", location: "New Delhi, IN", lastSeen: "5 hours ago", isCurrent: false },
  ]);

  const getPasswordStrength = () => {
    if (!newPw) return { label: "", width: "0%", color: "" };
    const hasUpper = /[A-Z]/.test(newPw);
    const hasLower = /[a-z]/.test(newPw);
    const hasNum = /[0-9]/.test(newPw);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPw);
    const score = (newPw.length >= 8 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasLower ? 1 : 0) + (hasNum ? 1 : 0) + (hasSpecial ? 1 : 0);
    if (score <= 2) return { label: "Weak", width: "33%", color: "bg-red-500" };
    if (score <= 3) return { label: "Medium", width: "66%", color: "bg-amber-500" };
    return { label: "Strong", width: "100%", color: "bg-green-500" };
  };
  const strength = getPasswordStrength();

  return (
    <div>
      <h2 className="text-xl font-bold">Security</h2>
      <p className="text-sm text-muted-foreground mb-4">Manage your account security</p>
      <Separator className="mb-6" />

      {/* Change password */}
      <div className="space-y-4 pb-6">
        <h3 className="font-medium">Change password</h3>
        <div>
          <Label className="text-sm">Current password</Label>
          <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="mt-1 max-w-sm" />
        </div>
        <div>
          <Label className="text-sm">New password</Label>
          <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="mt-1 max-w-sm" />
          {newPw && (
            <div className="mt-2 max-w-sm">
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", strength.color)} style={{ width: strength.width }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{strength.label}</p>
            </div>
          )}
        </div>
        <div>
          <Label className="text-sm">Confirm new password</Label>
          <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="mt-1 max-w-sm" />
        </div>
        <Button size="sm" onClick={() => showToast("Password updated")}>Update password</Button>
      </div>

      {/* 2FA */}
      <div className="py-6 border-t">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Two-factor authentication</p>
            <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
          </div>
          <Switch
            checked={twoFaEnabled}
            onCheckedChange={(checked) => {
              if (checked) setTwoFaDialogOpen(true);
              else { setTwoFaEnabled(false); showToast("2FA disabled"); }
            }}
          />
        </div>
      </div>

      {/* 2FA Dialog */}
      <Dialog open={twoFaDialogOpen} onOpenChange={setTwoFaDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set up 2FA</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {/* Mock QR code */}
            <div className="w-40 h-40 bg-white p-2 rounded">
              <div className="w-full h-full grid grid-cols-8 grid-rows-8 gap-px">
                {Array.from({ length: 64 }, (_, i) => (
                  <div key={i} className={cn("rounded-[1px]", (i * 7 + i * 3) % 3 === 0 ? "bg-gray-900" : "bg-white")} />
                ))}
              </div>
            </div>
            <p className="text-sm text-center">Scan with your authenticator app</p>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Or enter code manually:</p>
              <code className="bg-muted px-3 py-1.5 rounded text-sm font-mono">JBSWY3DPEHPK3PXP</code>
            </div>
            <div className="w-full">
              <Label className="text-sm">Enter 6-digit code</Label>
              <Input value={totpCode} onChange={(e) => setTotpCode(e.target.value)} placeholder="000000" className="mt-1" maxLength={6} />
            </div>
            <Button className="w-full" onClick={() => {
              setTwoFaEnabled(true);
              setTwoFaDialogOpen(false);
              setTotpCode("");
              showToast("2FA enabled");
            }}>
              Verify
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active sessions */}
      <div className="py-6 border-t">
        <h3 className="font-medium">Active sessions</h3>
        <p className="text-sm text-muted-foreground mb-4">Manage devices that are signed into your account</p>
        <div className="space-y-0">
          {sessions.map((s) => {
            const DeviceIcon = s.device === "laptop" ? Laptop : Smartphone;
            return (
              <div key={s.id} className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <DeviceIcon size={20} className="text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{s.name} &middot; {s.browser} &middot; {s.location}</p>
                    <p className={cn("text-xs", s.lastSeen === "Active now" ? "text-green-600" : "text-muted-foreground")}>
                      {s.lastSeen}
                    </p>
                  </div>
                </div>
                {s.isCurrent ? (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">This device</span>
                ) : (
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => {
                    setSessions(sessions.filter((x) => x.id !== s.id));
                    showToast("Session revoked");
                  }}>
                    Revoke
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Notifications Section ─────────────────────────────────
function NotificationsSection() {
  const emailToggles = [
    { label: "New message", desc: "When someone sends you a direct message", default: true },
    { label: "File shared with you", desc: "When a file or folder is shared with you", default: true },
    { label: "Comment on file", desc: "When someone comments on your file", default: true },
    { label: "Login from new device", desc: "When your account is accessed from a new device", default: true },
    { label: "Weekly summary", desc: "A weekly digest of your activity", default: false },
    { label: "System updates", desc: "Important system announcements", default: true },
  ];
  const appToggles = [
    { label: "Mentions", desc: "When someone mentions you", default: true },
    { label: "Direct messages", desc: "New direct messages in Talk", default: true },
    { label: "File activity", desc: "Changes to files you follow", default: false },
    { label: "Calendar reminders", desc: "Upcoming event notifications", default: true },
    { label: "Deck card assigned", desc: "When a card is assigned to you", default: true },
    { label: "Mail (badge count)", desc: "Show unread mail count in sidebar", default: true },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold">Notifications</h2>
      <p className="text-sm text-muted-foreground mb-4">Choose how you want to be notified</p>
      <Separator className="mb-6" />

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h3 className="font-medium mb-4">Email notifications</h3>
          {emailToggles.map((t) => (
            <div key={t.label} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
              <Switch defaultChecked={t.default} />
            </div>
          ))}
        </div>
        <div>
          <h3 className="font-medium mb-4">In-app notifications</h3>
          {appToggles.map((t) => (
            <div key={t.label} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
              <Switch defaultChecked={t.default} />
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t mt-6">
        <Button onClick={() => showToast("Notification preferences saved")}>
          Save notification preferences
        </Button>
      </div>
    </div>
  );
}

// ─── Appearance Section ────────────────────────────────────
function AppearanceSection() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    const stored = localStorage.getItem("cloudspace-theme");
    if (stored === "dark") return "dark";
    if (stored === "light") return "light";
    return "system";
  });

  const [accentColor, setAccentColor] = useState("indigo");
  const [fontSize, setFontSize] = useState(14);
  const [compact, setCompact] = useState(false);

  const ACCENT_COLORS = [
    { name: "indigo", hex: "#4F46E5", hsl: "239 84% 67%" },
    { name: "violet", hex: "#7C3AED", hsl: "263 70% 50%" },
    { name: "rose", hex: "#E11D48", hsl: "347 77% 50%" },
    { name: "emerald", hex: "#059669", hsl: "160 84% 39%" },
    { name: "amber", hex: "#D97706", hsl: "38 92% 50%" },
    { name: "sky", hex: "#0284C7", hsl: "199 89% 48%" },
  ];

  const applyTheme = (t: "light" | "dark" | "system") => {
    setTheme(t);
    const root = document.documentElement;
    if (t === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
      localStorage.setItem("cloudspace-theme", prefersDark ? "dark" : "light");
    } else {
      root.classList.toggle("dark", t === "dark");
      localStorage.setItem("cloudspace-theme", t);
    }
  };

  const applyAccentColor = (color: typeof ACCENT_COLORS[0]) => {
    setAccentColor(color.name);
    document.documentElement.style.setProperty("--primary", color.hsl);
  };

  return (
    <div>
      <h2 className="text-xl font-bold">Appearance</h2>
      <p className="text-sm text-muted-foreground mb-4">Customize the look and feel</p>
      <Separator className="mb-6" />

      {/* Theme */}
      <h3 className="font-medium mb-3">Theme</h3>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {(["light", "dark", "system"] as const).map((t) => (
          <button
            key={t}
            onClick={() => applyTheme(t)}
            className={cn(
              "rounded-xl border-2 p-4 cursor-pointer transition-all text-left relative",
              theme === t ? "border-primary bg-accent" : "border-border hover:border-muted-foreground/30"
            )}
          >
            {/* Mini preview */}
            <div className={cn(
              "w-full h-16 rounded-lg mb-3 overflow-hidden flex gap-1 p-1",
              t === "dark" ? "bg-gray-900" : t === "light" ? "bg-gray-100" : "bg-gradient-to-r from-gray-100 to-gray-900"
            )}>
              <div className={cn("w-1/4 rounded", t === "dark" ? "bg-gray-800" : "bg-white")} />
              <div className="flex-1 flex flex-col gap-1">
                <div className={cn("h-2 rounded", t === "dark" ? "bg-gray-700" : "bg-gray-200")} />
                <div className={cn("flex-1 rounded", t === "dark" ? "bg-gray-800" : "bg-white")} />
              </div>
            </div>
            <p className="text-sm font-medium capitalize">{t === "system" ? "System default" : t}</p>
            {theme === t && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check size={12} className="text-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Accent color */}
      <h3 className="font-medium mb-3">Accent color</h3>
      <div className="flex gap-3 flex-wrap mb-8">
        {ACCENT_COLORS.map((c) => (
          <button
            key={c.name}
            onClick={() => applyAccentColor(c)}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center transition-all",
              accentColor === c.name && "ring-2 ring-offset-2 ring-offset-background"
            )}
            style={{ backgroundColor: c.hex, ...(accentColor === c.name ? { boxShadow: `0 0 0 2px ${c.hex}` } : {}) }}
          >
            {accentColor === c.name && <Check size={14} className="text-white" />}
          </button>
        ))}
      </div>

      {/* Font size */}
      <h3 className="font-medium mb-3">Font size</h3>
      <div className="max-w-sm mb-2">
        <Slider
          value={[fontSize]}
          onValueChange={(v) => {
            setFontSize(v[0]);
            document.documentElement.style.fontSize = v[0] + "px";
          }}
          min={12}
          max={18}
          step={1}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>12px</span>
          <span>{fontSize}px</span>
          <span>18px</span>
        </div>
      </div>
      <p className="text-muted-foreground mb-8 border rounded-lg p-3" style={{ fontSize: fontSize + "px" }}>
        The quick brown fox jumps over the lazy dog
      </p>

      {/* Compact mode */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Compact mode</p>
          <p className="text-sm text-muted-foreground">Reduce padding and spacing across the app</p>
        </div>
        <Switch
          checked={compact}
          onCheckedChange={(checked) => {
            setCompact(checked);
            document.documentElement.classList.toggle("compact", checked);
            showToast(checked ? "Compact mode enabled" : "Compact mode disabled");
          }}
        />
      </div>
    </div>
  );
}

// ─── Storage Section ───────────────────────────────────────
function StorageSection() {
  const breakdown = [
    { app: "Files", size: 12.1, total: 18.4, color: "bg-indigo-500" },
    { app: "Mail", size: 3.2, total: 18.4, color: "bg-blue-500" },
    { app: "Talk (attachments)", size: 1.8, total: 18.4, color: "bg-purple-500" },
    { app: "Media", size: 0.9, total: 18.4, color: "bg-rose-500" },
    { app: "Notes", size: 0.2, total: 18.4, color: "bg-amber-500" },
    { app: "Other", size: 0.2, total: 18.4, color: "bg-slate-500" },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold">Storage</h2>
      <p className="text-sm text-muted-foreground mb-4">Manage your storage usage</p>
      <Separator className="mb-6" />

      {/* Quota overview */}
      <div className="bg-muted/40 rounded-xl p-6 mb-6">
        <p className="text-xl font-bold">18.4 GB <span className="text-sm font-normal text-muted-foreground">used of 50 GB</span></p>
        <div className="w-full h-2.5 bg-muted rounded-full mt-3 overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: "36.8%" }} />
        </div>
        <p className="text-sm text-muted-foreground mt-2">31.6 GB free</p>
      </div>

      {/* Breakdown */}
      <h3 className="font-medium mb-3">Usage breakdown</h3>
      <div className="space-y-3 mb-6">
        {breakdown.map((b) => (
          <div key={b.app} className="flex items-center gap-3">
            <div className={cn("w-5 h-5 rounded-full flex-shrink-0", b.color)} />
            <span className="text-sm flex-1">{b.app}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full", b.color)} style={{ width: `${(b.size / 50) * 100}%` }} />
            </div>
            <span className="text-sm text-muted-foreground w-16 text-right">{b.size} GB</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <Button variant="outline" className="gap-1" onClick={() => showToast("Trash emptied · 0 bytes recovered")}>
          <Trash2 size={14} /> Empty Trash
        </Button>
        <Button variant="outline" className="gap-1" onClick={() => showToast("Data export coming soon")}>
          <Download size={14} /> Download all data
        </Button>
        <Button className="gap-1" onClick={() => showToast("Storage upgrade coming soon")}>
          <Zap size={14} /> Upgrade storage
        </Button>
      </div>
    </div>
  );
}

// ─── Connected Apps Section ────────────────────────────────
function ConnectedAppsSection() {
  const [apps, setApps] = useState([
    { id: 1, name: "Nextcloud Talk Desktop", permissions: "Read messages, Send messages", connected: "Connected Apr 1, 2026", isCurrent: false },
    { id: 2, name: "Calendar Sync (iOS)", permissions: "Read/write calendar", connected: "Connected Mar 15, 2026", isCurrent: false },
    { id: 3, name: "Thunderbird", permissions: "Read/write mail", connected: "Connected Feb 28, 2026", isCurrent: false },
    { id: 4, name: "CloudSpace Mobile", permissions: "Full access", connected: "Connected Apr 6, 2026", isCurrent: true },
  ]);
  const [confirmRevoke, setConfirmRevoke] = useState<number | null>(null);

  return (
    <div>
      <h2 className="text-xl font-bold">Connected Apps</h2>
      <p className="text-sm text-muted-foreground mb-4">Manage OAuth apps connected to your account</p>
      <Separator className="mb-6" />

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground text-xs">
            <th className="pb-2">App</th>
            <th className="pb-2">Permissions</th>
            <th className="pb-2">Connected</th>
            <th className="pb-2 w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((app) => (
            <tr key={app.id} className="border-b">
              <td className="py-3 font-medium">{app.name}</td>
              <td className="py-3 text-muted-foreground">{app.permissions}</td>
              <td className="py-3 text-muted-foreground">{app.connected}</td>
              <td className="py-3">
                {app.isCurrent ? (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded">This app</span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setConfirmRevoke(app.id)}
                  >
                    Revoke
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Button variant="outline" className="mt-4 gap-1" onClick={() => showToast("OAuth authorization coming soon")}>
        <Plus size={14} /> Authorize new app
      </Button>

      {/* Confirm revoke dialog */}
      <Dialog open={confirmRevoke !== null} onOpenChange={() => setConfirmRevoke(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Revoke access?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This app will no longer have access to your account. You can re-authorize it later.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setConfirmRevoke(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              setApps(apps.filter((a) => a.id !== confirmRevoke));
              setConfirmRevoke(null);
              showToast("App revoked");
            }}>
              Revoke
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── About Section ─────────────────────────────────────────
function AboutSection() {
  return (
    <div>
      <h2 className="text-xl font-bold">About CloudSpace</h2>
      <p className="text-sm text-muted-foreground mb-4">System information</p>
      <Separator className="mb-6" />

      <div className="flex flex-col items-center text-center py-8">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold mb-4">
          CS
        </div>
        <h3 className="text-2xl font-bold">CloudSpace</h3>
        <p className="text-muted-foreground mt-1">A modern frontend for your self-hosted Nextcloud</p>
      </div>

      <div className="border rounded-lg divide-y max-w-sm mx-auto mb-6">
        {[
          ["Frontend version", "0.1.0"],
          ["Build date", "April 2026"],
          ["Nextcloud version", "29.0.2"],
          ["Stack", "React 18 + Tailwind CSS v3 + shadcn/ui"],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-4 mb-8">
        <a href="https://github.com/DExPioson/Gaurav-NextCloud" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
          <ExternalLink size={14} /> GitHub
        </a>
        <span className="text-muted-foreground">|</span>
        <button onClick={() => showToast("Opening Nextcloud docs")} className="text-sm text-primary hover:underline flex items-center gap-1">
          <ExternalLink size={14} /> Nextcloud docs
        </button>
        <span className="text-muted-foreground">|</span>
        <button onClick={() => showToast("Opening issue tracker")} className="text-sm text-primary hover:underline flex items-center gap-1">
          <ExternalLink size={14} /> Report issue
        </button>
      </div>

      <p className="text-center text-sm text-muted-foreground italic">Open source. Self-hosted. Yours.</p>
    </div>
  );
}

// ─── Main Settings Page ────────────────────────────────────
export default function Settings() {
  const [activeSection, setActiveSection] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
    return params.get("section") || "profile";
  });

  const renderSection = () => {
    switch (activeSection) {
      case "profile": return <ProfileSection />;
      case "security": return <SecuritySection />;
      case "notifications": return <NotificationsSection />;
      case "appearance": return <AppearanceSection />;
      case "storage": return <StorageSection />;
      case "connected": return <ConnectedAppsSection />;
      case "about": return <AboutSection />;
      default: return <ProfileSection />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-var(--topbar-height))]">
      {/* Left nav */}
      <div className="w-[220px] border-r flex-shrink-0 overflow-y-auto py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-1">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "px-3 py-2 rounded-lg mx-1 cursor-pointer text-sm flex items-center gap-2.5 w-[calc(100%-8px)] text-left",
                    activeSection === item.id
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <Icon size={16} className={activeSection === item.id ? "text-accent-foreground" : ""} />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-8">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
