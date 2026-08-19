import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";

function LegalBanner() {
  return (
    <div className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-4 py-3 text-center text-sm text-amber-800 dark:text-amber-200">
      <strong>DRAFT</strong> — This document requires review and approval by legal counsel before commercial launch.
    </div>
  );
}

export function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <LegalBanner />
      <MarketingHeader />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">{title}</h1>
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-4 text-sm leading-relaxed">
          {children}
        </div>
        <p className="mt-12 text-xs text-muted-foreground">
          Last updated: {new Date().toISOString().split("T")[0]} ·{" "}
          <Link href="/" className="text-brand hover:underline">Back to home</Link>
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
