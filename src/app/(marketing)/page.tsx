import Link from "next/link";
import { LandingFaq } from "@/components/marketing/landing-faq";
import { Code2, Monitor, Sparkles, Clock3, Smartphone, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-[1180px] px-6 md:px-8">
      <section className="flex flex-col items-center px-2 pb-10 pt-16 text-center md:pt-24">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#22d3ee]/20 bg-[#22d3ee]/10 px-3.5 py-1.5 text-[13px] font-semibold text-[#22d3ee]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22d3ee] shadow-[0_0_8px_#22d3ee]" />
          One-click publishing
        </div>
        <h1 className="max-w-[820px] text-[clamp(38px,5.5vw,68px)] font-extrabold leading-[1.05] tracking-tight">
          Describe your idea.{" "}
          <span className="bg-gradient-to-r from-[#7c5cff] to-[#22d3ee] bg-clip-text text-transparent">
            Get a real app.
          </span>{" "}
          No code required.
        </h1>
        <p className="mx-auto mt-6 max-w-[600px] text-lg leading-relaxed text-[#9d9bb4]">
          Liraz AI turns plain-language descriptions into working websites and apps — design, logic, and hosting included.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3.5">
          <Link
            href="/register"
            className="inline-flex rounded-xl bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] px-7 py-3.5 text-[15.5px] font-semibold text-[#08080d]"
          >
            Start building free
          </Link>
          <Link
            href="/templates"
            className="inline-flex rounded-xl border border-[#24243a] bg-white/[0.03] px-7 py-3.5 text-[15.5px] font-semibold hover:bg-white/[0.06]"
          >
            See examples →
          </Link>
        </div>
        <p className="mt-4 text-[13.5px] text-[#6b6a86]">No credit card required · Preview in minutes · Hebrew & English</p>

        <div className="mt-16 w-full max-w-[920px] overflow-hidden rounded-[20px] border border-[#24243a] bg-gradient-to-b from-[#12121e] to-[#0d0d16] text-start shadow-[0_40px_100px_-30px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 border-b border-[#24243a] px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#35354f]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#35354f]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#35354f]" />
            <span className="ms-2 font-mono text-xs text-[#6b6a86]">lirazai.com/build</span>
          </div>
          <div className="grid min-h-[280px] md:grid-cols-[1fr_1.35fr]">
            <div className="flex flex-col gap-3.5 border-b border-[#24243a] p-5 md:border-b-0 md:border-e">
              <div className="ms-auto max-w-[92%] rounded-xl border border-[#7c5cff]/30 bg-[#7c5cff]/15 px-3.5 py-3 text-sm">
                Build me a booking site for my yoga studio, with class schedules and online payments.
              </div>
              <div className="max-w-[92%] rounded-xl border border-[#24243a] bg-[#171728] px-3.5 py-3 text-sm text-[#9d9bb4]">
                <b className="text-[#eceaf5]">Liraz AI</b> — Homepage, schedule, and a booking flow. Dark or light?
              </div>
              <div className="ms-auto max-w-[92%] rounded-xl border border-[#7c5cff]/30 bg-[#7c5cff]/15 px-3.5 py-3 text-sm">
                Dark, and add instructor bios.
              </div>
            </div>
            <div className="bg-[radial-gradient(ellipse_at_top,rgba(124,92,255,0.06),transparent_60%)] p-5">
              <div className="h-full overflow-hidden rounded-xl border border-[#24243a] bg-[#0d0d16]">
                <div className="flex gap-2 border-b border-[#24243a] px-3.5 py-2.5">
                  <div className="h-2 w-14 rounded bg-[#171728]" />
                  <div className="h-2 w-10 rounded bg-[#171728]" />
                </div>
                <div className="flex flex-col gap-3 p-4">
                  <div className="h-[70px] rounded-lg bg-[#171728]" />
                  <div className="h-4 w-3/5 rounded bg-[#171728]" />
                  <div className="flex gap-2.5">
                    <div className="h-20 flex-1 rounded-lg bg-[#171728]" />
                    <div className="h-20 flex-1 rounded-lg bg-[#171728]" />
                    <div className="h-20 flex-1 rounded-lg bg-[#171728]" />
                  </div>
                  <div className="h-8 w-36 rounded-lg bg-gradient-to-r from-[#7c5cff] to-[#22d3ee] opacity-85" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-6 border-y border-[#24243a] py-12 md:grid-cols-4">
        {[
          { n: "0", l: "lines of code required" },
          { n: "< 5 min", l: "to a first working draft" },
          { n: "HE + EN", l: "Hebrew RTL and English" },
          { n: "Live", l: "preview before you publish" },
        ].map((s) => (
          <div key={s.l}>
            <b className="block bg-gradient-to-r from-[#7c5cff] to-[#22d3ee] bg-clip-text text-3xl font-extrabold text-transparent">
              {s.n}
            </b>
            <span className="text-[13.5px] text-[#9d9bb4]">{s.l}</span>
          </div>
        ))}
      </div>

      <section id="features" className="py-20">
        <div className="mx-auto mb-14 max-w-[620px] text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#22d3ee]/20 bg-[#22d3ee]/10 px-3.5 py-1.5 text-[13px] font-semibold text-[#22d3ee]">
            Features
          </div>
          <h2 className="text-[clamp(28px,3.6vw,42px)] font-extrabold tracking-tight">Everything you need, none of the setup</h2>
          <p className="mt-3.5 text-[16.5px] leading-relaxed text-[#9d9bb4]">
            Liraz AI handles the parts that usually require a developer.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: Code2, color: "#7c5cff", title: "Just describe it", body: "Type what you want in plain language. Structure, design, and logic are built for you." },
            { icon: Monitor, color: "#22d3ee", title: "See it live as you go", body: "Every change shows in a real preview before you publish." },
            { icon: Sparkles, color: "#ff5cb3", title: "Edit with chat or visually", body: "Ask for changes in chat, or tweak text and layout by hand." },
            { icon: Clock3, color: "#7c5cff", title: "Built-in logic & data", body: "Forms, bookings, and inquiries are saved — not fake success messages." },
            { icon: Smartphone, color: "#22d3ee", title: "Responsive by default", body: "Phone, tablet, and desktop without extra setup." },
            { icon: ArrowRight, color: "#ff5cb3", title: "Publish in one click", body: "Preview subdomain now. Custom domain when you are ready." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-[#24243a] bg-gradient-to-b from-[#12121e] to-[#12121e]/40 p-7 transition hover:-translate-y-0.5 hover:border-[#37375a]">
              <f.icon className="mb-4 h-5 w-5" style={{ color: f.color }} aria-hidden="true" />
              <h3 className="text-[19px] font-bold">{f.title}</h3>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-[#9d9bb4]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="py-16">
        <div className="mx-auto mb-14 max-w-[620px] text-center">
          <h2 className="text-[clamp(28px,3.6vw,42px)] font-extrabold tracking-tight">From idea to live site in three steps</h2>
        </div>
        <div className="grid gap-7 md:grid-cols-3">
          {[
            { n: "01", t: "Describe your idea", d: "Tell Liraz AI what you are building — a shop, a booking tool, a studio site." },
            { n: "02", t: "Refine it by chatting", d: "Ask for changes the way you would ask a designer. Watch the preview update." },
            { n: "03", t: "Publish and share", d: "One click gives you a live preview link. Connect lirazai.com or your own domain later." },
          ].map((s) => (
            <div key={s.n}>
              <div className="mb-4 flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-[#22d3ee]/30 bg-[#22d3ee]/10 font-mono text-[13px] text-[#22d3ee]">
                {s.n}
              </div>
              <h3 className="text-[19px] font-bold">{s.t}</h3>
              <p className="mt-2.5 text-[14.5px] text-[#9d9bb4]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="showcase" className="py-16">
        <h2 className="mb-8 text-[clamp(28px,3.6vw,42px)] font-extrabold tracking-tight">What people build</h2>
        <div className="grid gap-3.5 md:grid-cols-2">
          {[
            "A portfolio site for my photography, dark and minimal",
            "An online shop for handmade candles with checkout",
            "A landing page for my podcast with an email signup",
            "אתר לטכנאי מחשבים עם הזמנת שירות ווואטסאפ",
          ].map((p) => (
            <div key={p} className="rounded-xl border border-[#24243a] bg-[#12121e] px-4 py-4 font-mono text-sm text-[#9d9bb4]">
              “{p}”
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="py-16">
        <div className="mx-auto mb-10 max-w-[620px] text-center">
          <h2 className="text-[clamp(28px,3.6vw,42px)] font-extrabold tracking-tight">Questions people ask</h2>
        </div>
        <LandingFaq />
      </section>

      <section className="pb-20">
        <div className="rounded-[28px] border border-[#7c5cff]/30 bg-gradient-to-br from-[#7c5cff]/15 to-[#22d3ee]/10 px-8 py-16 text-center">
          <h2 className="mx-auto max-w-[560px] text-[clamp(28px,3.6vw,42px)] font-extrabold tracking-tight">Have an idea? Let&apos;s build it.</h2>
          <p className="mx-auto mt-4 max-w-md text-[#9d9bb4]">Start free — no coding, no waiting on a developer.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="inline-flex rounded-xl bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] px-7 py-3.5 font-semibold text-[#08080d]">
              Start building free
            </Link>
            <Link href="/pricing" className="inline-flex rounded-xl border border-[#24243a] px-7 py-3.5 font-semibold">
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
