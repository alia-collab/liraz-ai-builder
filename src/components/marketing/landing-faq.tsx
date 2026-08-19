"use client";

import { useState } from "react";

const items = [
  {
    q: "Do I need to know how to code?",
    a: "No. Describe what you want in everyday language — Liraz AI handles structure, design, and the technical work.",
  },
  {
    q: "What can I build?",
    a: "Websites, landing pages, stores, booking tools, blogs, dashboards, and simple web apps — in Hebrew or English.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes. Paid plans let you connect a custom domain. Publishing also gives you a preview subdomain.",
  },
  {
    q: "Can I export my project?",
    a: "Yes. You can export your project so you are not locked in. You can also keep editing here.",
  },
];

export function LandingFaq() {
  const [open, setOpen] = useState(0);

  return (
    <div className="mx-auto max-w-3xl">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="border-b border-[#24243a] py-5">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 text-start text-[15.5px] font-semibold"
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
            >
              {item.q}
              <span className={`text-xl text-[#6b6a86] transition-transform ${isOpen ? "rotate-45 text-[#22d3ee]" : ""}`}>
                +
              </span>
            </button>
            {isOpen && <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#9d9bb4]">{item.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
