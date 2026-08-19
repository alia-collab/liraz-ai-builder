import { Sparkles, Globe, Shield, Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function AuthBrandPanel() {
  const tc = await getTranslations("common");

  const highlights = [
    { icon: Sparkles, text: "AI builds your site from a simple description" },
    { icon: Globe, text: "Full Hebrew RTL & English LTR support" },
    { icon: Shield, text: "Secure, isolated, production-grade hosting" },
    { icon: Zap, text: "From idea to live site in minutes" },
  ];

  return (
    <div className="relative hidden lg:flex flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand via-purple-600 to-indigo-700 p-10 text-white">
      <div className="absolute inset-0 gradient-mesh opacity-30" aria-hidden="true" />
      <div className="absolute -top-24 -end-24 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-glow" aria-hidden="true" />
      <div className="absolute -bottom-32 -start-16 h-80 w-80 rounded-full bg-purple-300/20 blur-3xl animate-glow" aria-hidden="true" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-12">
          <Sparkles className="h-8 w-8" aria-hidden="true" />
          <span className="text-2xl font-bold">{tc("appName")}</span>
        </div>
        <h2 className="text-3xl font-bold leading-tight mb-4">
          Build beautiful websites without writing code
        </h2>
        <p className="text-white/80 text-lg max-w-md">
          Describe your vision in Hebrew or English — AI handles design, content, and publishing.
        </p>
      </div>

      <ul className="relative space-y-4">
        {highlights.map((item) => (
          <li key={item.text} className="flex items-center gap-3 text-white/90">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <item.icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-sm">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
