import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sparkles, Layout, ShoppingCart, Globe, Smartphone,
  CreditCard, Users, Lock, BarChart3, FileText,
} from "lucide-react";

const featureGroups = [
  {
    title: "AI-Powered Creation",
    icon: Sparkles,
    items: [
      "Natural language in Hebrew & English",
      "Powered by Claude, OpenAI, or mock for dev",
      "Auto-generate structure, design, content & database",
      "Chat-based editing: colors, pages, features",
      "AI content & image generation",
      "Safe code validation — no malicious output",
    ],
  },
  {
    title: "Visual Editor",
    icon: Layout,
    items: [
      "Drag & drop components",
      "Text, images, buttons, forms, galleries, FAQ",
      "Responsive: desktop, tablet, mobile",
      "Undo / Redo with version history",
      "Auto-save",
      "RTL & LTR editing",
      "SEO settings per page",
      "Industry templates",
    ],
  },
  {
    title: "Project Types",
    icon: Globe,
    items: [
      "Websites & landing pages",
      "E-commerce stores",
      "Blogs & portfolios",
      "Booking & appointment systems",
      "Customer portals & dashboards",
      "PWA installable apps",
    ],
  },
  {
    title: "Publishing",
    icon: Smartphone,
    items: [
      "One-click publish",
      "Auto subdomain with SSL",
      "Custom domain connection",
      "Dev / Preview / Production environments",
      "Rollback to previous version",
      "Deployment logs & status",
    ],
  },
  {
    title: "Billing & Subscriptions",
    icon: CreditCard,
    items: [
      "PayPal Checkout & Subscriptions (no card storage on our servers)",
      "Monthly & yearly plans",
      "Free trial period",
      "Coupons & discount codes",
      "Invoices & receipts",
      "Upgrade / downgrade / cancel",
      "Failed payment handling",
      "Read-only grace period after cancellation",
    ],
  },
  {
    title: "Team & Permissions",
    icon: Users,
    items: [
      "Owner, Admin, Editor, Viewer roles",
      "Team invitations",
      "Project-level access control",
      "Support access with customer approval",
    ],
  },
  {
    title: "Security",
    icon: Lock,
    items: [
      "MFA for admins",
      "Encrypted data at rest & in transit",
      "Rate limiting & brute force protection",
      "CSRF, XSS, SQL injection protection",
      "Full tenant isolation",
      "Immutable audit logs",
      "No backdoors — legitimate admin access only",
    ],
  },
  {
    title: "Admin & Analytics",
    icon: BarChart3,
    items: [
      "Super Admin panel with MFA",
      "User & subscription management",
      "AI usage & cost dashboard",
      "Configurable pricing & quotas",
      "Feature flags & maintenance mode",
      "CSV export & reports",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="relative">
      <div className="container relative mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-14">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Platform Features</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to build, edit, publish, and manage websites and apps — without writing code.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {featureGroups.map((group) => (
            <Card key={group.title} className="card-hover shadow-soft">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10">
                    <group.icon className="h-5 w-5 text-brand" aria-hidden="true" />
                  </div>
                  <CardTitle>{group.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4 mt-0.5 shrink-0 text-brand/60" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
