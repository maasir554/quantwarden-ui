"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Loader2,
  ShieldCheck,
  Server,
  Globe,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Calendar,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AssetScanningProps {
  org: any;
  isAdmin: boolean;
}

interface SSLScanResult {
  security_analysis?: {
    certificate_valid: boolean;
    tls_version_secure: boolean;
    strong_cipher: boolean;
    warnings: string[];
  };
  certificate?: {
    issuer: { common_name: string };
    validity: { not_valid_after: string; days_remaining: number };
  };
  connection_info?: {
    protocol: { version: string };
  };
  error?: string;
}

interface ScanData {
  id: string;
  type: string;
  status: "pending" | "completed" | "failed";
  resultData: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface ScandAsset {
  id: string;
  value: string;
  type: string;
  isRoot: boolean;
  parentId: string | null;
  latestScan: ScanData | null;
}

export default function AssetScanning({ org, isAdmin }: AssetScanningProps) {
  const [assets, setAssets] = useState<ScandAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [scanQueue, setScanQueue] = useState<string[]>([]);
  const [activeScans, setActiveScans] = useState<number>(0);
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch(`/api/orgs/scans?orgId=${org.id}`);
      const data = await res.json();
      if (data.assets) {
        setAssets(data.assets);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [org.id]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Concurrent Execution Queue for Scans
  useEffect(() => {
    if (scanQueue.length > 0 && activeScans < 3) { // Process 3 concurrently
      const nextAssetId = scanQueue[0];
      setScanQueue((q) => q.slice(1));
      setActiveScans((count) => count + 1);

      // Pre-emptively update UI
      setAssets(prev => prev.map(a => a.id === nextAssetId ? {
        ...a, latestScan: { id: "temp", type: "pyssl", status: "pending", resultData: null, createdAt: new Date().toISOString(), completedAt: null }
      } : a));

      fetch("/api/orgs/scans/pyssl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: nextAssetId, orgId: org.id }),
      })
        .then(() => {
          // Re-fetch to get real db record
          fetchAssets();
        })
        .catch(() => {})
        .finally(() => {
          setActiveScans((count) => count - 1);
        });
    }
  }, [scanQueue, activeScans, org.id, fetchAssets]);

  const handleScan = (assetId: string) => {
    if (!scanQueue.includes(assetId)) {
      setScanQueue((q) => [...q, assetId]);
    }
  };

  const handleScanAll = () => {
    const ids = assets
      .filter((a) => a.type === "domain")
      .filter((a) => !a.latestScan || a.latestScan.status !== "pending")
      .map((a) => a.id);
    
    // Add unique ones to queue
    setScanQueue(prev => Array.from(new Set([...prev, ...ids])));
  };

  const filteredAssets = assets.filter(
    (a) => a.type === "domain" && a.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderScanDetails = (scan: ScanData) => {
    if (scan.status === "pending") {
      return (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
          <p className="text-sm font-semibold text-amber-700">SSL Scan currently running...</p>
        </div>
      );
    }

    if (scan.status === "failed") {
      return (
        <div className="p-4 bg-red-50 rounded-xl border border-red-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <p className="text-sm font-semibold text-red-700">Scan failed to execute.</p>
        </div>
      );
    }

    if (!scan.resultData) return null;

    let parsed: SSLScanResult;
    try {
      parsed = JSON.parse(scan.resultData);
    } catch {
      return <p className="text-sm text-red-500">Failed to parse JSON output.</p>;
    }

    if (parsed.error) {
      return (
        <div className="p-4 bg-red-50 rounded-xl border border-red-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <p className="text-sm font-semibold text-red-700">{parsed.error}</p>
        </div>
      );
    }

    const sa = parsed.security_analysis;
    const cert = parsed.certificate;
    const conn = parsed.connection_info;

    return (
      <div className="p-5 bg-white rounded-xl border border-[#8a5d33]/10 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Validation */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-[#8a5d33]/50 uppercase tracking-widest">Certificate Validity</p>
          <div className="flex items-center gap-2">
            {sa?.certificate_valid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm font-bold text-[#3d200a]">
              {sa?.certificate_valid ? "Valid" : "Invalid"}
            </span>
          </div>
        </div>

        {/* TLS Version */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-[#8a5d33]/50 uppercase tracking-widest">TLS Protocol</p>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-bold text-[#3d200a]">
              {conn?.protocol?.version || "Unknown"}
            </span>
          </div>
        </div>

        {/* Days Remaining */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-[#8a5d33]/50 uppercase tracking-widest">Expiry</p>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-bold text-[#3d200a]">
              {cert?.validity?.days_remaining ? `${cert.validity.days_remaining} days` : "Unknown"}
            </span>
          </div>
        </div>

        {/* Issuer */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-[#8a5d33]/50 uppercase tracking-widest">Issuer</p>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" />
            <span className="text-sm font-bold text-[#3d200a] truncate" title={cert?.issuer?.common_name}>
              {cert?.issuer?.common_name || "Unknown"}
            </span>
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white/40 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-amber-500/20">
      
      {/* Header */}
      <div className="p-6 sm:p-8 bg-gradient-to-br from-white/80 to-white/40 border-b border-amber-500/10 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8B0000] to-red-600 flex items-center justify-center shrink-0 shadow-lg shadow-red-900/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#3d200a] tracking-tight">SSL / TLS Scanning</h2>
              <p className="text-sm font-medium text-[#8a5d33]/80 mt-1 max-w-xl leading-relaxed">
                Analyze and monitor cryptographic certificates and TLS connection security across your domains.
              </p>
            </div>
          </div>
          
          {isAdmin && (
            <div className="flex flex-col items-end gap-2">
               <button
                  onClick={handleScanAll}
                  disabled={scanQueue.length > 0 || activeScans > 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#8B0000] to-[rgb(110,0,0)] text-white text-sm font-bold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none cursor-pointer"
               >
                  {scanQueue.length > 0 || activeScans > 0 ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {scanQueue.length > 0 || activeScans > 0 ? `Scanning (${scanQueue.length + activeScans} left)` : "Scan All Domains"}
               </button>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-4 bg-white/40 border-b border-amber-500/10 shrink-0 flex items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a5d33]/40" />
          <input
            type="text"
            placeholder="Search domains..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/50 border border-amber-500/20 rounded-xl text-sm font-medium text-[#3d200a] placeholder:text-[#8a5d33]/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
          />
        </div>
        <div className="text-xs font-bold text-[#8a5d33]/60 uppercase tracking-widest">
          {filteredAssets.length} Domains
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-[#8B0000] animate-spin" />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-12">
            <ShieldCheck className="w-12 h-12 text-[#8a5d33]/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[#3d200a]">No domains found</h3>
            <p className="text-sm text-[#8a5d33]/60 mt-1">
              Add domain assets in the Asset Management tab to scan them here.
            </p>
          </div>
        ) : (
          filteredAssets.map((asset) => {
            const isQueued = scanQueue.includes(asset.id);
            const isRunning = asset.latestScan?.status === "pending";
            const isExpanded = expandedAssetId === asset.id;

            return (
              <div key={asset.id} className="bg-white/60 rounded-xl border border-amber-500/10 transition-all hover:bg-white/80 overflow-hidden shadow-sm">
                <div 
                   className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer"
                   onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                      <Globe className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-[#3d200a] leading-tight flex items-center gap-2">
                         {asset.value}
                         {asset.isRoot ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] uppercase tracking-widest leading-none">Root</span>
                         ) : (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] uppercase tracking-widest leading-none">Leaf</span>
                         )}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {asset.latestScan ? (
                           <>
                             <span className={`text-[10px] font-bold uppercase tracking-wider ${
                               asset.latestScan.status === 'completed' ? 'text-emerald-500' :
                               asset.latestScan.status === 'pending' ? 'text-amber-500 animate-pulse' : 'text-red-500'
                             }`}>
                               {asset.latestScan.status}
                             </span>
                             <span className="w-1 h-1 rounded-full bg-[#8a5d33]/20"></span>
                             <span className="text-[10px] font-bold text-[#8a5d33]/50">
                               {formatDistanceToNow(new Date(asset.latestScan.createdAt), { addSuffix: true })}
                             </span>
                           </>
                        ) : (
                           <span className="text-[10px] font-bold text-[#8a5d33]/50 uppercase tracking-wider">Not Scanned Yet</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-4 sm:mt-0">
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleScan(asset.id); }}
                        disabled={isQueued || isRunning}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#8B0000] bg-[#8B0000]/5 border border-[#8B0000]/15 rounded-lg hover:bg-[#8B0000]/10 transition-colors disabled:opacity-50"
                      >
                        {isQueued || isRunning ? (
                           <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                           <Zap className="w-3.5 h-3.5" />
                        )}
                        {isRunning ? 'Scanning' : isQueued ? 'Queued' : 'Scan SSL'}
                      </button>
                    )}
                    <button className="p-1.5 text-[#8a5d33]/40 hover:text-[#8a5d33] transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded State */}
                {isExpanded && asset.latestScan && (
                  <div className="p-4 pt-0 border-t border-amber-500/10 mt-2 bg-gradient-to-b from-transparent to-[#fdf8f0]/40">
                     <div className="pt-4">
                       {renderScanDetails(asset.latestScan)}
                     </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
