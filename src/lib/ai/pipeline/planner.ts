import type { BuildSpec, ProductKind, SetupItem, SpecPage, TypeOption } from "./types";
import type { ProjectType, Locale } from "@prisma/client";

export const TYPE_OPTIONS_HE: TypeOption[] = [
  { id: "WEBSITE", label: "אתר עסקי" },
  { id: "ECOMMERCE", label: "חנות אינטרנטית" },
  { id: "LANDING_PAGE", label: "דף נחיתה" },
  { id: "BOOKING", label: "אתר הזמנות" },
  { id: "WEB_APP", label: "אפליקציית Web" },
  { id: "PWA", label: "אפליקציה למובייל" },
  { id: "CUSTOMER_PORTAL", label: "אתר ואפליקציה משולבים" },
];

export const TYPE_OPTIONS_EN: TypeOption[] = [
  { id: "WEBSITE", label: "Business website" },
  { id: "ECOMMERCE", label: "Online store" },
  { id: "LANDING_PAGE", label: "Landing page" },
  { id: "BOOKING", label: "Booking site" },
  { id: "WEB_APP", label: "Web app" },
  { id: "PWA", label: "Mobile-oriented app" },
  { id: "CUSTOMER_PORTAL", label: "Public site + private app" },
];

function detectLocale(text: string): Locale {
  const he = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const en = (text.match(/[a-zA-Z]/g) || []).length;
  return he >= en ? "HE" : "EN";
}

const HINT_TO_KIND: Record<string, ProductKind> = {
  WEBSITE: "BUSINESS_SITE",
  LANDING_PAGE: "LANDING",
  ECOMMERCE: "STORE",
  BLOG: "BLOG",
  PORTFOLIO: "PORTFOLIO",
  BOOKING: "BOOKING",
  CUSTOMER_PORTAL: "COMBINED",
  DASHBOARD: "SAAS",
  WEB_APP: "WEB_APP",
  PWA: "PWA",
  MOBILE_APP: "NATIVE_MOBILE",
};

function kindToPrisma(kind: ProductKind): ProjectType {
  switch (kind) {
    case "LANDING":
      return "LANDING_PAGE";
    case "STORE":
    case "MARKETPLACE":
      return "ECOMMERCE";
    case "BLOG":
    case "NEWS":
      return "BLOG";
    case "PORTFOLIO":
      return "PORTFOLIO";
    case "BOOKING":
      return "BOOKING";
    case "PORTAL":
    case "COMBINED":
      return "CUSTOMER_PORTAL";
    case "SAAS":
    case "CRM":
      return "DASHBOARD";
    case "WEB_APP":
    case "COMMUNITY":
      return "WEB_APP";
    case "PWA":
      return "PWA";
    case "NATIVE_MOBILE":
      return "MOBILE_APP";
    default:
      return "WEBSITE";
  }
}

export function detectProductKind(prompt: string, hint?: string): ProductKind {
  if (hint && HINT_TO_KIND[hint]) return HINT_TO_KIND[hint];
  const p = prompt.toLowerCase();

  if (/אתר ואפליקציה|site and app|public \+ private|משולב/.test(p)) return "COMBINED";
  if (/marketplace|שוק|מרקטפלייס/.test(p)) return "MARKETPLACE";
  if (/\bcrm\b|ניהול לקוחות/.test(p)) return "CRM";
  if (/\bsaas\b|מנוי חודשי|subscription platform/.test(p)) return "SAAS";
  if (/קהילה|forum|community/.test(p)) return "COMMUNITY";
  if (/app store|play store|ios|android native|אפליקציה לחנויות/.test(p)) return "NATIVE_MOBILE";
  if (/\bpwa\b|אפליקציה למובייל|installable/.test(p)) return "PWA";
  if (/חנות|ecommerce|e-commerce|store|shop|סל קניות|checkout|סליקה/.test(p)) return "STORE";
  if (/הזמנ|שירות|טכנאי|booking|appointment|תור|יומן/.test(p)) return "BOOKING";
  if (/דף נחיתה|landing/.test(p)) return "LANDING";
  if (/חדשות|מגזין|news/.test(p)) return "NEWS";
  if (/בלוג|blog/.test(p)) return "BLOG";
  if (/פורטפוליו|portfolio/.test(p)) return "PORTFOLIO";
  if (/פורטל לקוחות|customer portal/.test(p)) return "PORTAL";
  if (/לוח בקרה|dashboard|web app|אפליקציית web|מערכת ניהול/.test(p)) return "WEB_APP";
  if (/אפליקציה/.test(p) && !/אתר/.test(p)) return "PWA";
  return "BUSINESS_SITE";
}

function isVague(prompt: string): boolean {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  if (cleaned.length < 12) return true;
  return /^(תבנה לי אתר|build (me )?a (site|website|app)|אתר|אפליקציה|website|app)[\s.!?]*$/i.test(cleaned);
}

function businessName(prompt: string, locale: Locale, kind: ProductKind): string {
  const cleaned = prompt.replace(/[\[\]]/g, " ").trim();
  if (locale === "HE") {
    if (/טכנאי/.test(cleaned)) return "טכנאי מחשבים";
    if (/חנות מחשב/.test(cleaned)) return "חנות מחשבים";
    if (/מסעד/.test(cleaned)) return "המסעדה";
    if (/יוגה/.test(cleaned)) return "סטודיו יוגה";
    if (kind === "STORE") return "החנות";
    if (kind === "SAAS" || kind === "WEB_APP") return "המערכת";
    return "העסק שלי";
  }
  if (kind === "STORE") return "The Shop";
  if (kind === "SAAS" || kind === "WEB_APP") return "The App";
  return "My Business";
}

function typeLabel(kind: ProductKind, he: boolean): string {
  const map: Record<ProductKind, [string, string]> = {
    BUSINESS_SITE: ["אתר עסקי", "Business website"],
    LANDING: ["דף נחיתה", "Landing page"],
    BLOG: ["בלוג", "Blog"],
    PORTFOLIO: ["תיק עבודות", "Portfolio"],
    STORE: ["חנות אונליין", "Online store"],
    BOOKING: ["אתר הזמנות", "Booking site"],
    NEWS: ["אתר תוכן", "News / content"],
    PORTAL: ["פורטל לקוחות", "Customer portal"],
    WEB_APP: ["אפליקציית ווב", "Web app"],
    SAAS: ["מערכת SaaS", "SaaS app"],
    CRM: ["מערכת CRM", "CRM"],
    MARKETPLACE: ["מרקטפלייס", "Marketplace"],
    COMMUNITY: ["קהילה", "Community"],
    PWA: ["אפליקציה למובייל (PWA)", "Mobile PWA"],
    NATIVE_MOBILE: ["אפליקציה לחנויות", "Native mobile app"],
    COMBINED: ["אתר + אפליקציה + ניהול", "Public site + app + admin"],
  };
  return he ? map[kind][0] : map[kind][1];
}

function pagesFor(kind: ProductKind, he: boolean, wantsWhatsapp: boolean): SpecPage[] {
  const p = (slug: string, heTitle: string, enTitle: string, purposeHe: string, purposeEn: string, extra?: Partial<SpecPage>): SpecPage => ({
    slug,
    title: he ? heTitle : enTitle,
    purpose: he ? purposeHe : purposeEn,
    ...extra,
  });

  const legal: SpecPage[] = [
    p("privacy", "פרטיות", "Privacy", "מדיניות פרטיות", "Privacy policy", { surface: "public" }),
    p("terms", "תנאים", "Terms", "תנאי שימוש", "Terms of use", { surface: "public" }),
  ];
  const contact = p("contact", "צור קשר", "Contact", "טופס פנייה שנשמר", "Working contact form", { surface: "public" });
  const leadsAdmin = p("admin-leads", "ניהול פניות", "Inquiries", "צפייה בפניות", "View stored leads", { isAdmin: true, surface: "admin" });
  const cmsAdmin = p("admin-cms", "עריכת תוכן", "Content", "עריכת טקסטים ותפריט ללא קוד", "No-code content edits", { isAdmin: true, surface: "admin" });

  switch (kind) {
    case "LANDING":
      return [
        p("home", "דף הבית", "Home", "הצעה וקריאה לפעולה", "Offer and CTA", { isHome: true, surface: "public" }),
        contact,
        ...legal,
        leadsAdmin,
        cmsAdmin,
      ];
    case "STORE":
    case "MARKETPLACE":
      return [
        p("home", "דף הבית", "Home", "חנות והנעה לרכישה", "Store and purchase CTA", { isHome: true, surface: "public" }),
        p("products", "מוצרים", "Products", "קטלוג, חיפוש וסינון", "Catalog, search, filter", { surface: "public" }),
        p("cart", "עגלה", "Cart", "עגלת קניות", "Shopping cart", { surface: "public" }),
        p("checkout", "תשלום", "Checkout", "הזמנה וחיבור תשלום", "Order and payment hook", { surface: "public" }),
        p("account", "החשבון שלי", "Account", "היסטוריית הזמנות", "Order history", { surface: "private" }),
        p("shipping", "משלוחים", "Shipping", "מדיניות משלוחים", "Shipping policy", { surface: "public" }),
        p("returns", "החזרות", "Returns", "מדיניות החזרות", "Returns policy", { surface: "public" }),
        contact,
        ...legal,
        p("login", "התחברות", "Log in", "כניסת לקוח", "Customer login", { surface: "public" }),
        p("register", "הרשמה", "Sign up", "חשבון לקוח", "Customer signup", { surface: "public" }),
        leadsAdmin,
        cmsAdmin,
        p("admin-products", "ניהול מוצרים", "Products admin", "מלאי וקטגוריות", "Inventory and categories", { isAdmin: true, surface: "admin" }),
        p("admin-orders", "הזמנות", "Orders", "ניהול הזמנות", "Order management", { isAdmin: true, surface: "admin" }),
      ];
    case "BOOKING":
      return [
        p("home", "דף הבית", "Home", "הצגה והנעה להזמנה", "Hero and book CTA", { isHome: true, surface: "public" }),
        p("services", "שירותים", "Services", "רשימת שירותים", "Service list", { surface: "public" }),
        p("book", "הזמנת שירות", "Book", "יומן ומניעת כפילויות", "Calendar with double-booking guard", { surface: "public" }),
        p("account", "ההזמנות שלי", "My bookings", "ביטול ושינוי", "Cancel or change", { surface: "private" }),
        p("about", "אודות", "About", "מי אנחנו — בלי המצאת כתובת", "About — no invented address", { surface: "public" }),
        p("faq", "שאלות", "FAQ", "שאלות נפוצות", "FAQ", { surface: "public" }),
        contact,
        ...legal,
        leadsAdmin,
        cmsAdmin,
        p("admin-appointments", "יומן ניהול", "Appointments", "סטטוסים וזמינות", "Statuses and availability", { isAdmin: true, surface: "admin" }),
      ];
    case "BLOG":
    case "NEWS":
      return [
        p("home", "דף הבית", "Home", "ראשי ומאמרים", "Home and articles", { isHome: true, surface: "public" }),
        p("articles", "מאמרים", "Articles", "רשימת תוכן ממאגר", "Content list from DB", { surface: "public" }),
        p("about", "אודות", "About", "אודות", "About", { surface: "public" }),
        contact,
        ...legal,
        leadsAdmin,
        cmsAdmin,
        p("admin-content", "עורך תוכן", "CMS", "פרסום מאמרים", "Publish articles", { isAdmin: true, surface: "admin" }),
      ];
    case "PORTFOLIO":
      return [
        p("home", "דף הבית", "Home", "עבודות נבחרות", "Selected work", { isHome: true, surface: "public" }),
        p("work", "עבודות", "Work", "גלריה", "Gallery", { surface: "public" }),
        p("about", "אודות", "About", "אודות", "About", { surface: "public" }),
        contact,
        ...legal,
        leadsAdmin,
        cmsAdmin,
      ];
    case "WEB_APP":
    case "SAAS":
    case "CRM":
    case "COMMUNITY":
    case "PORTAL":
    case "PWA":
    case "NATIVE_MOBILE":
    case "COMBINED":
      return [
        p("home", "דף הבית", "Home", "שיווק ציבורי", "Public marketing", { isHome: true, surface: "public" }),
        p("about", "אודות", "About", "אודות", "About", { surface: "public" }),
        p("services", "שירותים", "Features", "יכולות המוצר", "Product features", { surface: "public" }),
        p("pricing", "מחירים", "Pricing", "מסלולים — מחירים להגדרה", "Plans — prices to configure", { surface: "public" }),
        p("faq", "שאלות", "FAQ", "שאלות", "FAQ", { surface: "public" }),
        contact,
        ...legal,
        p("login", "התחברות", "Log in", "כניסה למערכת", "App login", { surface: "public" }),
        p("register", "הרשמה", "Sign up", "יצירת חשבון", "Create account", { surface: "public" }),
        p("dashboard", "לוח בקרה", "Dashboard", "פעולות עסקיות ושמירה", "Business actions and persistence", { surface: "private" }),
        p("profile", "פרופיל", "Profile", "פרטי משתמש", "User profile", { surface: "private" }),
        p("billing", "חיוב", "Billing", "מנוי — דורש חיבור תשלום", "Subscription — payment setup needed", { surface: "private" }),
        p("support", "תמיכה", "Support", "פנייה מתוך האפליקציה", "In-app support", { surface: "private" }),
        leadsAdmin,
        cmsAdmin,
        p("admin-users", "משתמשים", "Users", "הרשאות ובידוד", "Permissions and isolation", { isAdmin: true, surface: "admin" }),
        p("admin-stats", "סטטיסטיקה", "Stats", "מדדים אמיתיים בלבד", "Real metrics only", { isAdmin: true, surface: "admin" }),
      ];
    default: {
      const extra: SpecPage[] = [];
      if (wantsWhatsapp) {
        extra.push();
      }
      return [
        p("home", "דף הבית", "Home", "הצגה והנעה לפעולה", "Hero and CTA", { isHome: true, surface: "public" }),
        p("about", "אודות", "About", "סיפור העסק בלי פרטים מומצאים", "Business story without invented facts", { surface: "public" }),
        p("services", "שירותים", "Services", "רשימת שירותים", "Service list", { surface: "public" }),
        p("faq", "שאלות", "FAQ", "שאלות נפוצות", "FAQ", { surface: "public" }),
        contact,
        ...legal,
        leadsAdmin,
        cmsAdmin,
      ];
    }
  }
}

function dataModelFor(kind: ProductKind): BuildSpec["dataModel"] {
  const leads = {
    name: "leads",
    fields: [
      { name: "name", type: "string", required: true },
      { name: "email", type: "string" },
      { name: "phone", type: "string" },
      { name: "message", type: "string" },
      { name: "type", type: "string" },
    ],
  };
  const cms = {
    name: "cms",
    fields: [
      { name: "key", type: "string", required: true },
      { name: "value", type: "string", required: true },
    ],
  };
  const customers = {
    name: "customers",
    fields: [
      { name: "email", type: "string", required: true },
      { name: "name", type: "string" },
      { name: "role", type: "string", required: true },
    ],
  };

  if (kind === "STORE" || kind === "MARKETPLACE") {
    return [
      leads,
      cms,
      customers,
      {
        name: "products",
        fields: [
          { name: "title", type: "string", required: true },
          { name: "priceCents", type: "number", required: true },
          { name: "inventory", type: "number" },
          { name: "category", type: "string" },
          { name: "isSample", type: "boolean" },
        ],
      },
      {
        name: "orders",
        fields: [
          { name: "customerId", type: "string" },
          { name: "status", type: "string", required: true },
          { name: "totalCents", type: "number" },
        ],
      },
      { name: "coupons", fields: [{ name: "code", type: "string", required: true }, { name: "percentOff", type: "number" }] },
    ];
  }
  if (kind === "BOOKING") {
    return [
      leads,
      cms,
      customers,
      {
        name: "services",
        fields: [
          { name: "title", type: "string", required: true },
          { name: "durationMin", type: "number" },
        ],
      },
      {
        name: "appointments",
        fields: [
          { name: "serviceId", type: "string", required: true },
          { name: "startsAt", type: "datetime", required: true },
          { name: "status", type: "string", required: true },
        ],
      },
    ];
  }
  if (kind === "BLOG" || kind === "NEWS") {
    return [leads, cms, { name: "articles", fields: [{ name: "title", type: "string", required: true }, { name: "body", type: "string" }] }];
  }
  if (["WEB_APP", "SAAS", "CRM", "PORTAL", "COMBINED", "PWA", "NATIVE_MOBILE", "COMMUNITY"].includes(kind)) {
    return [
      leads,
      cms,
      customers,
      { name: "records", fields: [{ name: "title", type: "string", required: true }, { name: "status", type: "string" }] },
    ];
  }
  return [leads, cms];
}

function setupItems(kind: ProductKind, he: boolean, extras: { whatsapp?: boolean; payments?: boolean }): SetupItem[] {
  const items: SetupItem[] = [
    { key: "contact", label: he ? "מלאו טלפון / אימייל אמיתיים" : "Fill real phone / email", requiredForPublish: true, status: "needed" },
    { key: "domain", label: he ? "חיבור דומיין (אופציונלי)" : "Connect a domain (optional)", requiredForPublish: false, status: "optional" },
    { key: "analytics", label: he ? "מפתח אנליטיקס — לא מחובר עדיין" : "Analytics key — not connected yet", requiredForPublish: false, status: "needed" },
  ];
  if (extras.whatsapp) {
    items.push({ key: "whatsapp", label: he ? "מספר וואטסאפ" : "WhatsApp number", requiredForPublish: true, status: "needed" });
  }
  if (extras.payments || kind === "STORE" || kind === "SAAS" || kind === "MARKETPLACE") {
    items.push({
      key: "stripe",
      label: he ? "חיבור Stripe לסליקה — המבנה קיים, התשלום לא פעיל בלי מפתחות" : "Stripe keys required — checkout UI exists, charges are not live",
      requiredForPublish: true,
      status: "needed",
    });
  }
  if (kind === "PWA") {
    items.push({ key: "pwa-icons", label: he ? "אייקון וספלש ל־PWA" : "PWA icon and splash", requiredForPublish: false, status: "needed" });
  }
  if (kind === "NATIVE_MOBILE") {
    items.push({
      key: "native",
      label: he
        ? "בנייה לחנויות App Store / Google Play דורשת פרויקט native — לא מוכן לחנות"
        : "App Store / Play builds need a native project — not store-ready",
      requiredForPublish: false,
      status: "needed",
    });
  }
  if (kind === "PWA" || kind === "NATIVE_MOBILE") {
    items.push({
      key: "push",
      label: he ? "התראות דחיפה — דורשות מפתחות והרשאת מכשיר" : "Push notifications need keys and device permission",
      requiredForPublish: false,
      status: "needed",
    });
  }
  return items;
}

export function planFromPrompt(prompt: string, projectTypeHint?: string): BuildSpec {
  const locale = detectLocale(prompt);
  const he = locale === "HE";
  const kind = detectProductKind(prompt, projectTypeHint);
  const type = kindToPrisma(kind);
  const p = prompt.toLowerCase();
  const wantsWhatsapp = /whatsapp|וואטסאפ|ווטסאפ/.test(p);
  const wantsAuth =
    ["STORE", "BOOKING", "WEB_APP", "SAAS", "CRM", "PORTAL", "COMBINED", "PWA", "NATIVE_MOBILE", "MARKETPLACE", "COMMUNITY"].includes(kind) ||
    /התחברות|הרשמה|login|register|לקוח/.test(p);
  const wantsPayments = ["STORE", "SAAS", "MARKETPLACE"].includes(kind) || /סליקה|stripe|תשלום|checkout/.test(p);
  const vague = isVague(prompt);

  const questions: string[] = [];
  if (vague) {
    questions.push(he ? "מה תרצו לבנות?" : "What would you like to build?");
  } else if (kind === "NATIVE_MOBILE") {
    questions.push(he ? "PWA באתר, או בנייה נפרדת ל־iOS / Android / שתיהן?" : "Installable PWA, or a separate iOS / Android / both native build?");
  } else if (prompt.trim().length < 8) {
    questions.push(he ? "מה סוג העסק ומה המבקרים צריכים לעשות באתר?" : "What is the business and what should visitors do?");
  }

  const name = businessName(prompt, locale, kind);
  const pages = pagesFor(kind, he, wantsWhatsapp);
  const complexity: BuildSpec["estimatedComplexity"] =
    kind === "LANDING" || kind === "PORTFOLIO" ? "small" : ["STORE", "SAAS", "COMBINED", "MARKETPLACE", "NATIVE_MOBILE"].includes(kind) ? "large" : "medium";

  const actions = [
    he ? "שליחת פנייה שנשמרת במסד הנתונים" : "Submit an inquiry stored in the database",
    he ? "מעבר בין עמודים בניווט" : "Navigate between pages",
    ...(wantsWhatsapp ? [he ? "פתיחת וואטסאפ (אחרי הזנת מספר)" : "Open WhatsApp (after number is set)"] : []),
    ...(kind === "STORE" || kind === "MARKETPLACE" ? [he ? "עגלה והזמנה" : "Cart and order"] : []),
    ...(kind === "BOOKING" ? [he ? "קביעת תור ללא כפילות" : "Book a slot without double-booking"] : []),
    ...(wantsAuth ? [he ? "הרשמה והתחברות" : "Sign up and log in"] : []),
  ];

  const userRoles = [he ? "מבקר" : "Visitor"];
  if (wantsAuth) userRoles.push(he ? "לקוח מחובר" : "Signed-in customer");
  userRoles.push(he ? "מנהל" : "Admin");

  return {
    name,
    productType: type,
    productKind: kind,
    typeLabel: typeLabel(kind, he),
    purpose: he ? `${typeLabel(kind, true)} לפי הבקשה: ${prompt.slice(0, 180)}` : `${typeLabel(kind, false)}: ${prompt.slice(0, 180)}`,
    audience: he ? "לקוחות במובייל ובמחשב" : "Customers on mobile and desktop",
    locale,
    direction: he ? "RTL" : "LTR",
    pages,
    actions,
    userRoles,
    dataModel: dataModelFor(kind),
    forms: [
      { name: kind === "BOOKING" ? "booking" : "contact", type: kind === "BOOKING" ? "booking" : "contact", fields: ["name", "phone", "email", "message"], submitTo: "leads" },
      ...(wantsAuth ? [{ name: "auth", type: "auth" as const, fields: ["email", "password"], submitTo: "auth" as const }] : []),
      ...(kind === "STORE" || kind === "MARKETPLACE" ? [{ name: "checkout", type: "checkout" as const, fields: ["name", "email"], submitTo: "records" as const }] : []),
    ],
    integrations: {
      whatsapp: wantsWhatsapp,
      whatsappNote: wantsWhatsapp
        ? he
          ? "כפתור wa.me — המספר יוגדר בהגדרות. בלי מספר זה לא פרסום."
          : "wa.me button — number must be set. Not publish-ready without it."
        : undefined,
      auth: wantsAuth,
      payments: wantsPayments,
      cms: true,
      push: kind === "PWA" || kind === "NATIVE_MOBILE",
      nativeStores: kind === "NATIVE_MOBILE",
    },
    visual: {
      style: kind === "BOOKING" ? "trust-service" : kind === "STORE" ? "catalog-clean" : kind === "SAAS" || kind === "WEB_APP" ? "product-saas" : "professional-clean",
      primaryColor: kind === "BOOKING" ? "#0f766e" : kind === "STORE" ? "#1d4ed8" : "#1e3a5f",
      secondaryColor: "#0f172a",
      fontFamily: "Assistant, Heebo, system-ui, sans-serif",
      designOptions: [
        { id: "trust", name: he ? "שירות ואמון" : "Trust / service", primaryColor: "#0f766e", style: "trust-service" },
        { id: "bold", name: he ? "מודרני כהה" : "Modern dark", primaryColor: "#1e3a5f", style: "professional-clean" },
        { id: "warm", name: he ? "חם ונגיש" : "Warm", primaryColor: "#c2410c", style: "warm-approachable" },
      ],
    },
    mobile: true,
    admin: true,
    surfaces: Array.from(new Set(pages.map((pg) => pg.surface ?? "public"))),
    cmsCollections: ["headlines", "services", "faq", "contact", "hours", "social", "seo", "menu", "cta"],
    missingBusinessFacts: [
      he ? "כתובת פיזית — לא הומצאה" : "Physical address — not invented",
      he ? "טלפון — לא הומצא" : "Phone — not invented",
      he ? "ביקורות / לקוחות / מספרים עסקיים — לא הומצאו" : "Reviews / clients / stats — not invented",
    ],
    needsSetup: setupItems(kind, he, { whatsapp: wantsWhatsapp, payments: wantsPayments }),
    estimatedComplexity: complexity,
    estimatedMinutes: complexity === "small" ? 8 : complexity === "large" ? 40 : 18,
    successCriteria: [
      he ? "כל קישור בתפריט מוביל לעמוד קיים" : "Every nav link resolves",
      he ? "טופס נשמר בטבלת פניות" : "Form stores a lead row",
      he ? "אין Lorem Ipsum" : "No lorem ipsum",
      he ? "RTL ומובייל תקינים" : "RTL and mobile layout",
      ...(wantsWhatsapp ? [he ? "וואטסאפ דורש מספר אמיתי לפני פרסום" : "WhatsApp needs a real number before publish"] : []),
    ],
    questions: questions.slice(0, 3),
    typeOptions: vague ? (he ? TYPE_OPTIONS_HE : TYPE_OPTIONS_EN) : undefined,
    needsClarification: questions.length > 0,
    inferredFrom: prompt,
  };
}
