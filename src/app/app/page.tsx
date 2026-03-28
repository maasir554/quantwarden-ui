"use client";

import { useSession } from "@/lib/auth-client";
import {
  Shield,
  Radar,
  FileKey,
  Building2,
  ShieldCheck,
  ArrowRight,
  Loader2
} from "lucide-react";
import Link from "next/link";

export default function AppDashboard() {
  const { data: sessionData, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[#8B0000]" />
      </div>
    );
  }

  const userName = sessionData?.user?.name ?? "there";

  const quickActions = [
    {
      icon: <Radar className="w-6 h-6" />,
      title: "Run a Scan",
      desc: "Discover subdomains, open ports, and cryptographic assets tied to a domain.",
      href: "/app",
      color: "bg-[#8B0000]"
    },
    {
      icon: <FileKey className="w-6 h-6" />,
      title: "View CBOM",
      desc: "Inspect your Cryptographic Bill of Materials and compliance readiness.",
      href: "/app",
      color: "bg-amber-600"
    },
    {
      icon: <Building2 className="w-6 h-6" />,
      title: "Organization",
      desc: "Create or manage your enterprise organization and member access.",
      href: "/app",
      color: "bg-[#5f3512]"
    },
    {
      icon: <ShieldCheck className="w-6 h-6" />,
      title: "Safety Report",
      desc: "Review encryption grading, key analysis, and PQC algorithm coverage.",
      href: "/app",
      color: "bg-emerald-700"
    }
  ];

  return (
    <div className="space-y-10">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-[#8B0000] p-8 md:p-12 shadow-xl shadow-[#8B0000]/10">
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
            backgroundSize: "32px 32px"
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-white/80" />
            <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Dashboard</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">
            Welcome back, {userName}
          </h1>
          <p className="text-white/70 text-base md:text-lg font-medium max-w-2xl">
            Your quantum-proof security command centre. Monitor assets, generate compliance reports, and manage your team from one place.
          </p>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-xl font-extrabold text-[#3d200a] mb-5 tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {quickActions.map((action, idx) => (
            <Link
              key={idx}
              href={action.href}
              className="group bg-white border border-amber-500/20 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-amber-500/40 hover:-translate-y-1 transition-all"
            >
              <div className={`${action.color} w-12 h-12 rounded-xl flex items-center justify-center text-white mb-5 shadow-md group-hover:scale-110 transition-transform`}>
                {action.icon}
              </div>
              <h3 className="text-base font-bold text-[#3d200a] mb-1.5">{action.title}</h3>
              <p className="text-sm text-[#8a5d33] leading-relaxed mb-4">{action.desc}</p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#8B0000] uppercase tracking-wider group-hover:gap-2 transition-all">
                Open <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Preview (placeholder) */}
      <div>
        <h2 className="text-xl font-extrabold text-[#3d200a] mb-5 tracking-tight">Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { label: "Domains Scanned", value: "—", sub: "Get started by running your first scan" },
            { label: "CBOM Entries", value: "—", sub: "Generate your first Cryptographic Bill of Materials" },
            { label: "Team Members", value: "1", sub: "You are the sole member" },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-white border border-amber-500/20 rounded-2xl p-6 shadow-sm"
            >
              <p className="text-xs font-bold text-[#8a5d33] uppercase tracking-wider mb-2">{stat.label}</p>
              <p className="text-4xl font-black text-[#3d200a] tracking-tight mb-1">{stat.value}</p>
              <p className="text-sm text-[#8a5d33]">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
