import { useState, useEffect, useMemo, useCallback } from "react";
import { format, parseISO } from "date-fns";
import {
  Image, Film, Heart, Clock, Trash2, Upload, ChevronLeft, ChevronRight,
  X, Download, Share2, Info, CheckSquare, Grid3X3, Grid2X2, List,
  LayoutGrid, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
    "fixed bottom-4 right-4 z-[60] bg-foreground text-background px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in";
  el.textContent = msg;
  document.body.appendChild(el);
  toastTimeout = setTimeout(() => el.remove(), 2500);
}

// ─── Mock Data ─────────────────────────────────────────────
const MOCK_ALBUMS = [
  { id: 1, name: "All Photos", count: 24, cover: "https://picsum.photos/seed/album1/400/300" },
  { id: 2, name: "Screenshots", count: 8, cover: "https://picsum.photos/seed/album2/400/300" },
  { id: 3, name: "Camera Roll", count: 12, cover: "https://picsum.photos/seed/album3/400/300" },
  { id: 4, name: "Favourites", count: 4, cover: "https://picsum.photos/seed/album4/400/300" },
  { id: 5, name: "Shared", count: 6, cover: "https://picsum.photos/seed/album5/400/300" },
];

const MOCK_PHOTOS = Array.from({ length: 24 }, (_, i) => ({
  id: i + 1,
  src: `https://picsum.photos/seed/photo${i + 1}/800/600`,
  thumb: `https://picsum.photos/seed/photo${i + 1}/400/300`,
  filename: `IMG_${String(2000 + i).padStart(4, "0")}.jpg`,
  size: `${(Math.random() * 4 + 0.5).toFixed(1)} MB`,
  dateTaken: new Date(2026, 2, Math.floor(i / 3) + 1).toISOString(),
  album: i < 8 ? "Camera Roll" : i < 16 ? "Screenshots" : "Camera Roll",
  isFavourite: [2, 5, 9, 14].includes(i + 1),
  width: [800, 600][i % 2],
  height: [600, 800][i % 2],
}));

const FILTER_ITEMS = [
  { label: "Videos", icon: Film },
  { label: "Favourites", icon: Heart },
  { label: "Recently added", icon: Clock },
  { label: "Trash", icon: Trash2 },
];

type ViewMode = "large" | "small" | "list";
type SortMode = "newest" | "oldest" | "name" | "size";

// ─── Main ──────────────────────────────────────────────────
export default function Media() {
  const [selectedAlbum, setSelectedAlbum] = useState("All Photos");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("large");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [favourites, setFavourites] = useState<Set<number>>(
    () => new Set(MOCK_PHOTOS.filter((p) => p.isFavourite).map((p) => p.id))
  );

  // Filter photos
  const photos = useMemo(() => {
    let filtered = [...MOCK_PHOTOS];
    if (activeFilter === "Favourites") {
      filtered = filtered.filter((p) => favourites.has(p.id));
    } else if (activeFilter === "Videos") {
      filtered = [];
    } else if (activeFilter === "Trash") {
      filtered = [];
    } else if (activeFilter === "Recently added") {
      filtered = filtered.slice(-8);
    } else if (selectedAlbum !== "All Photos") {
      const album = MOCK_ALBUMS.find((a) => a.name === selectedAlbum);
      if (album && album.name === "Screenshots") filtered = filtered.filter((p) => p.album === "Screenshots");
      else if (album && album.name === "Camera Roll") filtered = filtered.filter((p) => p.album === "Camera Roll");
      else if (album && album.name === "Favourites") filtered = filtered.filter((p) => favourites.has(p.id));
      else if (album && album.name === "Shared") filtered = filtered.slice(0, 6);
    }

    // Sort
    switch (sortMode) {
      case "oldest": filtered.sort((a, b) => a.dateTaken.localeCompare(b.dateTaken)); break;
      case "name": filtered.sort((a, b) => a.filename.localeCompare(b.filename)); break;
      case "size": filtered.sort((a, b) => parseFloat(b.size) - parseFloat(a.size)); break;
      default: filtered.sort((a, b) => b.dateTaken.localeCompare(a.dateTaken));
    }
    return filtered;
  }, [selectedAlbum, activeFilter, sortMode, favourites]);

  // Group by month
  const grouped = useMemo(() => {
    const map = new Map<string, typeof photos>();
    for (const p of photos) {
      const key = format(parseISO(p.dateTaken), "MMMM yyyy");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return Array.from(map.entries());
  }, [photos]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleFavourite = useCallback((id: number) => {
    setFavourites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Lightbox keyboard nav
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i !== null ? Math.min(i + 1, photos.length - 1) : i));
      if (e.key === "ArrowLeft") setLightboxIndex((i) => (i !== null ? Math.max(i - 1, 0) : i));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, photos.length]);

  const gridCols =
    viewMode === "large"
      ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5"
      : "grid-cols-5 sm:grid-cols-6 lg:grid-cols-8";

  return (
    <div className="flex h-[calc(100vh-var(--topbar-height))]">
      {/* ─── Left Panel ─── */}
      <div className="w-[220px] border-r flex-shrink-0 flex flex-col overflow-y-auto">
        <p className="text-sm font-semibold px-3 pt-4 pb-2">Media</p>

        {/* Albums */}
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-1">Albums</p>
        {MOCK_ALBUMS.map((album) => (
          <button
            key={album.id}
            onClick={() => { setSelectedAlbum(album.name); setActiveFilter(null); }}
            className={cn(
              "px-3 py-1.5 rounded-lg mx-1 cursor-pointer flex items-center justify-between text-left w-[calc(100%-8px)]",
              selectedAlbum === album.name && !activeFilter
                ? "bg-accent text-accent-foreground font-medium"
                : "hover:bg-muted/60"
            )}
          >
            <span className="flex items-center gap-2">
              <Image size={14} className="text-muted-foreground" />
              <span className="text-sm">{album.name}</span>
            </span>
            <span className="text-xs text-muted-foreground">{album.count}</span>
          </button>
        ))}

        {/* Filters */}
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-3 pb-1">Filter</p>
        {FILTER_ITEMS.map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.label}
              onClick={() => { setActiveFilter(activeFilter === f.label ? null : f.label); }}
              className={cn(
                "px-3 py-1.5 rounded-lg mx-1 cursor-pointer flex items-center gap-2 text-left w-[calc(100%-8px)]",
                activeFilter === f.label
                  ? "bg-accent text-accent-foreground font-medium"
                  : "hover:bg-muted/60"
              )}
            >
              <Icon size={14} className="text-muted-foreground" />
              <span className="text-sm">{f.label}</span>
            </button>
          );
        })}

        {/* Upload button */}
        <div className="mt-auto p-3">
          <Button className="w-full gap-2" onClick={() => setUploadOpen(true)}>
            <Upload size={16} /> Upload photos
          </Button>
        </div>
      </div>

      {/* ─── Main Gallery ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b flex items-center gap-3 flex-shrink-0">
          <span className="text-sm font-semibold flex-1">
            {activeFilter || selectedAlbum}
          </span>
          <span className="text-xs text-muted-foreground">{photos.length} photos</span>

          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="size">Size</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-md">
            <Button variant={viewMode === "large" ? "secondary" : "ghost"} size="icon" className="h-8 w-8 rounded-r-none" onClick={() => setViewMode("large")}>
              <LayoutGrid size={14} />
            </Button>
            <Button variant={viewMode === "small" ? "secondary" : "ghost"} size="icon" className="h-8 w-8 rounded-none border-x" onClick={() => setViewMode("small")}>
              <Grid3X3 size={14} />
            </Button>
            <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-8 w-8 rounded-l-none" onClick={() => setViewMode("list")}>
              <List size={14} />
            </Button>
          </div>

          <Button
            variant={selectMode ? "secondary" : "outline"}
            size="sm"
            className="gap-1"
            onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}
          >
            <CheckSquare size={14} /> Select
          </Button>
        </div>

        {/* Multi-select bar */}
        {selectMode && (
          <div className="px-4 py-2 bg-primary/5 border-b flex items-center gap-3 animate-fade-in flex-shrink-0">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set(photos.map((p) => p.id)))}>
              Select all
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => showToast("Download coming soon")}>
              <Download size={14} /> Download
            </Button>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => {
              selected.forEach((id) => toggleFavourite(id));
              showToast(`${selected.size} photos favourited`);
            }}>
              <Heart size={14} /> Favourite
            </Button>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => showToast("Move coming soon")}>
              Move
            </Button>
            <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => showToast("Delete coming soon")}>
              <Trash2 size={14} /> Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setSelectMode(false); setSelected(new Set()); }}>
              Cancel
            </Button>
          </div>
        )}

        {/* Photo grid / list */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Image size={40} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No photos match this filter</p>
            </div>
          ) : viewMode === "list" ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs">
                  <th className="pb-2 w-16" />
                  <th className="pb-2">Filename</th>
                  <th className="pb-2">Size</th>
                  <th className="pb-2">Date taken</th>
                  <th className="pb-2">Album</th>
                  <th className="pb-2 w-24" />
                </tr>
              </thead>
              <tbody>
                {photos.map((photo, idx) => (
                  <tr key={photo.id} className="border-b hover:bg-muted/40 cursor-pointer" onClick={() => !selectMode && setLightboxIndex(idx)}>
                    <td className="py-2">
                      <img src={photo.thumb} alt={photo.filename} className="w-12 h-12 object-cover rounded" loading="lazy" />
                    </td>
                    <td className="py-2 font-medium">{photo.filename}</td>
                    <td className="py-2 text-muted-foreground">{photo.size}</td>
                    <td className="py-2 text-muted-foreground">{format(parseISO(photo.dateTaken), "MMM d, yyyy")}</td>
                    <td className="py-2 text-muted-foreground">{photo.album}</td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); window.open(photo.src, "_blank"); }}>
                          <Download size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); toggleFavourite(photo.id); }}>
                          <Heart size={14} className={favourites.has(photo.id) ? "fill-current text-rose-500" : ""} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); showToast("Delete coming soon"); }}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            grouped.map(([month, items]) => (
              <div key={month}>
                <div className="mb-3 mt-4 first:mt-0">
                  <h3 className="text-sm font-semibold text-foreground">{month}</h3>
                  <p className="text-xs text-muted-foreground">{items.length} photos</p>
                </div>
                <div className={cn("grid gap-2", gridCols)}>
                  {items.map((photo) => {
                    const photoIndex = photos.indexOf(photo);
                    const isSelected = selected.has(photo.id);
                    return (
                      <div
                        key={photo.id}
                        className={cn(
                          "relative group cursor-pointer overflow-hidden rounded-lg bg-muted aspect-square",
                          isSelected && "ring-2 ring-primary"
                        )}
                        onClick={() => selectMode ? toggleSelect(photo.id) : setLightboxIndex(photoIndex)}
                      >
                        <img
                          src={photo.thumb}
                          alt={photo.filename}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                          <p className="text-white text-xs truncate">{photo.filename}</p>
                        </div>
                        {/* Favourite */}
                        {favourites.has(photo.id) && (
                          <Heart size={14} className="absolute top-2 right-2 fill-white text-white drop-shadow" />
                        )}
                        {/* Select checkbox */}
                        {selectMode && (
                          <div className={cn(
                            "absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center",
                            isSelected ? "bg-primary border-primary" : "border-white bg-black/20"
                          )}>
                            {isSelected && <Check size={12} className="text-white" />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── Lightbox ─── */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
            <div>
              <p className="text-white text-sm font-medium">{photos[lightboxIndex].filename}</p>
              <p className="text-white/50 text-xs">
                {photos[lightboxIndex].size} &middot; {format(parseISO(photos[lightboxIndex].dateTaken), "MMM d, yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-white/70 hover:text-white p-2" onClick={() => toggleFavourite(photos[lightboxIndex!].id)}>
                <Heart size={18} className={favourites.has(photos[lightboxIndex].id) ? "fill-white" : ""} />
              </button>
              <button className="text-white/70 hover:text-white p-2" onClick={() => window.open(photos[lightboxIndex!].src, "_blank")}>
                <Download size={18} />
              </button>
              <button className="text-white/70 hover:text-white p-2" onClick={() => showToast("Share link copied to clipboard")}>
                <Share2 size={18} />
              </button>
              <button className="text-white/70 hover:text-white p-2" onClick={() => showToast("Showing EXIF data coming soon")}>
                <Info size={18} />
              </button>
              <button className="text-white/70 hover:text-white p-2" onClick={() => setLightboxIndex(null)}>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Main image */}
          <div className="flex-1 flex items-center justify-center relative px-16 min-h-0">
            {lightboxIndex > 0 && (
              <button
                onClick={() => setLightboxIndex(lightboxIndex - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <img
              src={photos[lightboxIndex].src}
              alt={photos[lightboxIndex].filename}
              className="max-h-full max-w-full object-contain rounded"
            />
            {lightboxIndex < photos.length - 1 && (
              <button
                onClick={() => setLightboxIndex(lightboxIndex + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>

          {/* Thumbnail strip */}
          <div className="flex gap-1.5 px-4 py-3 overflow-x-auto flex-shrink-0">
            {photos.map((p, i) => (
              <img
                key={p.id}
                src={p.thumb}
                onClick={() => setLightboxIndex(i)}
                className={cn(
                  "h-14 w-20 object-cover rounded cursor-pointer flex-shrink-0 transition-all",
                  i === lightboxIndex ? "ring-2 ring-white opacity-100" : "opacity-50 hover:opacity-75"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── Upload Dialog ─── */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Photos</DialogTitle>
          </DialogHeader>
          <div className="border-2 border-dashed border-primary/40 rounded-xl p-12 text-center">
            <Upload size={48} className="mx-auto text-indigo-400/40 mb-4" />
            <p className="font-semibold mb-1">Drag & drop photos here</p>
            <p className="text-sm text-muted-foreground mb-4">or</p>
            <Button variant="outline" onClick={() => showToast("File picker coming soon")}>
              Browse files
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Supports JPG, PNG, HEIC, GIF, MP4 &middot; Max 50MB per file
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => setUploadOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
