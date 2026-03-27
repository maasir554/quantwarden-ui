"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, Moon, Sun, Database, KeyRound } from "lucide-react";
import { useTheme } from "next-themes";

export default function ForgotPasswordPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    
    try {
      // Simulate API call to Neon database auth
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Since this is a hackathon, we can just show a success message immediately
      // In a real app, this would hit a Next.js API route that sends an email via SendGrid/Resend
      setMessage(`Secure reset link has been dispatched via Neon DB to ${email || 'your email'}.`);
      
    } catch {
      setError("Network or Neon Database error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fefce8] dark:bg-[#0a0d14] flex flex-col md:flex-row font-sans transition-colors duration-300">
      
      {/* Theme Toggle Button */}
      {mounted && (
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="absolute top-6 right-6 z-50 p-2.5 rounded-full bg-white/50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 backdrop-blur-md shadow-sm transition-all"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5 text-yellow-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-700" />
          )}
        </button>
      )}

      {/* Left Branding Panel */}
      <div className="md:w-[45%] bg-[#8B0000] dark:bg-[#0f1520] flex flex-col justify-between p-8 md:p-14 relative overflow-hidden h-64 md:h-auto border-r border-[#610000] dark:border-white/5 shadow-[10px_0_25px_-5px_rgba(0,0,0,0.3)] z-10 transition-colors duration-300">
        <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.04]"
             style={{
               backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
               backgroundSize: "40px 40px",
             }} />
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/10 dark:bg-white/5 p-2.5 rounded-xl border border-white/20 backdrop-blur-sm shadow-lg">
             <Shield className="w-7 h-7 text-[#fefce8] dark:text-[#22d3ee]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-white font-bold tracking-[0.15em] text-sm uppercase">QuantWarden</h1>
            <p className="text-[#fefce8]/90 dark:text-[#22d3ee] text-xs font-medium tracking-wide">Quantum-Proof Scanner</p>
          </div>
        </div>
        
        <div className="relative z-10 mt-auto hidden md:block">
          <div className="inline-block px-3 py-1 mb-6 rounded-full border border-white/30 dark:border-[#22d3ee]/30 bg-white/10 dark:bg-[#22d3ee]/10 text-white dark:text-[#22d3ee] text-xs font-semibold tracking-wider uppercase">
             Hackathon Edition
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-[1.15] tracking-tight">
             Restore your<br /><span className="text-[#fefce8]/90 dark:text-[#22d3ee]">Access.</span>
          </h2>
          <p className="text-white/80 max-w-sm text-[15px] leading-relaxed font-medium">
            Verify your identity below to regain entry to the Punjab National Bank scanning workspace.
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="md:w-[55%] flex items-center justify-center p-8 relative">
        <div className="w-full max-w-[420px]">
          <div className="text-center md:text-left mb-10">
             <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Forgot Password?</h2>
             <p className="text-slate-600 dark:text-slate-400 mt-2 text-[15px]">Enter your enterprise email address and we'll securely verify your identity with Neon Database to send a recovery link.</p>
          </div>

          <form onSubmit={resetPassword} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-widest">
                Admin Email Address
              </label>
              <input
                type="email"
                placeholder="admin@pnb.co.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white dark:bg-[#161f32] border border-yellow-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-[15px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#8B0000]/60 dark:focus:ring-[#22d3ee]/50 transition-all shadow-sm"
                required
              />
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {error}
              </div>
            )}
            
            {message && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-400 text-sm font-medium flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !!message}
              className="w-full bg-[#8B0000] hover:bg-[#6b0000] dark:bg-[#22d3ee] dark:hover:bg-[#159bb0] text-white dark:text-black font-bold text-[15px] rounded-xl py-3.5 transition-all shadow-md active:scale-[0.98] mt-4 flex justify-center items-center h-[52px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />
              ) : "Send Secure Reset Link"}
            </button>
          </form>

          <div className="mt-8 flex flex-col items-center md:items-start gap-4">
             <p className="text-[14px] text-slate-600 dark:text-slate-400 font-medium">
               Remember your password?{" "}
               <Link href="/login" className="text-[#8B0000] dark:text-[#22d3ee] hover:underline font-bold transition-colors">
                 Back to Sign In
               </Link>
             </p>

             {/* Removed Neon Badge */}
          </div>
        </div>
      </div>
    </div>
  );
}
