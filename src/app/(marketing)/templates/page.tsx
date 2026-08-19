import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge-simple";
import { Layout, Store, BookOpen, Calendar, Building2, PenTool, Globe, Briefcase } from "lucide-react";

const templates = [
  { slug: "business-website", name: "Business Website", category: "Business", type: "Website", premium: false, icon: Briefcase, gradient: "from-blue-500/20 to-cyan-500/10" },
  { slug: "landing-saas", name: "SaaS Landing Page", category: "Landing", type: "Landing Page", premium: false, icon: Layout, gradient: "from-violet-500/20 to-purple-500/10" },
  { slug: "online-store", name: "Online Store", category: "E-commerce", type: "Store", premium: false, icon: Store, gradient: "from-emerald-500/20 to-teal-500/10" },
  { slug: "restaurant", name: "Restaurant & Menu", category: "Food", type: "Website", premium: false, icon: Building2, gradient: "from-orange-500/20 to-amber-500/10" },
  { slug: "portfolio", name: "Creative Portfolio", category: "Creative", type: "Portfolio", premium: false, icon: PenTool, gradient: "from-pink-500/20 to-rose-500/10" },
  { slug: "blog-magazine", name: "Blog & Magazine", category: "Content", type: "Blog", premium: false, icon: BookOpen, gradient: "from-indigo-500/20 to-blue-500/10" },
  { slug: "booking-salon", name: "Salon Booking", category: "Services", type: "Booking", premium: true, icon: Calendar, gradient: "from-brand/20 to-purple-500/10" },
  { slug: "real-estate", name: "Real Estate Listings", category: "Real Estate", type: "Website", premium: true, icon: Building2, gradient: "from-slate-500/20 to-zinc-500/10" },
  { slug: "customer-portal", name: "Customer Portal", category: "Business", type: "Portal", premium: true, icon: Globe, gradient: "from-cyan-500/20 to-blue-500/10" },
];

export default function TemplatesPage() {
  return (
    <div className="relative">
      <div className="container relative mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-14">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Templates</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start from a professional template or describe your project from scratch with AI.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tpl) => (
            <Card key={tpl.slug} className="overflow-hidden card-hover group">
              <div className={`h-44 bg-gradient-to-br ${tpl.gradient} relative flex items-center justify-center border-b overflow-hidden`}>
                <div className="absolute inset-4 rounded-lg border border-white/20 bg-background/30 backdrop-blur-sm shadow-inner" />
                <tpl.icon className="h-12 w-12 text-brand/40 relative z-10 group-hover:scale-110 transition-transform duration-300" aria-hidden="true" />
                {/* Preview placeholder blocks */}
                <div className="absolute bottom-3 inset-x-6 flex gap-1.5 opacity-40" aria-hidden="true">
                  <div className="h-1.5 flex-1 rounded-full bg-brand/30" />
                  <div className="h-1.5 w-8 rounded-full bg-brand/20" />
                </div>
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">{tpl.name}</CardTitle>
                  {tpl.premium && <Badge variant="brand">Pro</Badge>}
                </div>
                <CardDescription>{tpl.category} · {tpl.type}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full group-hover:border-brand/50 group-hover:text-brand transition-colors" asChild>
                  <Link href={`/register?template=${tpl.slug}`}>Use Template</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
