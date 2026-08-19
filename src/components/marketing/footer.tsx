import Link from "next/link";

export async function MarketingFooter() {
  return (
    <footer className="mt-10 border-t border-[#24243a] px-6 py-14 md:px-8">
      <div className="mx-auto grid max-w-[1180px] gap-8 pb-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5 text-[18px] font-bold">
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] font-mono text-sm font-bold text-[#08080d]">
              L
            </span>
            Liraz AI
          </div>
          <p className="mt-3.5 max-w-[260px] text-[13.5px] leading-relaxed text-[#6b6a86]">
            Describe it, and Liraz AI builds it — websites and apps for anyone, no programming required.
          </p>
        </div>
        <div>
          <h4 className="mb-4 text-[13px] uppercase tracking-wide text-[#6b6a86]">Product</h4>
          <ul className="space-y-2.5 text-sm text-[#9d9bb4]">
            <li><Link href="/features" className="hover:text-[#eceaf5]">Features</Link></li>
            <li><Link href="/templates" className="hover:text-[#eceaf5]">Examples</Link></li>
            <li><Link href="/pricing" className="hover:text-[#eceaf5]">Pricing</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-[13px] uppercase tracking-wide text-[#6b6a86]">Support</h4>
          <ul className="space-y-2.5 text-sm text-[#9d9bb4]">
            <li><Link href="/help" className="hover:text-[#eceaf5]">Help</Link></li>
            <li><Link href="/contact" className="hover:text-[#eceaf5]">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-[13px] uppercase tracking-wide text-[#6b6a86]">Legal</h4>
          <ul className="space-y-2.5 text-sm text-[#9d9bb4]">
            <li><Link href="/privacy" className="hover:text-[#eceaf5]">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-[#eceaf5]">Terms</Link></li>
            <li><Link href="/refund" className="hover:text-[#eceaf5]">Refunds</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1180px] flex-wrap justify-between gap-3 border-t border-[#24243a] pt-6 text-[13px] text-[#6b6a86]">
        <span>© {new Date().getFullYear()} Liraz AI. All rights reserved.</span>
        <span>lirazai.com</span>
      </div>
    </footer>
  );
}
