"use client";

import { useState, useEffect, useRef } from "react";
import {
  Globe,
  Server,
  Plus,
  Trash2,
  Loader2,
  Search,
  ArrowRight,
  X,
  Maximize2,
  Info,
  ChevronRight,
  ExternalLink,
  Radar,
  Network,
  ShieldCheck,
  AlertTriangle,
  Leaf,
  MoreHorizontal,
  Check,
  Clock,
} from "lucide-react";

interface AssetManagementProps {
  org: any;
  currentUserRole: string;
  currentUserId: string;
  isAdmin: boolean;
}

// ═══════════════════════════════════════
// Helper: Detect asset type
// ═══════════════════════════════════════
function getAssetType(value: string): "domain" | "ip" | "unknown" {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}$/;
  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

  if (ipv4Regex.test(value) || ipv6Regex.test(value)) return "ip";
  if (domainRegex.test(value)) return "domain";
  return "unknown";
}

function getAssetIcon(type: "domain" | "ip" | "unknown") {
  switch (type) {
    case "domain": return Globe;
    case "ip": return Server;
    default: return Globe;
  }
}

// ═══════════════════════════════════════
// ExpandModal (reused pattern)
// ═══════════════════════════════════════
function ExpandModal({
  open, onClose, title, icon: Icon, badge, children,
}: {
  open: boolean; onClose: () => void; title: string;
  icon: any; badge?: React.ReactNode; children: React.ReactNode;
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-200">
        <div className="bg-[#fdf8f0] px-6 py-3 border-b border-amber-500/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Icon className="w-5 h-5 text-[#8B0000]" />
            <h2 className="text-sm font-extrabold text-[#3d200a] uppercase tracking-wider">{title}</h2>
            {badge}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8a5d33] hover:bg-[#8B0000]/10 hover:text-[#8B0000] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// SectionCard (compact header)
// ═══════════════════════════════════════
function SectionCard({ title, icon: Icon, badge, onExpand, children, className }: {
  title: string;
  icon: any;
  badge?: React.ReactNode;
  onExpand?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-white/80 backdrop-blur-sm border border-amber-300/40 rounded-2xl shadow-sm overflow-hidden flex flex-col ${className || ""}`}>
      <div className="bg-[#fdf8f0] px-4 py-2 border-b border-amber-500/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-3.5 h-3.5 text-[#8B0000] shrink-0" />
          <h2 className="text-[11px] font-extrabold text-[#3d200a] uppercase tracking-wider truncate">{title}</h2>
          {badge}
        </div>
        {onExpand && (
          <button
            onClick={onExpand}
            className="w-6 h-6 rounded-md flex items-center justify-center text-[#8a5d33] hover:bg-[#8B0000]/10 hover:text-[#8B0000] transition-colors shrink-0 cursor-pointer"
            title="Expand"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {children}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
// Empty State
// ═══════════════════════════════════════
function EmptyState({ icon: EmptyIcon, text, sub }: { icon: any; text: string; sub: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
        <EmptyIcon className="w-7 h-7 text-amber-400/60" />
      </div>
      <p className="text-sm font-bold text-[#3d200a]/70">{text}</p>
      <p className="text-xs text-[#8a5d33]/50 mt-1 max-w-[240px]">{sub}</p>
    </div>
  );
}

// ═══════════════════════════════════════
// Input Bar
// ═══════════════════════════════════════
function InputBar({
  value, onChange, onSubmit, placeholder, infoText, disabled,
}: {
  value: string; onChange: (v: string) => void; onSubmit: (e: React.FormEvent) => void;
  placeholder: string; infoText: string; disabled?: boolean;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  return (
    <form onSubmit={onSubmit} className="px-4 pt-3 pb-2 shrink-0">
      <div className="flex items-center gap-1.5 mb-2">
        <label className="text-[10px] font-bold text-[#8a5d33]/60 uppercase tracking-wider">Add Asset</label>
        <div className="relative group/info">
          <button type="button" className="w-4 h-4 rounded-full bg-amber-500/10 flex items-center justify-center text-[#8a5d33]/50 hover:bg-amber-500/20 hover:text-[#8a5d33] transition-colors cursor-help">
            <Info className="w-2.5 h-2.5" />
          </button>
          <div className="absolute left-0 top-full mt-1.5 w-52 bg-white text-[#8a5d33] text-[10px] leading-relaxed px-3 py-2 rounded-lg shadow-lg border border-amber-500/20 opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-150 pointer-events-none z-50">
            {infoText}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <textarea
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-white border border-amber-500/30 rounded-xl px-4 py-2.5 text-[#3d200a] placeholder:text-[#8a5d33]/40 focus:outline-none focus:ring-2 focus:ring-[#8B0000]/50 transition-all text-sm resize-none"
        />
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="w-[34px] h-[34px] rounded-full bg-[#8B0000] text-white flex items-center justify-center shrink-0 self-center hover:bg-[#730000] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════
// Counters
// ═══════════════════════════════════════
function CountBadge({ count }: { count: number }) {
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#8B0000]/10 text-[#8B0000] tabular-nums">
      {count} total
    </span>
  );
}

// ═══════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════
export default function AssetManagement({ org, currentUserRole, currentUserId, isAdmin }: AssetManagementProps) {
  const orgAssets: any[] = org.assets || [];

  // === Root assets ===
  const [rootAssets, setRootAssets] = useState<{
    id: string; value: string; type: "domain" | "ip" | "unknown";
    addedAt: string; scanning: boolean; statusMessage?: string; scanStatus?: string;
    subdomains: string[];
  }[]>(() => {
    return orgAssets.filter(a => a.isRoot).map(a => ({
      id: a.id,
      value: a.value,
      type: getAssetType(a.value),
      addedAt: new Date(a.createdAt).toISOString(),
      scanning: a.scanStatus === 'scanning',
      scanStatus: a.scanStatus,
      statusMessage: a.scanStatus === 'scanning' ? "Scanning in background..." : "",
      subdomains: orgAssets.filter(leaf => leaf.parentId === a.id).map(l => l.value),
    }));
  });

  // === Leaf assets ===
  const [leafAssets, setLeafAssets] = useState<{
    id: string; value: string; type: "domain" | "ip" | "unknown";
    parentId: string | null; addedAt: string; scanStatus?: string;
  }[]>(() => {
    return orgAssets.filter(a => !a.isRoot).map(a => ({
      id: a.id,
      value: a.value,
      type: getAssetType(a.value),
      parentId: a.parentId,
      addedAt: new Date(a.createdAt).toISOString(),
      scanStatus: a.scanStatus,
    }));
  });

  // === Inputs ===
  const [rootInput, setRootInput] = useState("");
  const [leafInput, setLeafInput] = useState("");

  // === Discovery Queue ===
  const [discoverQueue, setDiscoverQueue] = useState<string[]>([]);

  // === Modals ===
  const [expandedSection, setExpandedSection] = useState<"root" | "leaf" | null>(null);

  // === Search ===
  const [rootSearch, setRootSearch] = useState("");
  const [leafSearch, setLeafSearch] = useState("");

  // === Context menus ===
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => setOpenMenuId(null);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // === Handlers ===
  const handleAddRootAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const rawVal = rootInput;
    if (!rawVal.trim()) return;
    
    // Split by commas, spaces, or newlines
    const values = rawVal.split(/[\s,]+/).map(v => v.trim().toLowerCase()).filter(v => v);
    const newAssets: any[] = [];
    
    values.forEach((val) => {
      const type = getAssetType(val);
      if (type === "unknown") return; // invalid input
      if (rootAssets.some((a) => a.value === val)) return; // duplicate
      if (newAssets.some((a) => a.value === val)) return; // duplicate in this batch
      
      const assetId = `root-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      newAssets.push({
        id: assetId,
        value: val,
        type,
        addedAt: new Date().toISOString(),
        scanning: false,
        scanStatus: "idle",
        subdomains: [],
      });
      
      // Call API async (non-blocking for UI)
      fetch(`/api/orgs/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: org.id, value: val, type, isRoot: true })
      }).then(res => res.json()).then(data => {
         if(data.asset) {
            setRootAssets(prev => prev.map(a => a.id === assetId ? { ...a, id: data.asset.id } : a));
         }
      }).catch(console.error);
    });

    if (newAssets.length > 0) {
      setRootAssets(prev => [...prev, ...newAssets]);
    }
    setRootInput("");
  };

  const handleAddLeafAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const rawVal = leafInput;
    if (!rawVal.trim()) return;

    const values = rawVal.split(/[\s,]+/).map(v => v.trim().toLowerCase()).filter(v => v);
    const newAssets: any[] = [];

    values.forEach((val) => {
      const type = getAssetType(val);
      if (type === "unknown") return;
      if (leafAssets.some((a) => a.value === val)) return;
      if (newAssets.some((a) => a.value === val)) return;
      
      const assetId = `leaf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      newAssets.push({
        id: assetId,
        value: val,
        type,
        parentId: null,
        addedAt: new Date().toISOString(),
        scanStatus: "idle",
      });

      // Call API approx
      fetch(`/api/orgs/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: org.id, value: val, type, isRoot: false, parentId: null })
      }).then(res => res.json()).then(data => {
         if(data.asset) {
            setLeafAssets(prev => prev.map(a => a.id === assetId ? { ...a, id: data.asset.id } : a));
         }
      }).catch(console.error);
    });

    if (newAssets.length > 0) {
      setLeafAssets(prev => [...prev, ...newAssets]);
    }
    setLeafInput("");
  };

  const handleRemoveRoot = (id: string) => {
    setRootAssets(rootAssets.filter((a) => a.id !== id));
    setLeafAssets(leafAssets.filter((a) => a.parentId !== id));
    
    fetch(`/api/orgs/assets?id=${id}&orgId=${org.id}`, { method: 'DELETE' }).catch(console.error);
  };

  const handleRemoveLeaf = (id: string) => {
    setLeafAssets(leafAssets.filter((a) => a.id !== id));
    fetch(`/api/orgs/assets?id=${id}&orgId=${org.id}`, { method: 'DELETE' }).catch(console.error);
  };

  // === Queue Processor ===
  useEffect(() => {
    const activeCount = rootAssets.filter(a => a.scanning).length;
    if (activeCount < 2 && discoverQueue.length > 0) {
      const nextId = discoverQueue[0];
      setDiscoverQueue(q => q.slice(1));
      startDiscovery(nextId);
    }
  }, [discoverQueue, rootAssets]);

  const handleScanSubdomains = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (rootAssets.find(a => a.id === id)?.scanning) return;
    setDiscoverQueue(q => q.includes(id) ? q : [...q, id]);
  };

  const startDiscovery = (id: string) => {
    setRootAssets(prev => prev.map(a => a.id === id ? { ...a, scanning: true, statusMessage: "Initializing stream..." } : a));
    
    const es = new EventSource(`/api/orgs/discover?assetId=${id}&orgId=${org.id}`);
    
    es.addEventListener("status", (e) => {
      try {
        const data = JSON.parse(e.data);
        setRootAssets(prev => prev.map(a => a.id === id ? { ...a, statusMessage: data.message } : a));
      } catch(err){}
    });

    es.addEventListener("ping", (e) => {
      try {
        const data = JSON.parse(e.data);
        setRootAssets(prev => prev.map(a => a.id === id ? { ...a, statusMessage: data.message } : a));
      } catch(err){}
    });

    es.addEventListener("done", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.subdomains && data.subdomains.length > 0) {
          setLeafAssets(prev => {
             const existing = new Set(prev.map(p => p.value));
             const newLeafs = data.subdomains.filter((s:any) => !existing.has(s.value));
             return [...prev, ...newLeafs];
          });
          setRootAssets(prev => prev.map(a => a.id === id ? { 
            ...a, 
            scanning: false, 
            statusMessage: "", 
            subdomains: Array.from(new Set([...a.subdomains, ...data.subdomains.map((s:any)=>s.value)]))
          } : a));
        } else {
          setRootAssets(prev => prev.map(a => a.id === id ? { ...a, scanning: false, statusMessage: "No subdomains found" } : a));
          setTimeout(() => {
            setRootAssets(prev => prev.map(a => a.id === id ? { ...a, statusMessage: "" } : a));
          }, 5000);
        }
      } catch(err) {
        setRootAssets(prev => prev.map(a => a.id === id ? { ...a, scanning: false, statusMessage: "" } : a));
      }
      es.close();
    });

    es.addEventListener("error", (e) => {
      let msg = "Connection error";
      try { 
        const d = JSON.parse((e as unknown as MessageEvent).data); 
        if(d.message) msg = d.message; 
      } catch (err) {}
      
      setRootAssets(prev => prev.map(a => a.id === id ? { ...a, scanning: false, statusMessage: msg } : a));
      setTimeout(() => {
        setRootAssets(prev => prev.map(a => a.id === id ? { ...a, statusMessage: "" } : a));
      }, 5000);
      
      es.close();
    });
  };

  // === Background Sync ===
  useEffect(() => {
    const interval = setInterval(() => {
      let shouldPoll = false;
      setRootAssets(prev => {
        shouldPoll = prev.some(a => a.scanning);
        return prev;
      });

      if (!shouldPoll) return;

      fetch(`/api/orgs/assets?orgId=${org.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.assets) {
             const fetchedRoots = data.assets.filter((a: any) => a.isRoot);
             
             setRootAssets(currentRoots => currentRoots.map(pa => {
                const fresh = fetchedRoots.find((fa: any) => fa.id === pa.id);
                if (fresh) {
                  if (pa.scanning && fresh.scanStatus !== 'scanning') {
                    // It finished
                    const newSubdomains = data.assets.filter((leaf: any) => leaf.parentId === pa.id).map((l:any) => l.value);
                    return { ...pa, scanning: false, scanStatus: fresh.scanStatus, statusMessage: "", subdomains: Array.from(new Set([...pa.subdomains, ...newSubdomains])) };
                  }
                  if (!pa.scanning && fresh.scanStatus === 'scanning') {
                    // It started syncing externally
                    return { ...pa, scanning: true, scanStatus: fresh.scanStatus, statusMessage: "Scanning in background..." };
                  }
                  return { ...pa, scanStatus: fresh.scanStatus };
                }
                return pa;
             }));

             setLeafAssets(currentLeafs => {
                const currentIds = new Set(currentLeafs.map(p => p.id));
                const updated = currentLeafs.map((leaf) => {
                  const fresh = data.assets.find((asset: any) => asset.id === leaf.id);
                  return fresh ? { ...leaf, scanStatus: fresh.scanStatus } : leaf;
                });
                const newLeafs = data.assets.filter((a: any) => !a.isRoot && !currentIds.has(a.id)).map((a: any) => ({
                   id: a.id, value: a.value, type: getAssetType(a.value), parentId: a.parentId, addedAt: new Date(a.createdAt).toISOString(), scanStatus: a.scanStatus
                }));
                if (newLeafs.length > 0) return [...updated, ...newLeafs];
                return updated;
             });
          }
        })
        .catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [org.id]);

  // === Filtered lists ===
  const filteredRoot = rootAssets.filter((a) =>
    a.value.toLowerCase().includes(rootSearch.toLowerCase())
  );
  const filteredLeaf = leafAssets.filter((a) =>
    a.value.toLowerCase().includes(leafSearch.toLowerCase())
  );

  // === Render Asset Row (Root) ===
  const renderRootAssetRow = (asset: typeof rootAssets[0]) => {
    const Icon = getAssetIcon(asset.type);
    const isDnsExpired = asset.scanStatus === "expired";
    return (
      <div
        key={asset.id}
        className="group flex items-center justify-between px-4 py-2.5 hover:bg-[#fdf8f0]/60 transition-colors border-b border-amber-500/5 last:border-b-0"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            asset.type === "domain" 
              ? "bg-emerald-50 text-emerald-600" 
              : "bg-blue-50 text-blue-600"
          }`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#3d200a] truncate">{asset.value}</p>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${
                asset.type === "domain" ? "text-emerald-500" : "text-blue-500"
              }`}>
                {asset.type}
              </span>
              {asset.subdomains.length > 0 && (
                <span className="text-[9px] font-bold text-[#8a5d33]/50">
                  {asset.subdomains.length} sub{asset.subdomains.length > 1 ? "s" : ""}
                </span>
              )}
              {isDnsExpired && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-red-600">
                  DNS Expired
                </span>
              )}
              {asset.statusMessage && (
                <span className="text-[9px] font-bold text-[#8B0000] animate-pulse max-w-[120px] truncate">
                  {asset.statusMessage}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Scan Button */}
          {asset.type === "domain" && isAdmin && (
            <button
              onClick={(e) => handleScanSubdomains(asset.id, e)}
              disabled={asset.scanning || discoverQueue.includes(asset.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold text-[#8B0000] bg-[#8B0000]/5 border border-[#8B0000]/15 rounded-lg hover:bg-[#8B0000]/10 transition-colors disabled:opacity-50 cursor-pointer"
              title="Discover subdomains"
            >
              {asset.scanning || discoverQueue.includes(asset.id) ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Radar className="w-3 h-3" />
              )}
              {asset.scanning ? "Scanning…" : discoverQueue.includes(asset.id) ? "Queued" : "Discover"}
            </button>
          )}

          {/* Remove */}
          {isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); handleRemoveRoot(asset.id); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
              title="Remove asset"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // === Render Asset Row (Leaf) ===
  const renderLeafAssetRow = (asset: typeof leafAssets[0]) => {
    const Icon = getAssetIcon(asset.type);
    const parent = rootAssets.find((r) => r.id === asset.parentId);
    const isDnsExpired = asset.scanStatus === "expired";
    return (
      <div
        key={asset.id}
        className="group flex items-center justify-between px-4 py-2.5 hover:bg-[#fdf8f0]/60 transition-colors border-b border-amber-500/5 last:border-b-0"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            asset.type === "domain"
              ? "bg-teal-50 text-teal-600"
              : "bg-indigo-50 text-indigo-600"
          }`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#3d200a] truncate">{asset.value}</p>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${
                asset.type === "domain" ? "text-teal-500" : "text-indigo-500"
              }`}>
                {asset.type}
              </span>
              {parent && (
                <span className="text-[9px] text-[#8a5d33]/40 flex items-center gap-0.5">
                  <ChevronRight className="w-2.5 h-2.5" />
                  {parent.value}
                </span>
              )}
              {isDnsExpired && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-red-600">
                  DNS Expired
                </span>
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={(e) => { e.stopPropagation(); handleRemoveLeaf(asset.id); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
            title="Remove asset"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  const rootCount = rootAssets.length;
  const leafCount = leafAssets.length;

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════
  return (
    <>
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* ─── ROOT ASSETS PANEL ─── */}
        <SectionCard
          title="Root Assets"
          icon={Globe}
          badge={<CountBadge count={rootCount} />}
          onExpand={() => setExpandedSection("root")}
          className="flex-1 min-h-0"
        >
          <div className="flex flex-col h-full">
            {/* Input bar */}
            {isAdmin && (
              <InputBar
                value={rootInput}
                onChange={setRootInput}
                onSubmit={handleAddRootAsset}
                placeholder="example.com or 192.168.1.1"
                infoText="Add root-level domains or IP addresses to monitor. These are your primary attack surface entry points."
              />
            )}

            {/* Search (when there are assets) */}
            {rootCount > 3 && (
              <div className="px-4 pb-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8a5d33]/30" />
                  <input
                    type="text"
                    value={rootSearch}
                    onChange={(e) => setRootSearch(e.target.value)}
                    placeholder="Filter assets…"
                    className="w-full bg-amber-50/50 border border-amber-500/15 rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#3d200a] placeholder:text-[#8a5d33]/30 focus:outline-none focus:ring-1 focus:ring-[#8B0000]/30 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Asset list */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {filteredRoot.length === 0 ? (
                <EmptyState
                  icon={Globe}
                  text="No root assets"
                  sub="Add domains or IP addresses to start mapping your attack surface."
                />
              ) : (
                filteredRoot.map(renderRootAssetRow)
              )}
            </div>

            {/* Discover All Bottom Bar */}
            {isAdmin && rootAssets.length > 0 && (
              <div className="shrink-0 p-4 border-t border-amber-500/10 bg-[#fdf8f0] flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const domains = rootAssets.filter(a => a.type === "domain" && !a.scanning && !discoverQueue.includes(a.id));
                    domains.forEach(a => handleScanSubdomains(a.id));
                  }}
                  className="w-full py-2.5 bg-[#8B0000] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#730000] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Radar className="w-4 h-4" />
                  Discover All
                </button>
                <div className="text-[9px] text-[#8a5d33]/60 font-semibold flex items-center gap-2 uppercase tracking-wider h-6">
                  <Clock className="w-2.5 h-2.5" />
                  Last full discovery: Never
                  {(rootAssets.filter(a => a.scanning).length > 0 || discoverQueue.length > 0) && (
                    <span className="ml-2 px-2 py-0.5 rounded bg-[#8B0000]/10 text-[#8B0000] font-bold flex items-center gap-1">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      {rootAssets.filter(a => a.scanning).length} Active | {discoverQueue.length} Queued
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ─── LEAF ASSETS PANEL ─── */}
        <SectionCard
          title="Leaf Assets"
          icon={Network}
          badge={<CountBadge count={leafCount} />}
          onExpand={() => setExpandedSection("leaf")}
          className="flex-1 min-h-0"
        >
          <div className="flex flex-col h-full">
            {/* Input bar */}
            {isAdmin && (
              <InputBar
                value={leafInput}
                onChange={setLeafInput}
                onSubmit={handleAddLeafAsset}
                placeholder="sub.example.com or 10.0.0.1"
                infoText="Add specific subdomains or IPs discovered through recon or manual enumeration."
              />
            )}

            {/* Search */}
            {leafCount > 3 && (
              <div className="px-4 pb-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8a5d33]/30" />
                  <input
                    type="text"
                    value={leafSearch}
                    onChange={(e) => setLeafSearch(e.target.value)}
                    placeholder="Filter assets…"
                    className="w-full bg-amber-50/50 border border-amber-500/15 rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#3d200a] placeholder:text-[#8a5d33]/30 focus:outline-none focus:ring-1 focus:ring-[#8B0000]/30 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Asset list */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {filteredLeaf.length === 0 ? (
                <EmptyState
                  icon={Leaf}
                  text="No leaf assets"
                  sub="Scan root domains for subdomains or add them manually."
                />
              ) : (
                filteredLeaf.map(renderLeafAssetRow)
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ─── EXPANDED MODALS ─── */}
      <ExpandModal
        open={expandedSection === "root"}
        onClose={() => setExpandedSection(null)}
        title="Root Assets"
        icon={Globe}
        badge={<CountBadge count={rootCount} />}
      >
        <div className="flex flex-col h-full">
          {isAdmin && (
            <InputBar
              value={rootInput}
              onChange={setRootInput}
              onSubmit={handleAddRootAsset}
              placeholder="example.com or 192.168.1.1"
              infoText="Add root-level domains or IP addresses to monitor."
            />
          )}
          <div className="flex-1 overflow-y-auto min-h-0">
            {filteredRoot.length === 0 ? (
              <EmptyState icon={Globe} text="No root assets" sub="Add domains or IPs to get started." />
            ) : (
              filteredRoot.map(renderRootAssetRow)
            )}
          </div>
          {isAdmin && rootAssets.length > 0 && (
            <div className="shrink-0 p-4 border-t border-amber-500/10 bg-[#fdf8f0] flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const domains = rootAssets.filter(a => a.type === "domain" && !a.scanning);
                  domains.forEach(a => handleScanSubdomains(a.id));
                }}
                className="w-full max-w-sm py-2.5 bg-[#8B0000] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#730000] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Radar className="w-4 h-4" />
                Discover All
              </button>
              <div className="text-[9px] text-[#8a5d33]/60 font-semibold flex items-center gap-1 uppercase tracking-wider">
                <Clock className="w-2.5 h-2.5" />
                Last full discovery: Never
              </div>
            </div>
          )}
        </div>
      </ExpandModal>

      <ExpandModal
        open={expandedSection === "leaf"}
        onClose={() => setExpandedSection(null)}
        title="Leaf Assets"
        icon={Network}
        badge={<CountBadge count={leafCount} />}
      >
        <div className="flex flex-col h-full">
          {isAdmin && (
            <InputBar
              value={leafInput}
              onChange={setLeafInput}
              onSubmit={handleAddLeafAsset}
              placeholder="sub.example.com or 10.0.0.1"
              infoText="Add specific subdomains or IPs discovered through recon."
            />
          )}
          <div className="flex-1 overflow-y-auto min-h-0">
            {filteredLeaf.length === 0 ? (
              <EmptyState icon={Leaf} text="No leaf assets" sub="Scan root domains or add subdomains manually." />
            ) : (
              filteredLeaf.map(renderLeafAssetRow)
            )}
          </div>
        </div>
      </ExpandModal>
    </>
  );
}
