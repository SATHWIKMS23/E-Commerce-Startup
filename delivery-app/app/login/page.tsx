"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { apiClient } from "@/lib/apiClient";
import { Bike, ShieldCheck, Mail, Lock, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check URL error params from NextAuth or Google OAuth
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      if (errorParam === "OAuthSignin" || errorParam === "OAuthCallback") {
        setError("Unable to complete Google sign-in. Please ensure Google OAuth credentials are configured.");
      } else if (errorParam === "GoogleAuthFailed") {
        setError("Google authentication was unsuccessful. Please check your connection and try again.");
      } else {
        setError(decodeURIComponent(errorParam));
      }
    }
  }, [searchParams]);

  // If user is already authenticated via session or token, route them appropriately
  useEffect(() => {
    if (sessionStatus === "authenticated" && (session as any)?.rider) {
      const rider = (session as any).rider;
      // If provisional rider account without vehicle or phone completed, prompt them to finish verification details
      if (!rider.vehicleType || rider.phone?.startsWith("G_")) {
        router.push("/register?step=details");
      } else {
        router.push("/dashboard");
      }
    }
  }, [session, sessionStatus, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.post("/api/delivery/auth/login", {
        email,
        password,
      });

      if (res.data?.token) {
        localStorage.setItem("delivery_partner_token", res.data.token);
      }
      if (res.data?.rider) {
        localStorage.setItem("delivery_partner_rider", JSON.stringify(res.data.rider));
      }

      // Sync with NextAuth session in background
      if (res.data?.token && res.data?.rider) {
        signIn("credentials", {
          redirect: false,
          token: res.data.token,
          riderData: JSON.stringify(res.data.rider),
        }).catch(() => {});
      }

      const rider = res.data?.rider;
      if (!rider?.vehicleType || rider?.phone?.startsWith("G_")) {
        router.push("/register?step=details");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to login. Please check your credentials or network."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (err: any) {
      setError(err?.message || "Google sign in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4 relative overflow-hidden">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-white/[0.025] blur-[140px] pointer-events-none rounded-full" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <Link href="/" className="inline-flex justify-center items-center gap-2.5 mb-2 group">
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white shadow-sm">
            <Bike className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <span className="text-xl font-bold tracking-tight text-white block">
              AtlasBasket
            </span>
            <span className="text-[10px] font-medium text-white/50 block font-mono -mt-0.5">
              Rider Portal
            </span>
          </div>
        </Link>

        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Sign in to your rider account
        </h2>
        <p className="mt-1 text-center text-xs text-zinc-400">
          Deliver locally and earn directly with fast weekly payouts
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/[0.025] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Google OAuth Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            type="button"
            className="w-full py-2.5 px-4 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-xl text-zinc-200 text-xs font-medium transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{googleLoading ? "Connecting with Google..." : "Sign in with Google"}</span>
          </button>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-white/[0.08]" />
            <span className="flex-shrink mx-3 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              Or with email
            </span>
            <div className="flex-grow border-t border-white/[0.08]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rider@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-zinc-600 text-xs focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-zinc-600 text-xs focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full mt-2 py-3 px-4 bg-white text-zinc-950 hover:bg-zinc-200 font-semibold rounded-xl text-xs shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center">
            <p className="text-xs text-zinc-400">
              New to AtlasBasket Delivery?{" "}
              <Link
                href="/register"
                className="font-semibold text-white hover:text-zinc-300 underline underline-offset-4 transition-colors ml-1"
              >
                Apply as a Rider
              </Link>
            </p>
          </div>
        </div>

        {/* Security / Compliance Badges */}
        <div className="mt-6 flex items-center justify-center gap-6 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            256-Bit SSL Encrypted
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
            Direct Bank Payouts
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07070a] flex items-center justify-center text-white">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
