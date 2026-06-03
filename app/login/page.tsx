"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { loggedIn, login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* Already logged in — go home. */
  useEffect(() => {
    if (loggedIn) router.replace("/");
  }, [loggedIn, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    /* Small delay so the loading state is visible. */
    await new Promise((r) => setTimeout(r, 600));

    const ok = login(username.trim(), password);
    if (ok) {
      router.replace("/");
    } else {
      setError("ユーザー名またはパスワードが正しくありません。 / Invalid username or password.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/images/logo.png"
            alt="Care 24 Japan"
            width={427}
            height={160}
            priority
            className="h-auto w-40"
          />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-surface shadow-sm px-8 py-10 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-heading">ログイン</h1>
            <p className="text-xs uppercase tracking-widest text-muted">Sign in</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1">
              <label htmlFor="username" className="block text-sm font-medium text-body">
                ユーザー名
                <span className="ml-2 text-xs uppercase tracking-widest text-muted">Username</span>
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
                placeholder="username"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-body">
                パスワード
                <span className="ml-2 text-xs uppercase tracking-widest text-muted">Password</span>
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-accent-light px-4 py-2.5 text-xs text-accent">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full rounded-full bg-primary py-3 text-sm font-medium text-white transition hover:bg-primary-mid disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "確認中…" : "ログイン"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
