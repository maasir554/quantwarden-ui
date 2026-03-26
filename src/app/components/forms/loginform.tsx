"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [data, setData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        router.push("/"); // ← redirects to dashboard
      } else {
        setError(result.message || "Invalid credentials");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") login();
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center px-4">
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Top accent bar */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent mb-8 opacity-60" />

        {/* Card */}
        <div className="bg-[#0f1520] border border-white/10 rounded-xl p-8 shadow-2xl">
          {/* Logo / Title */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-xs font-mono text-yellow-400/70 tracking-widest uppercase">
                PNB Security Platform
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-3">Welcome back</h1>
            <p className="text-sm text-white/40 mt-1">Sign in to your secure workspace</p>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide">
                Email address
              </label>
              <input
                type="email"
                placeholder="admin@pnb.co.in"
                value={data.email}
                onChange={(e) => setData({ ...data, email: e.target.value })}
                onKeyDown={handleKey}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-yellow-400/50 focus:bg-white/8 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={data.password}
                onChange={(e) => setData({ ...data, password: e.target.value })}
                onKeyDown={handleKey}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-yellow-400/50 focus:bg-white/8 transition-all"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={login}
            disabled={loading || !data.email || !data.password}
            className="mt-6 w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm rounded-lg py-2.5 transition-colors"
          >
            {loading ? "Authenticating..." : "Sign in"}
          </button>

          {/* Footer link */}
          <p className="mt-6 text-center text-xs text-white/30">
            New organization?{" "}
            <a href="/login?tab=signup" className="text-yellow-400/70 hover:text-yellow-400 transition-colors">
              Register here
            </a>
          </p>
        </div>

        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent mt-8 opacity-20" />
      </div>
    </div>
  );
}