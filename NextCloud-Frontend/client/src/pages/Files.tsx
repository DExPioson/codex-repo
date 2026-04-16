import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  FileText, Image, Table2, Archive, FileCode, File, Folder, FolderOpen,
  Star, Clock, Users, Trash2, ChevronRight, FolderPlus, Upload,
  List, LayoutGrid, MoreVertical, Download, Share2, Heart, X,
  Move, Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuCheckboxItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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

type SortKey = "name-asc" | "name-desc" | "size" | "modified";

const sidebarItems = [
  { id: "all", label: "All Files", icon: FolderOpen },
  { id: "favourites", label: "Favourites", icon: Star },
  { id: "recent", label: "Recent", icon: Clock },
  { id: "shared", label: "Shared with me", icon: Users },
  { id: "deleted", label: "Deleted files", icon: Trash2 },
];

export default function Files() {
  const queryClient = useQueryClient();
  const [currentPath, setCurrentPath] = useState("/");
  const [activeSection, setActiveSection] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortKey, setSortKey] = useState<SortKey>("name-asc");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/files", currentPath],
    queryFn: () => fetch(`/api/files?path=${encodeURIComponent(currentPath)}`).then((r) => r.json()).then((r) => r.data),
  });

  const createFolder = useMutation({
    mutationFn: (name: string) =>
      apiRequest("POST", "/api/files", {
        name,
        type: "folder",
        path: `${currentPath === "/" ? "" : currentPath}/${name}`,
        parentPath: currentPath,
        modifiedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      setNewFolderOpen(false);
      setNewFolderName("");
    },
  });

  const files = data || [];
  const sortedFiles = [...files].sort((a: any, b: any) => {
    // Folders first
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    switch (sortKey) {
      case "name-asc": return a.name.localeCompare(b.name);
      case "name-desc": return b.name.localeCompare(a.name);
      case "size": return (b.size || 0) - (a.size || 0);
      case "modified": return b.modifiedAt.localeCompare(a.modifiedAt);
      default: return 0;
    }
  });

  const totalSize = files.reduce((s: number, f: any) => s + (f.size || 0), 0);
  const allSelected = sortedFiles.length > 0 && selectedIds.size === sortedFiles.length;

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedFiles.map((f: any) => f.id)));
  };

  const navigateToFolder = (folderName: string) => {
    const newPath = currentPath === "/" ? `/${folderName}` : `${currentPath}/${folderName}`;
    setCurrentPath(newPath);
    setSelectedIds(new Set());
  };

  const breadcrumbs = currentPath === "/"
    ? [{ label: "Home", path: "/" }]
    : [
        { label: "Home", path: "/" },
        ...currentPath.split("/").filter(Boolean).map((seg, i, arr) => ({
          label: seg,
          path: "/" + arr.slice(0, i + 1).join("/"),
        })),
      ];

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

  return (
    <div className="flex h-full">
      {/* Files Sidebar */}
      <div className="w-[200px] shrink-0 border-r p-3 space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 mb-2">Quick Access</p>
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveSection(item.id); if (item.id === "all") setCurrentPath("/"); }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                activeSection === item.id ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
        <Separator className="my-3" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 mb-2">Tags</p>
        <div className="flex flex-wrap gap-1 px-2">
          <Badge variant="secondary" className="text-xs cursor-pointer">Work</Badge>
          <Badge variant="secondary" className="text-xs cursor-pointer">Personal</Badge>
          <Badge variant="secondary" className="text-xs cursor-pointer">Archive</Badge>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((bc, i) => (
              <span key={bc.path} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                {i === breadcrumbs.length - 1 ? (
                  <span className="font-medium">{bc.label === "Home" ? <Home className="h-4 w-4" /> : bc.label}</span>
                ) : (
                  <button onClick={() => { setCurrentPath(bc.path); setSelectedIds(new Set()); }}
                    className="text-muted-foreground hover:text-foreground transition-colors">
                    {bc.label === "Home" ? <Home className="h-4 w-4" /> : bc.label}
                  </button>
                )}
              </span>
            ))}
          </nav>

          <div className="flex-1" />

          <Button variant="outline" size="sm" onClick={() => setNewFolderOpen(true)}>
            <FolderPlus className="h-4 w-4 mr-1" /> New Folder
          </Button>
          <Button size="sm">
            <Upload className="h-4 w-4 mr-1" /> Upload
          </Button>
          <Separator orientation="vertical" className="h-5" />

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs">Sort</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem checked={sortKey === "name-asc"} onCheckedChange={() => setSortKey("name-asc")}>Name A–Z</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={sortKey === "name-desc"} onCheckedChange={() => setSortKey("name-desc")}>Name Z–A</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={sortKey === "size"} onCheckedChange={() => setSortKey("size")}>Size</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={sortKey === "modified"} onCheckedChange={() => setSortKey("modified")}>Date Modified</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View toggle */}
          <div className="flex rounded-md border">
            <button onClick={() => setViewMode("list")}
              className={cn("p-1.5 rounded-l-md transition-colors", viewMode === "list" ? "bg-muted" : "hover:bg-muted/50")}>
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode("grid")}
              className={cn("p-1.5 rounded-r-md transition-colors", viewMode === "grid" ? "bg-muted" : "hover:bg-muted/50")}>
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* File area with drag-drop */}
        <div className="flex-1 overflow-auto relative" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          {isDragging && (
            <div className="absolute inset-0 z-10 flex items-center justify-center border-2 border-dashed border-primary bg-primary/5 rounded-lg m-2">
              <div className="text-center">
                <Upload className="h-10 w-10 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium text-primary">Drop files to upload</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : sortedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <Folder className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">This folder is empty</p>
              <Button variant="outline" size="sm" className="mt-3">Upload files</Button>
            </div>
          ) : viewMode === "list" ? (
            <div className="animate-fade-in">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-2 border-b bg-background sticky top-0 z-[5]">
                <div className="w-[40px] flex justify-center">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </div>
                <button className="flex-1 text-xs text-muted-foreground uppercase tracking-wide text-left" onClick={() => setSortKey(sortKey === "name-asc" ? "name-desc" : "name-asc")}>Name</button>
                <button className="w-[80px] text-xs text-muted-foreground uppercase tracking-wide text-right" onClick={() => setSortKey("size")}>Size</button>
                <button className="w-[140px] text-xs text-muted-foreground uppercase tracking-wide text-right" onClick={() => setSortKey("modified")}>Modified</button>
                <div className="w-[80px] text-xs text-muted-foreground uppercase tracking-wide text-center">Shared</div>
                <div className="w-[40px]" />
              </div>
              {/* Rows */}
              {sortedFiles.map((f: any) => {
                const { icon: Icon, color } = getFileIcon(f.mimeType, f.type);
                const isSelected = selectedIds.has(f.id);
                const shared = f.sharedWith ? JSON.parse(f.sharedWith) : [];
                return (
                  <div key={f.id}
                    className={cn("flex items-center gap-3 px-4 py-2 border-b transition-colors group",
                      isSelected ? "bg-accent" : "hover:bg-muted/40")}
                  >
                    <div className="w-[40px] flex justify-center">
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(f.id)}
                        className={cn("transition-opacity", !isSelected && "opacity-0 group-hover:opacity-100")} />
                    </div>
                    <div className="flex-1 flex items-center gap-2 min-w-0 cursor-pointer"
                      onClick={() => f.type === "folder" ? navigateToFolder(f.name) : undefined}>
                      <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                      <span className="text-sm font-medium truncate">{f.name}</span>
                    </div>
                    <span className="w-[80px] text-sm text-muted-foreground text-right">
                      {f.type === "file" ? formatBytes(f.size || 0) : "—"}
                    </span>
                    <span className="w-[140px] text-sm text-muted-foreground text-right">
                      {format(new Date(f.modifiedAt), "MMM d, yyyy")}
                    </span>
                    <div className="w-[80px] flex justify-center">
                      {shared.length > 0 && <Users className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                    <div className="w-[40px] flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Download className="h-4 w-4 mr-2" /> Download</DropdownMenuItem>
                          <DropdownMenuItem><FileText className="h-4 w-4 mr-2" /> Rename</DropdownMenuItem>
                          <DropdownMenuItem><Share2 className="h-4 w-4 mr-2" /> Share</DropdownMenuItem>
                          <DropdownMenuItem><Heart className="h-4 w-4 mr-2" /> Add to Favourites</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Move to Trash</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 p-4 animate-fade-in">
              {sortedFiles.map((f: any) => {
                const { icon: Icon, color } = getFileIcon(f.mimeType, f.type);
                const isSelected = selectedIds.has(f.id);
                const isImage = f.mimeType?.startsWith("image/");
                return (
                  <div key={f.id}
                    onClick={() => f.type === "folder" ? navigateToFolder(f.name) : toggleSelect(f.id)}
                    className={cn(
                      "rounded-lg border bg-card p-3 cursor-pointer transition-all hover:shadow-md",
                      isSelected && "border-primary bg-accent"
                    )}
                  >
                    <div className="flex items-center justify-center h-24 mb-2 rounded-md bg-muted/30">
                      {isImage ? (
                        <img src={`https://picsum.photos/seed/${f.id}/200/150`} alt={f.name}
                          className="h-full w-full object-cover rounded-md" />
                      ) : (
                        <Icon className={`h-10 w-10 ${color}`} />
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{f.type === "file" ? formatBytes(f.size || 0) : ""}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && sortedFiles.length > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
            <span>{sortedFiles.length} items · {formatBytes(totalSize)}</span>
            {selectedIds.size > 0 && <span>Press Space to preview</span>}
          </div>
        )}

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-white shadow-xl">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Separator orientation="vertical" className="h-5 bg-gray-700" />
            <button className="flex items-center gap-1.5 text-sm hover:text-gray-300 transition-colors"><Download className="h-4 w-4" /> Download</button>
            <button className="flex items-center gap-1.5 text-sm hover:text-gray-300 transition-colors"><Share2 className="h-4 w-4" /> Share</button>
            <button className="flex items-center gap-1.5 text-sm hover:text-gray-300 transition-colors"><Move className="h-4 w-4" /> Move</button>
            <button className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"><Trash2 className="h-4 w-4" /> Delete</button>
            <button onClick={() => setSelectedIds(new Set())} className="ml-2 p-1 rounded hover:bg-gray-700 transition-colors"><X className="h-4 w-4" /></button>
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription>Enter a name for the new folder.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input id="folder-name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="My Folder" onKeyDown={(e) => { if (e.key === "Enter" && newFolderName.trim()) createFolder.mutate(newFolderName.trim()); }} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (newFolderName.trim()) createFolder.mutate(newFolderName.trim()); }}
              disabled={!newFolderName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
