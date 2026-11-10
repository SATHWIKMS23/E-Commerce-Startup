import Link from "next/link";
import { ArrowLeft, Lock, ShieldCheck, EyeOff } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle monochrome ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-white/[0.025] blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-3xl mx-auto relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white font-medium mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8">
          <div className="flex items-center gap-4 border-b border-white/[0.06] pb-6">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Privacy Policy & Data Protection
              </h1>
              <p className="text-xs text-zinc-400">
                Identity Protection, Aadhaar Masking & Geolocation Rights
              </p>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-zinc-300" />
              Aadhaar & Identity Information Masking
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              In accordance with UIDAI guidelines and data privacy regulations, AtlasBasket Delivery never stores raw, unencrypted 12-digit Aadhaar numbers in persistent application databases. Only the masked suffix (e.g., <code className="bg-white/[0.04] border border-white/10 px-2 py-0.5 rounded text-zinc-200 font-mono text-xs">XXXX-XXXX-1234</code>) is maintained for identification. Identity documents uploaded for admin review are encrypted at rest. Riders may request permanent administrative deletion of verification documents at any time upon account de-registration.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-zinc-300" />
              Geolocation Tracking & Consent Architecture
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Your location is accessed <strong>only</strong> when you explicitly toggle your status to <strong>&quot;Online&quot;</strong> or are actively fulfilling a delivery job in transit. When your status is set to <strong className="text-zinc-500">&quot;Offline&quot;</strong>, all GPS queries terminate immediately. AtlasBasket never performs background tracking when you are off duty.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-zinc-300" />
              Financial & Bank Security
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Bank Account and IFSC details provided during onboarding are strictly used to process automated electronic payouts (NEFT/IMPS/UPI) for your completed orders. We never request debit card PINs, CVVs, or internet banking passwords.
            </p>
          </section>

          <div className="pt-6 border-t border-white/[0.06] text-xs text-zinc-500 flex items-center justify-between">
            <span>AtlasBasket Platform Security • Mysuru, India</span>
            <span>privacy@atlasbasket.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
