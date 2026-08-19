import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Check, Star } from "lucide-react";
import { getPricingSettings } from "@/lib/settings";
import { formatCurrency } from "@/lib/utils";

export default async function PricingPage() {
  const t = await getTranslations("pricing");
  let pricing: {
    monthlyPriceUsd: number;
    yearlyPriceUsd: number;
    trialDays: number;
    planName?: string;
  } = { monthlyPriceUsd: 3500, yearlyPriceUsd: 42000, trialDays: 14, planName: "Pro" };
  try {
    pricing = await getPricingSettings();
  } catch {
    // DB not connected yet — use defaults
  }

  const features = [
    "Unlimited projects during trial",
    "Full visual drag-and-drop editor",
    "One-click publishing with SSL",
    "Custom domain connection",
    "AI content & image generation (Claude)",
    "Version history & rollback",
    "Hebrew RTL & English LTR",
    "Team collaboration",
    "Priority support",
  ];

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-16 md:px-8 md:py-24">
      <div className="mb-14 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#22d3ee]/20 bg-[#22d3ee]/10 px-3.5 py-1.5 text-[13px] font-semibold text-[#22d3ee]">
          Pricing
        </div>
        <h1 className="text-[clamp(32px,4vw,48px)] font-extrabold tracking-tight">{t("title")}</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-[#9d9bb4]">{t("subtitle")}</p>
        <p className="mt-3 text-sm text-[#22d3ee]">{pricing.trialDays} {t("trial")}</p>
      </div>

      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        <div className="rounded-[20px] border border-[#24243a] bg-gradient-to-b from-[#12121e] to-[#0d0d16] p-8">
          <p className="text-sm font-semibold text-[#9d9bb4]">Monthly</p>
          <p className="mt-1 text-sm text-[#6b6a86]">Flexible monthly billing</p>
          <div className="mt-6 text-4xl font-extrabold tracking-tight">
            {formatCurrency(pricing.monthlyPriceUsd)}
            <span className="text-base font-normal text-[#6b6a86]">/month</span>
          </div>
          <ul className="mt-8 space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-[#9d9bb4]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#22d3ee]" aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/register?plan=monthly"
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl border border-[#24243a] bg-white/[0.03] px-6 py-3.5 text-sm font-semibold hover:bg-white/[0.06]"
          >
            {t("cta")}
          </Link>
        </div>

        <div className="relative rounded-[20px] border border-[#7c5cff]/40 bg-gradient-to-b from-[#7c5cff]/12 to-[#12121e] p-8 shadow-[0_24px_80px_-24px_rgba(124,92,255,0.45)]">
          <div className="absolute end-4 top-4 inline-flex items-center gap-1 rounded-full border border-[#7c5cff]/30 bg-[#7c5cff]/20 px-2.5 py-1 text-xs font-semibold text-[#eceaf5]">
            <Star className="h-3 w-3" aria-hidden="true" />
            Best value
          </div>
          <p className="text-sm font-semibold text-[#9d9bb4]">Yearly</p>
          <p className="mt-1 text-sm text-[#6b6a86]">Billed once for 12 months</p>
          <div className="mt-6 text-4xl font-extrabold tracking-tight">
            {formatCurrency(pricing.yearlyPriceUsd)}
            <span className="text-base font-normal text-[#6b6a86]"> / 12 months</span>
          </div>
          <p className="mt-2 text-sm font-medium text-[#22d3ee]">
            {t("yearlyNote")}
          </p>
          <ul className="mt-8 space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-[#9d9bb4]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#22d3ee]" aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/register?plan=yearly"
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] px-6 py-3.5 text-sm font-semibold text-[#08080d]"
          >
            {t("cta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
