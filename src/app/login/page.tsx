"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
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
        router.push("/dashboard"); // ✅ IMPORTANT CHANGE
      } else {
        setError(result.message || "Invalid credentials");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center px-4">
      <div className="bg-[#0f1520] border border-white/10 rounded-xl p-8 w-full max-w-sm">
        <h1 className="text-xl text-white mb-4">Login</h1>

        <input
          type="email"
          placeholder="Email"
          value={data.email}
          onChange={(e) => setData({ ...data, email: e.target.value })}
          className="w-full mb-3 p-2 rounded bg-black text-white"
        />

        <input
          type="password"
          placeholder="Password"
          value={data.password}
          onChange={(e) => setData({ ...data, password: e.target.value })}
          className="w-full mb-3 p-2 rounded bg-black text-white"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={login}
          className="w-full bg-yellow-400 text-black py-2 mt-3 rounded"
        >
          {loading ? "Loading..." : "Login"}
        </button>

        <p className="text-sm text-white mt-4">
          New user? <Link href="/signup">Signup</Link>
        </p>
      </div>
    </div>
  );
}