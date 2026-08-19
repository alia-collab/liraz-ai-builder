import type { BuildSpec, ProductKind } from "./types";

export function starterCopy(spec: BuildSpec) {
  const he = spec.locale === "HE";
  const kind = spec.productKind;
  const name = spec.name;

  const services = defaultServices(kind, he, spec.inferredFrom);
  const faq = defaultFaq(kind, he);
  const about = he
    ? `${name} נבנה לפי הבקשה שלכם. כאן תערכו את סיפור העסק, בלי כתובת או טלפון עד שתמלאו אותם.`
    : `${name} is generated from your request. Edit this about text. Address and phone stay empty until you add them.`;

  const headline = he ? name : name;
  const value =
    kind === "STORE"
      ? he
        ? "מוצרים, עגלה והזמנה — מלאו קטלוג אמיתי לפני פרסום."
        : "Products, cart, and orders — replace sample catalog before you publish."
      : kind === "BOOKING"
        ? he
          ? "הזמנת שירות עם יומן ומניעת כפילות תורים."
          : "Book a service with a calendar that blocks double-booking."
        : he
          ? spec.purpose
          : spec.purpose;

  return { services, faq, about, headline, value };
}

function defaultServices(kind: ProductKind, he: boolean, prompt: string) {
  if (/טכנאי|computer|מחשב/.test(prompt)) {
    return he
      ? [
          { title: "תיקון ותחזוקה", description: "אבחון ותיקון במקום או מרחוק" },
          { title: "שדרוג מחשב", description: "חומרה, גיבוי והתקנות" },
          { title: "רשת ואבטחה", description: "הגדרת רשת ביתית ועסקית" },
        ]
      : [
          { title: "Repair", description: "On-site or remote diagnostics" },
          { title: "Upgrades", description: "Hardware and backup" },
          { title: "Network", description: "Home and small-office setup" },
        ];
  }
  if (kind === "STORE" || kind === "MARKETPLACE") {
    return he
      ? [
          { title: "משלוחים", description: "מדיניות המשלוח תוגדר על ידיכם" },
          { title: "החזרות", description: "תנאי ההחזרה ניתנים לעריכה" },
          { title: "תמיכה", description: "פנייה שנשמרת במערכת" },
        ]
      : [
          { title: "Shipping", description: "You set the shipping policy" },
          { title: "Returns", description: "Editable return terms" },
          { title: "Support", description: "Inquiries are stored" },
        ];
  }
  if (kind === "SAAS" || kind === "WEB_APP" || kind === "CRM") {
    return he
      ? [
          { title: "חשבון מאובטח", description: "הרשמה, התחברות והרשאות" },
          { title: "נתונים שנשמרים", description: "פעולות נשמרות במסד הנתונים" },
          { title: "ניהול", description: "מסך מנהל נפרד מהלקוח" },
        ]
      : [
          { title: "Secure accounts", description: "Sign up, login, and roles" },
          { title: "Saved data", description: "Actions persist in the database" },
          { title: "Admin", description: "Admin is isolated from customers" },
        ];
  }
  return he
    ? [
        { title: "שירות מקצועי", description: "תארו כאן את השירות הראשון" },
        { title: "ליווי לאורך הדרך", description: "תארו כאן את השירות השני" },
        { title: "מענה מהיר", description: "תארו כאן את השירות השלישי" },
      ]
    : [
        { title: "Core service", description: "Describe your first offer here" },
        { title: "Ongoing support", description: "Describe your second offer here" },
        { title: "Fast response", description: "Describe your third offer here" },
      ];
}

function defaultFaq(kind: ProductKind, he: boolean) {
  if (kind === "STORE") {
    return he
      ? [
          { q: "איך משלמים?", a: "מסך התשלום מוכן. החיוב בפועל דורש חיבור ספק סליקה על ידיכם." },
          { q: "מה לגבי משלוח?", a: "מדיניות המשלוח נמצאת בעמוד ייעודי — ערכו אותה לפני פרסום." },
        ]
      : [
          { q: "How do I pay?", a: "Checkout exists. Live charges need your payment provider keys." },
          { q: "Shipping?", a: "The shipping page is yours to edit before publish." },
        ];
  }
  if (kind === "BOOKING") {
    return he
      ? [
          { q: "איך קובעים תור?", a: "בוחרים שירות, תאריך ושעה. המערכת לא מאפשרת שני תורים חופפים." },
          { q: "אפשר לבטל?", a: "מתוך החשבון אפשר לבקש ביטול או שינוי." },
        ]
      : [
          { q: "How do I book?", a: "Pick a service, date, and time. Overlapping slots are blocked." },
          { q: "Can I cancel?", a: "Use your account to request a cancel or change." },
        ];
  }
  return he
    ? [
        { q: "איך יוצרים קשר?", a: "מלאו את הטופס — הפנייה נשמרת אצל בעל האתר." },
        { q: "האם יש כתובת או טלפון?", a: "רק אחרי שתמלאו אותם בהגדרות. המערכת לא ממציאה פרטים." },
      ]
    : [
        { q: "How do I get in touch?", a: "Submit the form — it is stored for the site owner." },
        { q: "Is there an address or phone?", a: "Only after you fill them in. We do not invent business facts." },
      ];
}
