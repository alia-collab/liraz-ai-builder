"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/templates", label: "Examples" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#24243a] bg-[#08080d]/70 backdrop-blur-md">
      <nav className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-[18px] font-bold tracking-tight">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] font-mono text-sm font-bold text-[#08080d]">
            L
          </span>
          Liraz AI
        </Link>
        <ul className="hidden items-center gap-8 text-[14.5px] text-[#9d9bb4] md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="hover:text-[#eceaf5]">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-4 md:flex">
          <Link href="/login" className="text-[14.5px] text-[#9d9bb4] hover:text-[#eceaf5]">
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex rounded-[10px] bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] px-[22px] py-[11px] text-[14.5px] font-semibold text-[#08080d] shadow-[0_8px_24px_-6px_rgba(124,92,255,0.45)]"
          >
            Start building free
          </Link>
        </div>
        <button type="button" className="p-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </nav>
      {open && (
        <div className="space-y-3 border-t border-[#24243a] px-6 py-4 md:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="block py-1 text-sm text-[#9d9bb4]" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <Link href="/login" className="block py-1 text-sm">
            Log in
          </Link>
          <Link href="/register" className="block rounded-lg bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] px-4 py-2 text-center text-sm font-semibold text-[#08080d]">
            Start building free
          </Link>
        </div>
      )}
    </header>
  );
}
