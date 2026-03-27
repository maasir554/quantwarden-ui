"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Building2, Moon, Sun, Database } from "lucide-react";
import { useTheme } from "next-themes";
import { authClient } from "@/lib/auth-client";

export default function SignupPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const [data, setData] = useState({
    email: "",
    password: "",
    orgName: "",
    domains: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let signupEmail = data.email;
      if (signupEmail === "admin") {
        signupEmail = "admin@pnb.co.in";
      }

      const { data: resData, error: err } = await authClient.signUp.email({
        email: signupEmail,
        password: data.password,
        name: "Admin User", // Required by standard Better Auth
      });

      if (!err) {
        // Here we would ideally link the organization logic via an API mapping,
        // but for Hackathon purposes, User Auth registers successfully on Neon Auth!
        router.push("/dashboard");
      } else {
        console.error("Signup Error:", err);
        setError(err.message || "Registration failed on Neon DB.");
      }

    } catch {
      setError("Network or Neon DB error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isValid = data.email && data.password && data.orgName && data.domains;

  return (
    <div className="min-h-screen bg-[#fefce8] dark:bg-[#0a0d14] flex flex-col md:flex-row-reverse font-sans transition-colors duration-300">
      
      {/* Theme Toggle Button */}
      {mounted && (
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="absolute top-6 left-6 z-50 p-2.5 rounded-full bg-white/50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 backdrop-blur-md shadow-sm transition-all"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5 text-yellow-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-700" />
          )}
        </button>
      )}

      {/* Right Branding Panel */}
      <div className="md:w-[45%] bg-[#8B0000] dark:bg-[#0f1520] flex flex-col justify-between p-8 md:p-14 relative overflow-hidden h-64 md:h-auto border-l border-[#610000] dark:border-white/5 shadow-[-10px_0_25px_-5px_rgba(0,0,0,0.3)] z-10 transition-colors duration-300">
        <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.04]"
             style={{
               backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
               backgroundSize: "40px 40px",
             }} />
        <div className="relative z-10 flex items-center gap-3 justify-end md:justify-start">
          <div className="bg-white/10 dark:bg-white/5 p-2.5 rounded-xl border border-white/20 backdrop-blur-sm shadow-lg order-2 md:order-1">
             <Shield className="w-7 h-7 text-[#fefce8] dark:text-[#22d3ee]" strokeWidth={1.5} />
          </div>
          <div className="text-right md:text-left order-1 md:order-2">
            <h1 className="text-white font-bold tracking-[0.15em] text-sm uppercase">QuantWarden</h1>
            <p className="text-[#fefce8]/90 dark:text-[#22d3ee] text-xs font-medium tracking-wide">Quantum-Proof Scanner</p>
          </div>
        </div>
        
        <div className="relative z-10 mt-auto hidden md:block">
          <div className="inline-block px-3 py-1 mb-6 rounded-full border border-white/30 dark:border-[#22d3ee]/30 bg-white/10 dark:bg-[#22d3ee]/10 text-white dark:text-[#22d3ee] text-xs font-semibold tracking-wider uppercase">
             Onboard Enterprise
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-[1.15] tracking-tight">
             Defend your<br /><span className="text-[#fefce8]/90 dark:text-[#22d3ee]">Architecture.</span>
          </h2>
          <p className="text-white/80 max-w-sm text-[15px] leading-relaxed font-medium">
            Register your enterprise organization today to begin monitoring assets, cryptographic vulnerabilities, and compliance limits.
          </p>
        </div>
      </div>

      {/* Left Signup Form Panel */}
      <div className="md:w-[55%] flex items-center justify-center p-8 relative">
        <div className="w-full max-w-[440px]">
          <div className="text-center md:text-left mb-8 mt-4 md:mt-0">
             <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Create Workspace</h2>
             <p className="text-slate-600 dark:text-slate-400 mt-2 text-[15px]">Set up your organization's secure environment.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-widest">
                  Organization Name
                </label>
                <input
                  type="text"
                  placeholder="Punjab National Bank"
                  value={data.orgName}
                  onChange={(e) => setData({ ...data, orgName: e.target.value })}
                  className="w-full bg-white dark:bg-[#161f32] border border-yellow-200 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#8B0000]/60 dark:focus:ring-[#22d3ee]/50 transition-all shadow-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-widest">
                  Allowed Domains
                </label>
                <input
                  type="text"
                  placeholder="pnb.co.in, bank"
                  value={data.domains}
                  onChange={(e) => setData({ ...data, domains: e.target.value })}
                  className="w-full bg-white dark:bg-[#161f32] border border-yellow-200 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#8B0000]/60 dark:focus:ring-[#22d3ee]/50 transition-all shadow-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-widest">
                Admin Email
              </label>
              <input
                type="email"
                placeholder="admin@pnb.co.in"
                value={data.email}
                onChange={(e) => setData({ ...data, email: e.target.value })}
                className="w-full bg-white dark:bg-[#161f32] border border-yellow-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-[15px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#8B0000]/60 dark:focus:ring-[#22d3ee]/50 transition-all shadow-sm"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-widest">
                Secure Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={data.password}
                onChange={(e) => setData({ ...data, password: e.target.value })}
                className="w-full bg-white dark:bg-[#161f32] border border-yellow-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-[15px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#8B0000]/60 dark:focus:ring-[#22d3ee]/50 transition-all shadow-sm"
                required
              />
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isValid}
              className="w-full bg-[#8B0000] hover:bg-[#6b0000] dark:bg-[#22d3ee] dark:hover:bg-[#159bb0] text-white dark:text-black font-bold text-[15px] rounded-xl py-3.5 transition-all shadow-md active:scale-[0.98] mt-4 flex justify-center items-center h-[52px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />
              ) : "Initialize Organization"}
            </button>
          </form>

          <div className="mt-8 flex flex-col items-center md:items-start gap-4">
             <p className="text-[14px] text-slate-600 dark:text-slate-400 font-medium">
               Already registered?{" "}
               <Link href="/login" className="text-[#8B0000] dark:text-[#22d3ee] hover:underline font-bold transition-colors">
                 Sign In
               </Link>
             </p>

             {/* Removed Neon Badge */}
          </div>
        </div>
      </div>
    </div>
  );
}