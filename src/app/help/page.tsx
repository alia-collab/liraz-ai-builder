import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, MessageCircle, Rocket } from "lucide-react";

export default function HelpCenterPage() {
  const articles = [
    { title: "Creating your first project", href: "/onboarding" },
    { title: "Using the AI chat editor", href: "/features" },
    { title: "Publishing your site", href: "/features" },
    { title: "Connecting a custom domain", href: "/features" },
    { title: "Managing billing & subscriptions", href: "/pricing" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">Help Center</h1>
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader>
              <Rocket className="h-8 w-8 text-brand mb-2" />
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild><Link href="/register">Create Account</Link></Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <MessageCircle className="h-8 w-8 text-brand mb-2" />
              <CardTitle>Contact Support</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild><Link href="/contact">Contact Us</Link></Button>
            </CardContent>
          </Card>
        </div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5" /> Articles
        </h2>
        <ul className="space-y-2">
          {articles.map((a) => (
            <li key={a.title}>
              <Link href={a.href} className="text-brand hover:underline">{a.title}</Link>
            </li>
          ))}
        </ul>
      </main>
      <MarketingFooter />
    </div>
  );
}
