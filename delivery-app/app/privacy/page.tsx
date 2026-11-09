import Link from "next/link";
import { ArrowLeft, Lock, ShieldCheck, EyeOff } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8">
          <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Privacy Policy & Data Protection</h1>
              <p className="text-xs text-slate-400">Identity Protection, Aadhaar Masking & Geolocation Rights</p>
            </div>
          </div>

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-teal-400" />
              Aadhaar & Identity Information Masking
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              In accordance with UIDAI guidelines and data privacy regulations, AtlasBasket Delivery never stores raw, unencrypted 12-digit Aadhaar numbers in persistent application databases. Only the masked suffix (e.g., <code className="bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-mono text-xs">XXXX-XXXX-1234</code>) is maintained for identification. Identity documents uploaded for admin review are encrypted at rest. Riders may request permanent administrative deletion of verification documents at any time upon account de-registration.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
              Geolocation Tracking & Consent Architecture
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Your location is accessed <strong>only</strong> when you explicitly toggle your status to <strong className="text-emerald-400">&quot;Online&quot;</strong> or are actively fulfilling a delivery job in transit. When your status is set to <strong className="text-slate-400">&quot;Offline&quot;</strong>, all GPS queries terminate immediately. AtlasBasket never performs background tracking when you are off duty.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
              Financial & Bank Security
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Bank Account and IFSC details provided during onboarding are strictly used to process automated electronic payouts (NEFT/IMPS/UPI) for your completed orders. We never request debit card PINs, CVVs, or internet banking passwords.
            </p>
          </section>

          <div className="pt-6 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
            <span>AtlasBasket Platform Security • Mysuru, India</span>
            <span>privacy@atlasbasket.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
