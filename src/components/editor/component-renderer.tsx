import type { EditorComponent } from "@/lib/ai/types";
import { LeadCaptureForm } from "@/components/preview/lead-capture-form";
import { AdminLeadsPanel } from "@/components/preview/admin-leads-panel";
import {
  ProductGridLive,
  CartLive,
  CheckoutLive,
  BookingCalendarLive,
  AuthFormLive,
  AppDashboardLive,
  AccountPanelLive,
  AdminRecordsLive,
  AdminCmsLive,
  AdminStatsLive,
  ArticleListLive,
} from "@/components/preview/app-widgets";

interface ComponentRendererProps {
  components: EditorComponent[];
  theme?: { primaryColor?: string };
  projectId?: string;
  selectable?: boolean;
  selectedId?: string | null;
  onSelect?: (component: EditorComponent) => void;
}

export function ComponentRenderer({
  components,
  theme,
  projectId,
  selectable,
  selectedId,
  onSelect,
}: ComponentRendererProps) {
  return (
    <div className="space-y-0">
      {components.map((comp) => (
        <Selectable
          key={comp.id}
          component={comp}
          selectable={selectable}
          selected={selectedId === comp.id}
          onSelect={onSelect}
        >
          <RenderComponent component={comp} theme={theme} projectId={projectId} />
        </Selectable>
      ))}
    </div>
  );
}

function Selectable({
  component,
  selectable,
  selected,
  onSelect,
  children,
}: {
  component: EditorComponent;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (component: EditorComponent) => void;
  children: React.ReactNode;
}) {
  if (!selectable) return <>{children}</>;
  return (
    <div
      data-component-id={component.id}
      data-component-type={component.type}
      className={`relative ${selected ? "ring-2 ring-[#7c5cff] ring-offset-2" : "hover:ring-1 hover:ring-[#7c5cff]/40"}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect?.(component);
      }}
    >
      {selected && (
        <span className="absolute start-2 top-2 z-20 rounded bg-[#7c5cff] px-1.5 py-0.5 text-[10px] font-medium text-white">
          {component.type}
        </span>
      )}
      {children}
    </div>
  );
}

function RenderComponent({
  component,
  theme,
  projectId,
}: {
  component: EditorComponent;
  theme?: { primaryColor?: string };
  projectId?: string;
}) {
  const primary = theme?.primaryColor ?? "#0f766e";
  const props = component.props as Record<string, unknown>;

  switch (component.type) {
    case "Navbar": {
      const links = (props.links as Array<{ label: string; href: string }>) ?? [];
      return (
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4">
          <a href={projectId ? `/preview/${projectId}/home` : "#"} className="font-bold">
            {String(props.brand ?? "")}
          </a>
          <nav className="flex flex-wrap justify-end gap-4 text-sm">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="hover:underline">
                {l.label}
              </a>
            ))}
          </nav>
        </header>
      );
    }
    case "Footer": {
      const links = (props.links as Array<{ label: string; href: string }>) ?? [];
      return (
        <footer className="mt-8 border-t px-6 py-8 text-center text-sm text-muted-foreground">
          <p>{String(props.text ?? "")}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-4">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="hover:underline">
                {l.label}
              </a>
            ))}
          </div>
        </footer>
      );
    }
    case "Hero":
      return (
        <section className="px-6 py-20 text-center" style={{ backgroundColor: `${primary}12` }}>
          <h1 className="mb-4 text-4xl font-bold">{String(props.title ?? "")}</h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">{String(props.subtitle ?? "")}</p>
          <a
            href={String(props.ctaLink ?? "#")}
            className="inline-block rounded-md px-6 py-3 font-medium text-white"
            style={{ backgroundColor: primary }}
          >
            {String(props.ctaText ?? "המשך")}
          </a>
        </section>
      );
    case "Features":
    case "Services": {
      const items = (props.items as Array<{ title: string; description: string }>) ?? [];
      return (
        <section className="px-6 py-16">
          <h2 className="mb-10 text-center text-2xl font-bold">{String(props.title ?? "")}</h2>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {items.map((item, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 text-center">
                <h3 className="mb-2 font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      );
    }
    case "Faq": {
      const items = (props.items as Array<{ q: string; a: string }>) ?? [];
      return (
        <section className="mx-auto max-w-2xl px-6 py-16">
          <h2 className="mb-8 text-center text-2xl font-bold">{String(props.title ?? "")}</h2>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.q} className="rounded-xl border p-4">
                <p className="font-semibold">{item.q}</p>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      );
    }
    case "About":
    case "Legal":
      return (
        <section className="mx-auto max-w-2xl px-6 py-16">
          <h2 className="mb-4 text-2xl font-bold">{String(props.title ?? "")}</h2>
          <p className="leading-relaxed text-muted-foreground">{String(props.body ?? "")}</p>
        </section>
      );
    case "MissingFacts": {
      const items = (props.items as string[]) ?? [];
      return (
        <section className="mx-auto max-w-2xl px-6 py-8">
          <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-50/60 p-4 dark:bg-amber-950/20">
            <p className="mb-2 text-sm font-semibold">{String(props.title ?? "")}</p>
            <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
      );
    }
    case "ContactForm":
    case "BookingForm":
      return (
        <LeadCaptureForm
          projectId={projectId ?? ""}
          title={String(props.title ?? "")}
          submitText={String(props.submitText ?? "שליחה")}
          leadType={String(props.leadType ?? "contact")}
          primary={primary}
          emptyHint={props.emptyHint ? String(props.emptyHint) : undefined}
        />
      );
    case "WhatsAppButton":
      return (
        <div className="px-6 py-6 text-center">
          <a
            href={String(props.href ?? "https://wa.me/")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-medium text-white"
            style={{ backgroundColor: "#16a34a" }}
          >
            {String(props.label ?? "WhatsApp")}
          </a>
          {props.needsSetup ? <p className="mt-2 text-xs text-muted-foreground">יש למלא מספר אמיתי לפני פרסום</p> : null}
        </div>
      );
    case "AdminLeads":
      return projectId ? <AdminLeadsPanel projectId={projectId} title={String(props.title ?? "Leads")} /> : null;
    case "ProductGrid":
      return projectId ? (
        <ProductGridLive projectId={projectId} title={String(props.title ?? "")} emptyHint={String(props.emptyHint ?? "")} />
      ) : null;
    case "SearchFilter":
      return null;
    case "Cart":
      return projectId ? (
        <CartLive projectId={projectId} title={String(props.title ?? "")} checkoutHref={String(props.checkoutHref ?? "#")} />
      ) : null;
    case "Checkout":
      return projectId ? (
        <CheckoutLive projectId={projectId} title={String(props.title ?? "")} note={String(props.note ?? "")} />
      ) : null;
    case "BookingCalendar":
      return projectId ? (
        <BookingCalendarLive projectId={projectId} title={String(props.title ?? "")} hint={String(props.hint ?? "")} />
      ) : null;
    case "AuthForm":
      return projectId ? (
        <AuthFormLive
          projectId={projectId}
          mode={String(props.mode ?? "login")}
          title={String(props.title ?? "")}
          nextHref={String(props.nextHref ?? "#")}
        />
      ) : null;
    case "AppDashboard":
      return projectId ? (
        <AppDashboardLive projectId={projectId} title={String(props.title ?? "")} hint={String(props.hint ?? "")} />
      ) : null;
    case "AccountPanel":
      return projectId ? (
        <AccountPanelLive projectId={projectId} title={String(props.title ?? "")} kind={String(props.kind ?? "profile")} />
      ) : null;
    case "PricingPlans":
      return (
        <section className="mx-auto max-w-lg px-6 py-16 text-center">
          <h2 className="mb-3 text-2xl font-bold">{String(props.title ?? "")}</h2>
          <p className="text-sm text-muted-foreground">{String(props.note ?? "")}</p>
        </section>
      );
    case "ArticleList":
      return projectId ? (
        <ArticleListLive projectId={projectId} title={String(props.title ?? "")} emptyHint={String(props.emptyHint ?? "")} />
      ) : null;
    case "AdminCms":
      return projectId ? <AdminCmsLive projectId={projectId} title={String(props.title ?? "")} /> : null;
    case "AdminRecords":
      return projectId ? (
        <AdminRecordsLive
          projectId={projectId}
          title={String(props.title ?? "")}
          kind={String(props.kind ?? "record")}
          label={String(props.label ?? "item")}
        />
      ) : null;
    case "AdminStats":
      return projectId ? (
        <AdminStatsLive projectId={projectId} title={String(props.title ?? "")} note={String(props.note ?? "")} />
      ) : null;
    case "Heading":
      return <h2 className="px-6 py-2 text-2xl font-bold">{String(props.text ?? "")}</h2>;
    case "Text":
      return <p className="px-6 py-2 text-muted-foreground">{String(props.text ?? "")}</p>;
    default:
      return (
        <div className="m-4 rounded border border-dashed p-4 text-center text-sm text-muted-foreground">{component.type}</div>
      );
  }
}
