import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark marketing-shell relative flex min-h-screen flex-col overflow-x-hidden bg-[#08080d] text-[#eceaf5]">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <div className="absolute -left-[150px] -top-[200px] h-[600px] w-[600px] rounded-full bg-[#7c5cff] opacity-35 blur-[120px]" />
        <div className="absolute -right-[200px] top-[200px] h-[500px] w-[500px] rounded-full bg-[#22d3ee] opacity-[0.22] blur-[120px]" />
        <div className="absolute bottom-[-250px] left-[30%] h-[500px] w-[500px] rounded-full bg-[#ff5cb3] opacity-15 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-100"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
          }}
        />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col">
        <MarketingHeader />
        <main className="flex-1">{children}</main>
        <MarketingFooter />
      </div>
    </div>
  );
}
