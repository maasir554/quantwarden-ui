"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [data, setData] = useState({
    email: "",
    password: "",
    orgName: "",
    domains: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

 const submit = async () => {
  setError("");
  setLoading(true);

  try {
    const formattedData = {
      ...data,
      domains: data.domains.split(",").map(d => d.trim()), // 🔥 IMPORTANT
    };

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formattedData),
    });

    const result = await res.json();

    if (res.ok && result.success) {
      router.push("/dashboard"); // 🔥 change this
    } else {
      setError(result.message || "Registration failed.");
    }

  } catch {
    setError("Network error. Please try again.");
  } finally {
    setLoading(false);
  }
};

  const isValid = data.email && data.password && data.orgName && data.domains;

  return (
    <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent mb-8 opacity-60" />

        <div className="bg-[#0f1520] border border-white/10 rounded-xl p-8 shadow-2xl">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-xs font-mono text-yellow-400/70 tracking-widest uppercase">
                PNB Security Platform
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-3">Register enterprise</h1>
            <p className="text-sm text-white/40 mt-1">Set up your organization's secure workspace</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide">
                Organization name
              </label>
              <input
                placeholder="Punjab National Bank"
                value={data.orgName}
                onChange={(e) => setData({ ...data, orgName: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-yellow-400/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide">
                Admin email
              </label>
              <input
                type="email"
                placeholder="admin@pnb.co.in"
                value={data.email}
                onChange={(e) => setData({ ...data, email: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-yellow-400/50 transition-all"
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
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-yellow-400/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide">
                Allowed domains
              </label>
              <input
                placeholder="pnb.co.in, pnbbank.com"
                value={data.domains}
                onChange={(e) => setData({ ...data, domains: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-yellow-400/50 transition-all"
              />
              <p className="text-[11px] text-white/25 mt-1.5">
                Comma-separated. Only these domains can join your org.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading || !isValid}
            className="mt-6 w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm rounded-lg py-2.5 transition-colors"
          >
            {loading ? "Creating enterprise..." : "Register enterprise"}
          </button>

          <p className="mt-6 text-center text-xs text-white/30">
            Already registered?{" "}
            <Link href="/login" className="text-yellow-400/70 hover:text-yellow-400 transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent mt-8 opacity-20" />
      </div>
    </div>
  );
}