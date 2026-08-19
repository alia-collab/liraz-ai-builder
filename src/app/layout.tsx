import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { getCanonicalOrigin } from "@/lib/site-url";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-geist-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

const siteUrl = getCanonicalOrigin();
const siteDescription = "Build websites and apps with AI — no code required. Hebrew & English.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Liraz AI Builder",
    template: "%s | Liraz AI Builder",
  },
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Liraz AI Builder",
    title: "Liraz AI Builder",
    description: siteDescription,
    locale: "en_US",
    alternateLocale: ["he_IL"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Liraz AI Builder",
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = locale === "he" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans min-h-screen`}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <SessionProvider>{children}</SessionProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
