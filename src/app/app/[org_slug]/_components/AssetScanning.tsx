"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
  Clock,
  Lock,
  Calendar,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { parseOpenSSLScanResult } from "@/lib/openssl-scan";
import { useScanActivity } from "@/components/scan-activity-provider";

interface AssetScanningProps {
  org: any;
  isAdmin: boolean;
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
  scanStatus?: string | null;
  latestScan: ScanData | null;
}

export default function AssetScanning({ org, isAdmin }: AssetScanningProps) {
  const [assets, setAssets] = useState<ScandAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "successful" | "failed" | "unscanned">("all");
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const {
    hydrated,
    stateVersion,
    runningTasks,
    queuedTasks,
    fullScan,
    isFullScanActive,
    queueAssetScan,
    queueFullScan,
  } = useScanActivity(org.id);

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

  useEffect(() => {
    if (!hydrated) return;
    fetchAssets();
  }, [hydrated, stateVersion, fetchAssets]);

  useEffect(() => {
    if (!hydrated || (runningTasks.length === 0 && queuedTasks.length === 0)) return;
    const interval = window.setInterval(() => {
      void fetchAssets();
    }, 4000);
    return () => window.clearInterval(interval);
  }, [fetchAssets, hydrated, queuedTasks.length, runningTasks.length]);

  const handleScan = (assetId: string) => {
    const asset = assets.find((item) => item.id === assetId);
    if (!asset) return;
    queueAssetScan({
      orgId: org.id,
      orgSlug: org.slug,
      assetId,
      assetValue: asset.value,
    });
  };

  const handleScanAll = () => {
    const scanableAssets = assets
      .filter((a) => a.type === "domain")
      .filter((a) => !a.latestScan || a.latestScan.status !== "pending")
      .map((a) => ({ id: a.id, value: a.value }));

    queueFullScan({
      orgId: org.id,
      orgSlug: org.slug,
      assets: scanableAssets,
    });
  };

  const activeTaskByAsset = new Map(
    [...runningTasks, ...queuedTasks].map((task) => [task.assetId, task])
  );

  const domainAssets = assets.filter(a => a.type === "domain");
  const totalDiscovered = domainAssets.length;
  const unscanned = domainAssets.filter(a => !a.latestScan && !activeTaskByAsset.has(a.id)).length;
  const scanFailed = domainAssets.filter((asset) => asset.latestScan?.status === "failed").length;
  const scanSuccessful = domainAssets.filter((asset) => asset.latestScan?.status === "completed").length;

  let filteredAssets = domainAssets.filter(
    (a) => a.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (filterType === "successful") {
    filteredAssets = filteredAssets.filter((asset) => asset.latestScan?.status === "completed");
  } else if (filterType === "failed") {
    filteredAssets = filteredAssets.filter((asset) => asset.latestScan?.status === "failed");
  } else if (filterType === "unscanned") {
    filteredAssets = filteredAssets.filter((asset) => !asset.latestScan && !activeTaskByAsset.has(asset.id));
  }

  const renderScanDetails = (scan: ScanData) => {
    if (scan.status === "pending") {
      return (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
          <p className="text-sm font-semibold text-amber-700">OpenSSL TLS scan currently running...</p>
        </div>
      );
    }

    if (scan.status === "failed") {
      let errMsg = "Scan failed to execute.";
      if (scan.resultData) {
        try {
          const parsed = JSON.parse(scan.resultData);
          if (parsed.detail) errMsg = parsed.detail;
          else if (parsed.error) errMsg = parsed.error;
          else if (typeof parsed === "string") errMsg = parsed;
        } catch (e) {}
      }

      return (
        <div className="p-4 bg-red-50/80 rounded-xl border border-red-200/50 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm font-semibold text-red-700 font-mono tracking-tight">{errMsg}</p>
        </div>
      );
    }

    if (!scan.resultData) return null;

    const parsed = parseOpenSSLScanResult(scan.resultData);

    if (parsed.error) {
      return (
        <div className="p-4 bg-red-50 rounded-xl border border-red-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <p className="text-sm font-semibold text-red-700">{parsed.error}</p>
        </div>
      );
    }

    if (!parsed.raw || !parsed.summary) {
      return <p className="text-sm text-red-500">Stored scan payload is missing OpenSSL profile data.</p>;
    }

    const payload = parsed.raw;
    const summary = parsed.summary;
    const sans = payload.certificate.san_dns || [];
    const activeProbe =
      payload.tls_versions.find(
        (probe) => probe.supported && (probe.negotiated_protocol || probe.tls_version) === summary.primaryTlsVersion
      ) ||
      payload.tls_versions.find((probe) => probe.supported) ||
      null;

    const Item = ({ label, icon: Icon, value, colorClass, title, children }: any) => (
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-[#8a5d33]/50 uppercase tracking-widest">{label}</p>
        <div className="flex items-center gap-2 group relative">
          <Icon className={`w-5 h-5 ${colorClass}`} />
          <div className="text-sm font-bold text-[#3d200a] truncate flex-1" title={title}>
            {value}
            {children}
          </div>
        </div>
      </div>
    );

    const chipClass = "px-2.5 py-1 rounded-full bg-white border border-amber-200 text-[11px] font-bold text-[#3d200a]";

    return (
      <div className="p-5 bg-white rounded-xl border border-[#8a5d33]/10 shadow-sm space-y-6">
        {/* Core Vitals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Item 
            label="Certificate Validity" 
            icon={summary.certificateValid === false ? AlertTriangle : CheckCircle2} 
            colorClass={summary.certificateValid === false ? "text-red-500" : "text-emerald-500"} 
            value={summary.certificateValid === false ? "Invalid" : "Valid"} 
          />
          <Item 
            label="TLS Protocol" 
            icon={Lock} 
            colorClass="text-blue-500" 
            value={summary.primaryTlsVersion || "Unknown"} 
          />
          <Item 
            label="Expiry" 
            icon={Calendar} 
            colorClass={summary.daysRemaining !== null && summary.daysRemaining > 30 ? "text-emerald-500" : "text-amber-500"} 
            value={summary.daysRemaining !== null ? `${summary.daysRemaining} days` : "Unknown"} 
          />
          <Item 
            label="Preferred Cipher" 
            icon={ShieldCheck} 
            colorClass={summary.strongCipher === false ? "text-amber-500" : "text-emerald-500"} 
            title={summary.preferredCipher || undefined}
            value={summary.preferredCipher || "Unknown"} 
          />
        </div>

        <div className="h-px w-full bg-[#8a5d33]/5"></div>

        {/* Identity & Trust */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Item 
            label="Subject (Common Name)" 
            icon={Globe} 
            colorClass="text-indigo-500" 
            title={summary.subjectCommonName || undefined}
            value={summary.subjectCommonName || "Unknown"} 
          />
          <Item 
            label="Issuer Authority" 
            icon={Server} 
            colorClass="text-indigo-500" 
            title={summary.issuerCommonName || undefined}
            value={summary.issuerCommonName || "Unknown"} 
          />
          <Item 
            label="Subject Alt Names" 
            icon={Globe} 
            colorClass="text-blue-500" 
            value={`${sans.length} domains`} 
          >
            {sans.length > 0 && (
              <div className="absolute z-50 top-full left-0 mt-2 hidden group-hover:block w-72 bg-[#3d200a] text-white text-xs p-3 rounded-xl shadow-xl max-h-48 overflow-y-auto ring-1 ring-white/10 break-all leading-tight">
                {sans.map((s: string) => <div key={s} className="py-0.5 opacity-90">{s}</div>)}
              </div>
            )}
          </Item>
          <Item 
            label="Negotiated Group" 
            icon={Lock} 
            colorClass="text-indigo-500" 
            value={summary.negotiatedGroup || "Not reported"} 
          />
        </div>

        <div className="h-px w-full bg-[#8a5d33]/5"></div>

        {/* Cryptography */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Item 
            label="Public Key Size" 
            icon={summary.keySizeAdequate === false ? AlertTriangle : CheckCircle2} 
            colorClass={summary.keySizeAdequate === false ? "text-amber-500" : "text-emerald-500"} 
            value={summary.publicKeyAlgorithm && summary.publicKeyBits ? `${summary.publicKeyAlgorithm} (${summary.publicKeyBits} bits)` : "Unknown"} 
          />
          <Item 
            label="Signature Algorithm" 
            icon={Zap} 
            colorClass="text-blue-500" 
            value={summary.signatureAlgorithm || "Unknown"} 
          />
          <Item 
            label="Strong Cipher" 
            icon={summary.strongCipher === false ? AlertTriangle : CheckCircle2} 
            colorClass={summary.strongCipher === false ? "text-amber-500" : "text-emerald-500"} 
            value={summary.strongCipher === false ? "No" : "Yes"} 
          />
          <Item 
            label="TLS Downgrade Safe" 
            icon={summary.tlsVersionSecure === false ? AlertTriangle : CheckCircle2} 
            colorClass={summary.tlsVersionSecure === false ? "text-amber-500" : "text-emerald-500"} 
            value={summary.tlsVersionSecure === false ? "Weak TLS allowed" : "Yes"} 
          />
        </div>

        <div className="h-px w-full bg-[#8a5d33]/5"></div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-amber-200/70 bg-[#fdf8f0]/70 p-4 space-y-3">
            <p className="text-[10px] font-bold text-[#8a5d33]/60 uppercase tracking-widest">Supported TLS Versions</p>
            <div className="flex flex-wrap gap-2">
              {summary.supportedTlsVersions.length > 0 ? (
                summary.supportedTlsVersions.map((version) => (
                  <span key={version} className={chipClass}>{version}</span>
                ))
              ) : (
                <span className="text-sm font-semibold text-[#8a5d33]/60">No supported versions reported</span>
              )}
            </div>
            <p className="text-[10px] font-bold text-[#8a5d33]/60 uppercase tracking-widest pt-2">Active Version Cipher Order</p>
            <div className="space-y-2">
              {activeProbe?.accepted_ciphers_in_client_offer_order?.length ? (
                activeProbe.accepted_ciphers_in_client_offer_order.slice(0, 6).map((cipher, index) => (
                  <div key={cipher} className="flex items-center gap-3 text-sm font-semibold text-[#3d200a]">
                    <span className="w-6 h-6 rounded-full bg-white border border-amber-200 flex items-center justify-center text-[11px] font-extrabold text-[#8B0000]">{index + 1}</span>
                    <span className="break-all">{cipher}</span>
                  </div>
                ))
              ) : (
                <span className="text-sm font-semibold text-[#8a5d33]/60">No per-version cipher order reported</span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200/70 bg-[#fdf8f0]/70 p-4 space-y-3">
            <p className="text-[10px] font-bold text-[#8a5d33]/60 uppercase tracking-widest">Key Exchange & Groups</p>
            <div className="flex flex-wrap gap-2">
              {summary.keyExchangeAlgorithms.length > 0 ? (
                summary.keyExchangeAlgorithms.map((algorithm) => (
                  <span key={algorithm} className={chipClass}>{algorithm}</span>
                ))
              ) : (
                <span className="text-sm font-semibold text-[#8a5d33]/60">No key exchange algorithms reported</span>
              )}
            </div>
            <p className="text-[10px] font-bold text-[#8a5d33]/60 uppercase tracking-widest pt-2">Queried Groups</p>
            <div className="flex flex-wrap gap-2">
              {summary.queriedGroups.length > 0 ? (
                summary.queriedGroups.map((group) => (
                  <span key={group} className={chipClass}>{group}</span>
                ))
              ) : (
                <span className="text-sm font-semibold text-[#8a5d33]/60">No queried groups reported</span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200/70 bg-[#fdf8f0]/70 p-4 space-y-3">
            <p className="text-[10px] font-bold text-[#8a5d33]/60 uppercase tracking-widest">Supported Groups</p>
            <div className="flex flex-wrap gap-2">
              {summary.supportedGroups.length > 0 ? (
                summary.supportedGroups.map((group) => (
                  <span key={group} className={chipClass}>{group}</span>
                ))
              ) : (
                <span className="text-sm font-semibold text-[#8a5d33]/60">No supported groups reported</span>
              )}
            </div>
            <p className="text-[10px] font-bold text-[#8a5d33]/60 uppercase tracking-widest pt-2">Global Cipher Preference</p>
            <div className="space-y-2">
              {summary.cipherPreferenceOrder.length > 0 ? (
                summary.cipherPreferenceOrder.slice(0, 8).map((cipher, index) => (
                  <div key={cipher} className="flex items-center gap-3 text-sm font-semibold text-[#3d200a]">
                    <span className="w-6 h-6 rounded-full bg-white border border-amber-200 flex items-center justify-center text-[11px] font-extrabold text-[#8B0000]">{index + 1}</span>
                    <span className="break-all">{cipher}</span>
                  </div>
                ))
              ) : (
                <span className="text-sm font-semibold text-[#8a5d33]/60">No cipher preference data reported</span>
              )}
            </div>
          </div>
        </div>

        {summary.warnings.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[10px] font-bold text-amber-800/60 uppercase tracking-widest mb-3">Analysis Warnings</p>
            <div className="space-y-2">
              {summary.warnings.map((warning) => (
                <div key={warning} className="flex items-start gap-2 text-sm font-semibold text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white/40 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-amber-500/20">
      
      {/* Header */}
      <div className="p-6 sm:p-8 bg-linear-to-br from-white/80 to-white/40 border-b border-amber-500/10 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-[#8B0000] to-red-600 flex items-center justify-center shrink-0 shadow-lg shadow-red-900/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#3d200a] tracking-tight">OpenSSL TLS Scanning</h2>
              <p className="text-sm font-medium text-[#8a5d33]/80 mt-1 max-w-xl leading-relaxed">
                Deep-profile your domains with OpenSSL to inspect certificates, negotiated groups, and target cipher preference order.
              </p>
            </div>
          </div>
          
          {isAdmin && (
            <div className="flex flex-col items-end gap-2">
              <Link
                href={`/app/${org.slug}/explore`}
                className="flex items-center gap-2 px-4 py-2 bg-white/70 border border-[#8B0000]/20 text-[#8B0000] text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-white transition-colors"
              >
                Open Explorer
              </Link>
               <button
                  onClick={handleScanAll}
                  disabled={isFullScanActive}
                  className="flex items-center gap-2 px-6 py-2.5 bg-linear-to-r from-[#8B0000] to-[rgb(110,0,0)] text-white text-sm font-bold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none cursor-pointer"
               >
                  {isFullScanActive ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {isFullScanActive
                    ? `Full Scan Running (${runningTasks.length + queuedTasks.length} left)`
                    : "Scan All Domains"}
               </button>
               {fullScan && (
                 <p className="text-[11px] font-bold text-[#8a5d33]/65">
                   Batch started {formatDistanceToNow(new Date(fullScan.createdAt), { addSuffix: true })}
                 </p>
               )}
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-4 bg-white/40 border-b border-amber-500/10 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
        
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto px-1 sm:px-0 scrollbar-hide shrink-0">
          <button 
            onClick={() => setFilterType("all")}
            className={`flex flex-col items-center px-3 py-1.5 rounded-xl transition-all outline-none ${filterType === 'all' ? 'bg-[#8B0000]/5 ring-1 ring-[#8B0000]/20' : 'hover:bg-black/5'}`}
          >
            <span className="text-[9px] uppercase tracking-widest font-bold text-[#8a5d33]/50">Inventory</span>
            <span className="text-sm font-black text-[#3d200a]">{totalDiscovered}</span>
          </button>
          
          <div className="w-px h-6 bg-amber-500/20 hidden sm:block mx-1"></div>
          
          <button 
            onClick={() => setFilterType("successful")}
            className={`flex flex-col items-center px-3 py-1.5 rounded-xl transition-all outline-none ${filterType === 'successful' ? 'bg-emerald-500/10 ring-1 ring-emerald-500/20' : 'hover:bg-black/5'}`}
          >
            <span className="text-[9px] uppercase tracking-widest font-bold text-[#8a5d33]/50">Successful</span>
            <span className="text-sm font-black text-emerald-600">{scanSuccessful}</span>
          </button>
          
          <div className="w-px h-6 bg-amber-500/20 hidden sm:block mx-1"></div>
          
          <button 
            onClick={() => setFilterType("failed")}
            className={`flex flex-col items-center px-3 py-1.5 rounded-xl transition-all outline-none ${filterType === 'failed' ? 'bg-red-500/10 ring-1 ring-red-500/20' : 'hover:bg-black/5'}`}
          >
            <span className="text-[9px] uppercase tracking-widest font-bold text-[#8a5d33]/50">Failed</span>
            <span className="text-sm font-black text-red-600">{scanFailed}</span>
          </button>
          
          <div className="w-px h-6 bg-amber-500/20 hidden sm:block mx-1"></div>

          <button 
            onClick={() => setFilterType("unscanned")}
            className={`flex flex-col items-center px-3 py-1.5 rounded-xl transition-all outline-none ${filterType === 'unscanned' ? 'bg-amber-500/10 ring-1 ring-amber-500/20' : 'hover:bg-black/5'}`}
          >
            <span className="text-[9px] uppercase tracking-widest font-bold text-[#8a5d33]/50">Unscanned</span>
            <span className="text-sm font-black text-amber-600">{unscanned}</span>
          </button>
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
            const task = activeTaskByAsset.get(asset.id);
            const isQueued = task?.status === "queued";
            const isRunning = task?.status === "running" || asset.latestScan?.status === "pending" || asset.scanStatus === "scanning";
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
                               isQueued ? 'text-slate-500' :
                               isRunning ? 'text-amber-500 animate-pulse' :
                               asset.latestScan.status === 'completed' ? 'text-emerald-500' : 'text-red-500'
                             }`}>
                               {isQueued ? 'queued' : isRunning ? 'running' : asset.latestScan.status}
                             </span>
                             <span className="w-1 h-1 rounded-full bg-[#8a5d33]/20"></span>
                             <span className="text-[10px] font-bold text-[#8a5d33]/50">
                               {formatDistanceToNow(new Date((task?.createdAt || asset.latestScan.createdAt)), { addSuffix: true })}
                             </span>
                           </>
                        ) : (
                           <span className="text-[10px] font-bold text-[#8a5d33]/50 uppercase tracking-wider">
                             {isQueued ? "Queued" : isRunning ? "Running" : "Not Scanned Yet"}
                           </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-4 sm:mt-0">
                    <Link
                      href={`/app/${org.slug}/asset/${asset.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#8B0000] bg-white border border-[#8B0000]/20 rounded-lg hover:bg-[#8B0000]/5 transition-colors"
                    >
                      Details
                    </Link>
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
                        {isRunning ? 'Scanning' : isQueued ? 'Queued' : 'Scan TLS'}
                      </button>
                    )}
                    <button className="p-1.5 text-[#8a5d33]/40 hover:text-[#8a5d33] transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded State */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-amber-500/10 mt-2 bg-linear-to-b from-transparent to-[#fdf8f0]/40">
                     <div className="pt-4">
                       {isQueued ? (
                         <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                           <Clock className="w-5 h-5 text-slate-500 shrink-0" />
                           <p className="text-sm font-semibold text-slate-700">
                             This scan is queued and will start as soon as a worker slot becomes free.
                           </p>
                         </div>
                       ) : isRunning ? (
                         <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-3">
                           <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                           <div>
                             <p className="text-sm font-semibold text-amber-700">OpenSSL TLS scan currently running...</p>
                             {asset.latestScan?.status === "completed" && (
                               <p className="mt-1 text-xs font-semibold text-amber-700/80">
                                 Previous completed result remains available on the asset details page while this refresh runs.
                               </p>
                             )}
                           </div>
                         </div>
                       ) : asset.latestScan ? (
                         renderScanDetails(asset.latestScan)
                       ) : (
                         <div className="p-4 bg-white rounded-xl border border-amber-200/60">
                           <p className="text-sm font-semibold text-[#8a5d33]/70">
                             No completed scan is available yet for this asset.
                           </p>
                         </div>
                       )}
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
