import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsPage() {
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
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Rider Service Terms & Conditions
              </h1>
              <p className="text-xs text-zinc-400">
                AtlasBasket Delivery Partner Agreement • Effective Nov 2026
              </p>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/10 text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              Independent Delivery Contractor Status
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              By registering as an AtlasBasket Delivery Partner, you acknowledge and agree that you operate as an independent freelance contractor. You maintain complete freedom over your working hours, vehicle selection, and availability, subject to maintaining active account verification and safety standards in Mysuru, Karnataka.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/10 text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              Eligibility & Verification Requirements
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Riders must be at least 18 years of age. Electric bikes and motorized two-wheelers require a valid Government of India Driving Licence and Registration Certificate (RC). Riders using non-motorized manual bicycles are legally exempt from motor vehicle driving licence requirements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/10 text-white text-xs font-bold flex items-center justify-center">
                3
              </span>
              Earnings, Commission & Payouts
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              AtlasBasket operates on a transparent single-source-of-truth payout model. Delivery partners receive the prevailing payout percentage (default 90% of base + distance earnings) configured by AtlasBasket administration. Tips provided by customers are 100% disbursed to the rider with zero platform deduction. Payouts are reconciled and disbursed to your registered bank account with standard UTR bank transaction references.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/10 text-white text-xs font-bold flex items-center justify-center">
                4
              </span>
              Package Handling, Verification & 3-Strike Policy
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Deliveries require strict verification: physical pickup verification (OTP/QR scan from merchant) and customer delivery OTP verification. In the event of reported package tampering, unverified dropoff, or confirmed damage, incidents undergo administrative review. Confirmed fault incidents may incur a 20% order payout penalty. Under our safety policy, accumulation of 3 active strikes leads to automated suspension, subject to your right to file an administrative appeal via the Delivery Portal.
            </p>
          </section>

          <div className="pt-6 border-t border-white/[0.06] text-xs text-zinc-500 flex items-center justify-between">
            <span>Mysuru Jurisdiction, Karnataka, India</span>
            <span>Support: support@atlasbasket.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
