import type { ProjectSnapshot, EditorComponent, PageSnapshot } from "../types";
import type { BuildSpec, SpecPage } from "./types";
import { starterCopy } from "./copy";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function href(projectId: string, slug: string) {
  return `/preview/${projectId}/${slug}`;
}

function nav(spec: BuildSpec, projectId: string): EditorComponent {
  const preferred = ["home", "services", "work", "products", "articles", "pricing", "book", "about", "faq", "contact", "login"];
  const publicPages = spec.pages.filter((p) => !p.isAdmin && p.surface !== "private");
  const ordered = [
    ...preferred.map((slug) => publicPages.find((p) => p.slug === slug)).filter(Boolean),
    ...publicPages.filter((p) => !preferred.includes(p.slug)),
  ] as SpecPage[];
  const links = ordered.slice(0, 8).map((p) => ({
    label: p.title,
    href: href(projectId, p.slug),
  }));
  return {
    id: uid("nav"),
    type: "Navbar",
    props: { brand: spec.name, links },
  };
}

function footer(spec: BuildSpec, projectId: string): EditorComponent {
  const he = spec.locale === "HE";
  const legal = spec.pages
    .filter((p) => ["privacy", "terms", "shipping", "returns"].includes(p.slug))
    .map((p) => ({ label: p.title, href: href(projectId, p.slug) }));
  return {
    id: uid("footer"),
    type: "Footer",
    props: {
      text: he ? `© ${spec.name} — כל הזכויות שמורות` : `© ${spec.name}`,
      links: legal,
    },
  };
}

function missingFacts(spec: BuildSpec): EditorComponent {
  const he = spec.locale === "HE";
  return {
    id: uid("facts"),
    type: "MissingFacts",
    props: {
      title: he ? "פרטים שצריך למלא לפני פרסום" : "Fill these before publishing",
      items: spec.missingBusinessFacts,
    },
  };
}

function wrapPage(
  spec: BuildSpec,
  projectId: string,
  page: SpecPage,
  extra: EditorComponent[],
  navbar: EditorComponent,
  foot: EditorComponent
): PageSnapshot {
  return {
    slug: page.slug,
    title: page.title,
    locale: spec.locale,
    direction: spec.direction,
    components: [navbar, ...extra, foot],
    seo: {
      title: `${page.title} | ${spec.name}`,
      description: page.purpose.slice(0, 160),
    },
  };
}

export function buildSnapshotFromSpec(spec: BuildSpec, projectId: string): ProjectSnapshot {
  const he = spec.locale === "HE";
  const navbar = nav(spec, projectId);
  const foot = footer(spec, projectId);
  const copy = starterCopy(spec);
  const whatsappHref = spec.integrations.whatsapp ? "https://wa.me/" : undefined;
  const ctaSlug = spec.pages.find((p) => p.slug === "book")?.slug ?? spec.pages.find((p) => p.slug === "register")?.slug ?? "contact";

  const pages: PageSnapshot[] = spec.pages.map((page) => {
    const components: EditorComponent[] = [];

    if (page.slug === "home") {
      components.push({
        id: uid("hero"),
        type: "Hero",
        props: {
          title: copy.headline,
          subtitle: copy.value,
          ctaText: spec.pages.find((p) => p.slug === "book")
            ? he
              ? "הזמנת שירות"
              : "Book a visit"
            : spec.pages.find((p) => p.slug === "products")
              ? he
                ? "לקטלוג"
                : "Browse products"
              : spec.pages.find((p) => p.slug === "register")
                ? he
                  ? "הרשמה"
                  : "Sign up"
                : he
                  ? "צור קשר"
                  : "Contact",
          ctaLink: href(projectId, ctaSlug),
          background: "solid",
        },
      });
      components.push({
        id: uid("feat"),
        type: spec.pages.some((p) => p.slug === "services") ? "Services" : "Features",
        props: {
          title: he ? "מה תמצאו כאן" : "What you get",
          items: copy.services,
        },
      });
      if (spec.pages.some((p) => p.slug === "faq")) {
        components.push({
          id: uid("faqhome"),
          type: "Faq",
          props: { title: he ? "שאלות נפוצות" : "FAQ", items: copy.faq },
        });
      }
      if (whatsappHref) {
        components.push({
          id: uid("wa"),
          type: "WhatsAppButton",
          props: { label: he ? "וואטסאפ" : "WhatsApp", href: whatsappHref, needsSetup: true },
        });
      }
      components.push(missingFacts(spec));
    } else if (page.slug === "services" || page.slug === "work") {
      components.push({
        id: uid("svc"),
        type: "Services",
        props: { title: page.title, items: copy.services },
      });
    } else if (page.slug === "about") {
      components.push({
        id: uid("about"),
        type: "About",
        props: { title: page.title, body: copy.about },
      });
      components.push(missingFacts(spec));
    } else if (page.slug === "faq") {
      components.push({
        id: uid("faq"),
        type: "Faq",
        props: { title: page.title, items: copy.faq },
      });
    } else if (page.slug === "book" || page.slug === "contact" || page.slug === "support") {
      const isBook = page.slug === "book";
      components.push({
        id: uid("form"),
        type: isBook ? "BookingForm" : "ContactForm",
        props: {
          title: isBook ? (he ? "הזמנת שירות" : "Request service") : he ? "טופס פנייה" : "Contact form",
          submitText: he ? "שליחה" : "Send",
          leadType: isBook ? "booking" : "contact",
          emptyHint: he ? "הפנייה תישמר אצל בעל האתר" : "The inquiry is saved for the site owner",
        },
      });
      if (isBook) {
        components.push({
          id: uid("cal"),
          type: "BookingCalendar",
          props: {
            title: he ? "בחירת מועד" : "Pick a time",
            hint: he ? "לא ניתן לקבוע שני תורים באותו זמן" : "Overlapping appointments are blocked",
          },
        });
      }
      if (whatsappHref && page.slug === "contact") {
        components.push({
          id: uid("wa2"),
          type: "WhatsAppButton",
          props: { label: he ? "או כתבו בוואטסאפ" : "Or WhatsApp us", href: whatsappHref, needsSetup: true },
        });
      }
    } else if (page.slug === "products") {
      components.push({
        id: uid("search"),
        type: "SearchFilter",
        props: { placeholder: he ? "חיפוש מוצר או קטגוריה" : "Search products or category" },
      });
      components.push({
        id: uid("grid"),
        type: "ProductGrid",
        props: {
          title: he ? "מוצרים" : "Products",
          emptyHint: he ? "אין מוצרים עדיין — זהו מצב ריק אמיתי" : "No products yet — a real empty state",
        },
      });
    } else if (page.slug === "cart") {
      components.push({
        id: uid("cart"),
        type: "Cart",
        props: {
          title: he ? "עגלה" : "Cart",
          checkoutHref: href(projectId, "checkout"),
        },
      });
    } else if (page.slug === "checkout") {
      components.push({
        id: uid("check"),
        type: "Checkout",
        props: {
          title: he ? "השלמת הזמנה" : "Checkout",
          note: he
            ? "ההזמנה נשמרת. חיוב אמיתי דורש חיבור Stripe — לא מופעל בלי מפתחות."
            : "The order is stored. Live charging needs Stripe keys — not enabled without them.",
        },
      });
    } else if (page.slug === "login" || page.slug === "register") {
      components.push({
        id: uid("auth"),
        type: "AuthForm",
        props: {
          mode: page.slug,
          title: page.title,
          nextHref: href(projectId, spec.pages.some((p) => p.slug === "dashboard") ? "dashboard" : "account"),
        },
      });
    } else if (page.slug === "dashboard") {
      components.push({
        id: uid("dash"),
        type: "AppDashboard",
        props: {
          title: he ? "לוח הבקרה" : "Dashboard",
          hint: he ? "רשומות נשמרות במסד הנתונים של הפרויקט" : "Records persist in this project's database",
        },
      });
    } else if (page.slug === "profile" || page.slug === "account") {
      components.push({
        id: uid("profile"),
        type: "AccountPanel",
        props: {
          title: page.title,
          kind: spec.productKind === "STORE" || spec.productKind === "MARKETPLACE" ? "orders" : spec.productKind === "BOOKING" ? "appointments" : "profile",
        },
      });
    } else if (page.slug === "billing" || page.slug === "pricing") {
      components.push({
        id: uid("pay"),
        type: "PricingPlans",
        props: {
          title: page.title,
          note: he
            ? "המחירים כאן ניתנים לעריכה. סליקה חיה דורשת הגדרה — אין לטעון שהתשלום פעיל."
            : "Prices are editable. Live billing needs setup — do not claim payments are on.",
        },
      });
    } else if (page.slug === "articles") {
      components.push({
        id: uid("arts"),
        type: "ArticleList",
        props: { title: page.title, emptyHint: he ? "אין מאמרים עדיין" : "No articles yet" },
      });
    } else if (page.slug === "privacy" || page.slug === "terms" || page.slug === "shipping" || page.slug === "returns") {
      components.push({
        id: uid("legal"),
        type: "Legal",
        props: {
          title: page.title,
          body: he
            ? "טיוטת מדיניות לעריכה. זו אינה ייעוץ משפטי. התאימו לפני פרסום."
            : "Editable policy draft. This is not legal advice. Review before publish.",
        },
      });
    } else if (page.slug === "admin-leads") {
      components.push({
        id: uid("adm"),
        type: "AdminLeads",
        props: { title: he ? "פניות שהתקבלו" : "Received inquiries" },
      });
    } else if (page.slug === "admin-cms") {
      components.push({
        id: uid("cms"),
        type: "AdminCms",
        props: { title: he ? "עריכת תוכן" : "Edit content" },
      });
    } else if (page.slug === "admin-products") {
      components.push({
        id: uid("ap"),
        type: "AdminRecords",
        props: { title: page.title, kind: "product", label: he ? "מוצר" : "product" },
      });
    } else if (page.slug === "admin-orders") {
      components.push({
        id: uid("ao"),
        type: "AdminRecords",
        props: { title: page.title, kind: "order", label: he ? "הזמנה" : "order" },
      });
    } else if (page.slug === "admin-appointments") {
      components.push({
        id: uid("aa"),
        type: "AdminRecords",
        props: { title: page.title, kind: "appointment", label: he ? "תור" : "appointment" },
      });
    } else if (page.slug === "admin-users") {
      components.push({
        id: uid("au"),
        type: "AdminRecords",
        props: { title: page.title, kind: "customer", label: he ? "משתמש" : "user" },
      });
    } else if (page.slug === "admin-stats") {
      components.push({
        id: uid("st"),
        type: "AdminStats",
        props: { title: page.title, note: he ? "מוצגים רק מספרים אמיתיים מהמסד" : "Only real database counts" },
      });
    } else if (page.slug === "admin-content") {
      components.push({
        id: uid("ac"),
        type: "AdminRecords",
        props: { title: page.title, kind: "article", label: he ? "מאמר" : "article" },
      });
    } else {
      components.push({
        id: uid("text"),
        type: "Text",
        props: { text: page.purpose },
      });
    }

    return wrapPage(spec, projectId, page, components, navbar, foot);
  });

  return {
    name: spec.name,
    description: spec.purpose,
    type: spec.productType,
    locale: spec.locale,
    direction: spec.direction,
    theme: {
      primaryColor: spec.visual.primaryColor,
      fontFamily: spec.visual.fontFamily,
      borderRadius: "0.75rem",
    },
    pages,
    backend: {
      tables: spec.dataModel,
      authEnabled: Boolean(spec.integrations.auth),
      paymentsEnabled: Boolean(spec.integrations.payments),
    },
  };
}
