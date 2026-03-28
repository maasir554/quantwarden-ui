"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import {
  Shield,
  Users,
  Building2,
  ChevronRight,
  FileKey,
  Radar,
  ShieldCheck,
  Clock,
  Key,
  ArrowRight,
  LayoutDashboard
} from "lucide-react";

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { data: sessionData } = useSession();
  const isLoggedIn = !!sessionData?.session;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: <FileKey className="w-6 h-6 text-[#8B0000]" />,
      title: "CertIn-CBOM",
      desc: "Maintain a Cryptographic Bill of Materials for your organization as advised by Cert-In (Indian Computer Emergency Response Team) national nodal agency."
    },
    {
      icon: <Radar className="w-6 h-6 text-[#8B0000]" />,
      title: "Scan for Assets",
      desc: "Automatically discover subdomains and open ports tied securely to your root domain without manual intervention."
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-[#8B0000]" />,
      title: "Encryption Safety Analysis",
      desc: "Receive actionable safety scores, detect post-quantum cryptography algorithms, grade key sizes, and more."
    },
    {
      icon: <Clock className="w-6 h-6 text-[#8B0000]" />,
      title: "Scheduled Scans",
      desc: "Automate continuous monitoring over regular intervals to keep your security posture completely up to date."
    },
    {
      icon: <Key className="w-6 h-6 text-[#8B0000]" />,
      title: "Role-Based Access",
      desc: "Delegate tight governance and custom roles, strictly controlled by individual enterprise administrators."
    },
    {
      icon: <Building2 className="w-6 h-6 text-[#8B0000]" />,
      title: "Join or Create Entities",
      desc: "Login and configure your own enterprise organization, or join an existing one instantly via secure invite link or code."
    }
  ];

  return (
    <div className="relative min-h-screen text-slate-900 font-sans selection:bg-[#8B0000] selection:text-white">
      {/* Background with theme-aligned gradient */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[-1] bg-[linear-gradient(160deg,#ffffff_0%,#fffcf5_35%,#fdf1df_65%,#fae3b9_100%)] opacity-100"
      />

      {/* Sticky Navigation Bar */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent ${isScrolled
          ? "py-3 bg-[#fff7e6]/95 backdrop-blur-md shadow-sm border-[#8B0000]/10"
          : "py-6 bg-transparent"
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-12 flex items-center justify-between">

          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-[#8B0000]" strokeWidth={2} />
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isScrolled ? "max-w-[200px] opacity-100" : "max-w-0 opacity-0"}`}>
              <span className="text-xl font-extrabold text-[#5f3512] tracking-tight whitespace-nowrap">
                Quant<span className="text-[#8B0000]">Warden</span>
              </span>
            </div>
          </div>

          <div>
            {isLoggedIn ? (
              <Link
                href="/app"
                className="group flex items-center gap-2 px-6 py-2.5 bg-[#8B0000] text-white text-sm font-semibold rounded-full hover:bg-[#730000] shadow-md shadow-[#8B0000]/20 transition-all"
              >
                <LayoutDashboard className="w-4 h-4" /> Open App
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-6 py-2.5 bg-[#8B0000] text-white text-sm font-semibold rounded-full hover:bg-[#730000] shadow-md shadow-[#8B0000]/20 transition-all"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-0 scroll-smooth">

        {/* Hero Section Wrapper */}
        <div className="relative w-full">
          {/* Subtle Bottom-Left Grid */}
          <div
            className="absolute bottom-0 left-0 w-[40vw] h-[28rem] opacity-30 pointer-events-none hidden md:block"
            style={{
              backgroundImage: "linear-gradient(#8B0000 1px, transparent 1px), linear-gradient(90deg, #8B0000 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              WebkitMaskImage: "radial-gradient(circle at bottom left, black 0%, transparent 70%)",
              maskImage: "radial-gradient(circle at bottom left, black 0%, transparent 70%)"
            }}
          />

          {/* Subtle Bottom-Right Grid */}
          <div
            className="absolute bottom-0 right-0 w-[40vw] h-[28rem] opacity-30 pointer-events-none hidden md:block"
            style={{
              backgroundImage: "linear-gradient(#8B0000 1px, transparent 1px), linear-gradient(90deg, #8B0000 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              WebkitMaskImage: "radial-gradient(circle at bottom right, black 0%, transparent 70%)",
              maskImage: "radial-gradient(circle at bottom right, black 0%, transparent 70%)"
            }}
          />

          {/* Hero Section */}
          <section className="relative max-w-7xl mx-auto px-6 sm:px-12 pt-4 pb-12 md:pt-8 md:pb-20 text-center flex flex-col items-center z-10">

            {/* Big Hero Title */}
            <div className="mb-10">
              <h1 className="text-6xl md:text-8xl lg:text-[7rem] font-black text-[#3d200a] tracking-tighter drop-shadow-sm">
                Quant<span className="text-[#8B0000]">Warden</span>
              </h1>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 text-[#8B0000] text-sm font-medium mb-8 border border-amber-500/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B0000] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8B0000]"></span>
              </span>
              Enterprise grade cryptographic analysis
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#3d200a] mb-6 tracking-tight leading-tight max-w-5xl">
              A Post-Quantum Cryptography Scanner for Your Team
            </h2>

            <p className="text-md md:text-lg text-[#8a5d33] mb-12 max-w-3xl font-normal leading-relaxed">
              Proactively identify deprecated cryptography algorithms, measure your transition readiness, and effortlessly generate a CertIn-compliant Cryptographic Bill of Materials (CBOM) for your organization from one centralized hub.
            </p>

            {isLoggedIn ? (
              <Link
                href="/app"
                className="group flex items-center justify-center gap-2 px-8 py-4 bg-[#8B0000] text-white rounded-xl text-lg font-bold shadow-xl shadow-[#8B0000]/30 hover:-translate-y-1 hover:bg-[#730000] transition-all"
              >
                <LayoutDashboard className="w-5 h-5" /> Open App <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <Link
                href="/signup"
                className="group flex items-center justify-center gap-2 px-8 py-4 bg-[#8B0000] text-white rounded-xl text-lg font-bold shadow-xl shadow-[#8B0000]/30 hover:-translate-y-1 hover:bg-[#730000] transition-all"
              >
                Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </section>
        </div>

        {/* Features Matrix Component */}
        <section className="max-w-7xl mx-auto px-6 sm:px-12 py-20 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#3d200a]">Pioneering Post-Quantum Security</h2>
            <div className="w-16 h-1.5 bg-[#8B0000] mx-auto mt-4 rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="bg-white/40 backdrop-blur-md rounded-2xl p-8 border border-amber-300/40 shadow-lg hover:shadow-xl hover:bg-white/60 transition-all group"
              >
                <div className="bg-[#8B0000]/10 w-14 h-14 flex items-center justify-center rounded-xl mb-6 group-hover:scale-110 transition-transform">
                  {feat.icon}
                </div>
                <h3 className="text-xl font-bold text-[#3d200a] mb-3">{feat.title}</h3>
                <p className="text-[#8a5d33] leading-relaxed font-normal">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <div className="w-full min-h-screen relative bg-[linear-gradient(160deg,#fff7e6_0%,#fde68a_35%,#fbbf24_65%,#f59e0b_100%)] flex flex-col items-center justify-center mt-20">
          <section className="w-full max-w-5xl mx-auto px-6 sm:px-12 py-12 flex flex-col items-center text-center relative z-10">

            <div className="mb-6 flex items-center justify-center">
              <Shield className="h-16 w-16 text-[#8B0000]" strokeWidth={1.5} />
            </div>

            <h2 className="text-3xl md:text-5xl font-extrabold text-[#3d200a] mb-10 tracking-tight">
              Ready to secure your baseline?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-12">
              <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-6 border border-amber-400/50 shadow-lg flex flex-col items-center text-center">
                <div className="bg-[#8B0000]/10 p-3 rounded-full mb-4 text-[#8B0000]">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-[#3d200a] mb-2">Individual Accounts</h3>
                <p className="text-sm text-[#8a5d33] leading-relaxed font-normal">
                  Create an individual identity to manage your personal cryptography baseline securely.
                </p>
              </div>

              <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-6 border border-amber-400/50 shadow-lg flex flex-col items-center text-center">
                <div className="bg-[#8B0000]/10 p-3 rounded-full mb-4 text-[#8B0000]">
                  <Building2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-[#3d200a] mb-2">Organizations</h3>
                <p className="text-sm text-[#8a5d33] leading-relaxed font-normal">
                  Create or join existing organizational teams to share scanning analytics and threat discoveries.
                </p>
              </div>
            </div>

            {isLoggedIn ? (
              <Link
                href="/app"
                className="group flex items-center justify-center gap-2 px-8 py-3.5 bg-[#8B0000] text-white rounded-xl font-semibold shadow-xl shadow-[#8B0000]/30 hover:bg-[#730000] hover:-translate-y-0.5 transition-all"
              >
                <LayoutDashboard className="w-5 h-5" /> Open App
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                <Link
                  href="/signup"
                  className="group flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 bg-[#8B0000] text-white rounded-xl font-semibold shadow-xl shadow-[#8B0000]/30 hover:bg-[#730000] hover:-translate-y-0.5 transition-all"
                >
                  Create Account
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/login"
                  className="flex items-center justify-center w-full sm:w-auto px-8 py-3.5 bg-[#fff7e6] text-[#8B0000] border border-[#8B0000]/20 rounded-xl font-semibold hover:bg-white hover:border-[#8B0000]/40 hover:-translate-y-0.5 shadow-md shadow-[#8B0000]/5 transition-all"
                >
                  Login
                </Link>
              </div>
            )}

          </section>
        </div>

      </main>

      {/* Footer Section */}
      <footer className="relative bg-[#8B0000] py-12 md:py-24 flex flex-col items-center justify-center text-center px-6 overflow-hidden">

        {/* Subtle Corner Fading Grids */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            WebkitMaskImage: "radial-gradient(circle at center, transparent 35%, black 100%)",
            maskImage: "radial-gradient(circle at center, transparent 35%, black 100%)"
          }}
        />

        <p className="text-white/80 text-base md:text-lg font-medium max-w-2xl mx-auto leading-relaxed mb-8 md:mb-12 relative z-10">
          Securing the future of enterprise cryptography against tomorrow&apos;s computational threats.
        </p>

        {/* Massive Gradient Logo Text */}
        <div className="w-full flex justify-center items-center mb-8 md:mb-16 select-none relative z-10 pointer-events-none">
          <h2 className="font-black text-[12vw] leading-none tracking-tighter bg-clip-text text-transparent bg-linear-to-b from-white to-white/10">
            QuantWarden
          </h2>
        </div>

        <p className="text-white/50 text-xs font-mono tracking-widest relative z-10">
          &copy; COPYRIGHT TEAM KEYGEN
        </p>
      </footer>

    </div>
  );
}
