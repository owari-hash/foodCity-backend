/**
 * Fallback rule-based bot replies (MN). `chatService` resolves the reply as:
 * 1) Admin «Чатбот» tree: user message normalized equals a choice **label** → that
 *    node’s **answer** (`chatbotFromSite.getConfiguredBotReply`).
 * 2) Else these keyword rules (`getBotReply`).
 * When `humanMode` is true, the API skips bot replies entirely.
 */

const DEFAULT_REPLY =
  "Таны асуултыг бид хүлээн авлаа. Оператортой холбогдохыг хүсвэл шууд чатнаас хүлээн авна уу эсвэл +976 1100-0000 дугаарт залгана уу.";

/** Lowercase, trim, stable Unicode, single spaces — better Cyrillic matching. */
export function normalizeUserText(text: string): string {
  return text
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

type ReplyRule = {
  /** Higher runs first; use for more specific intents over generic keywords. */
  priority: number;
  test: (n: string) => boolean;
  reply: string;
};

const rules: ReplyRule[] = [
  {
    priority: 95,
    test: (n) =>
      n.includes("баярлалаа") ||
      n.includes("thanks") ||
      n.includes("thank you") ||
      n.includes("thankyou"),
    reply: "Тустай сайхан байна! Өөр асуулт байвал энд бичнэ үү.",
  },
  {
    priority: 90,
    test: (n) =>
      n.startsWith("сайн байна") ||
      n.includes("сайн байна уу") ||
      n === "сайн уу" ||
      n === "сайн" ||
      /^hello\b/.test(n) ||
      /^hi\b/.test(n) ||
      /^hey\b/.test(n),
    reply:
      "Сайн байна уу! Захиалга, борлуулалтын зар, ажлын зарын талаар асууж болно. Тодорхой зүйл хайвал доорх сонголтуудыг ашиглана уу.",
  },
  {
    priority: 88,
    test: (n) =>
      n.includes("холбоо барих") ||
      n.includes("утасны дугаар") ||
      (n.includes("утас") && (n.includes("дугаар") || n.includes("залгах"))) ||
      (n.includes("имэйл") && n.includes("хаяг")),
    reply:
      "Утас: +976 1100-0000\nИмэйл: info@foodcity.mn\nАжлын цаг: Даваа–Баасан 09:00–18:00",
  },
  {
    priority: 85,
    test: (n) =>
      n.includes("холбоо") ||
      n.includes("утас") ||
      n.includes("имэйл") ||
      n.includes("дугаар") ||
      n.includes("цагийн хуваарь") ||
      n.includes("ажлын цаг") ||
      (n.includes("ниээдэг") && n.includes("хаагддаг")),
    reply:
      "Утас: +976 1100-0000\nИмэйл: info@foodcity.mn\nАжлын цаг: Даваа–Баасан 09:00–18:00",
  },
  {
    priority: 82,
    test: (n) =>
      n.includes("бидний тухай") ||
      n.includes("танилцуулга") ||
      n.includes("компани") ||
      (n.includes("түүх") && n.includes("food")),
    reply:
      "«Бидний тухай» хэсгээс FoodCity-ийн туршлага, гүйцэтгэсэн төслүүд, багийн мэдээлэлтэй танилцана уу. Тодорхой асуулт байвал энд шууд бичээрэй.",
  },
  {
    priority: 78,
    test: (n) =>
      n.includes("ажлын зар") ||
      n.includes("ажлын байр") ||
      n.includes("нийцтэй ажил") ||
      n.includes("карьер") ||
      (n.includes("ажил") && (n.includes("зар") || n.includes("байр"))),
    reply: "Нээлттэй ажлын байрны заруудыг «Ажлын зар» хуудаснаас үзнэ үү.",
  },
  {
    priority: 77,
    test: (n) =>
      n.includes("ажилтан") && (n.includes("холбогдох") || n.includes("оператор")),
    reply:
      "Таны хүсэлтийг ажилтан руу дамжуулна. Түр хүлээнэ үү; шууд асуултанд хариулна.",
  },
  {
    priority: 75,
    test: (n) =>
      n.includes("үнэ") ||
      n.includes("price") ||
      n.includes("төлбөр") ||
      n.includes("хямдрал") ||
      n.includes("хөнгөлөлт"),
    reply:
      "Үнэ, хямдралын мэдээллийг «Борлуулалтын зар» хэсэгт нийтэлдэг. Тодорхой бүтээгдэхүүнээс хамаарч өөр өөр байна.",
  },
  {
    priority: 72,
    test: (n) =>
      n.includes("оффис") ||
      n.includes("боломжит") ||
      n.includes("захиалга") ||
      n.includes("хоол") ||
      n.includes("заавар") ||
      n.includes("хэрхэн захиалах") ||
      n.includes("захиалах"),
    reply:
      "Захиалга өгөх бол вэб дээрх «Захиалга» хэсгээс бөглөнө үү. Оффис болон үйлчилгээний талаар дэлгэрэнгүй мэдээллийг «Борлуулалтын зар»-аас үзнэ үү.",
  },
  {
    priority: 68,
    test: (n) =>
      n.includes("байршил") ||
      n.includes("хаана") ||
      n.includes("хаяг") ||
      n.includes("where"),
    reply:
      "Бид Улаанбаатар хотод үйл ажиллагаа явуулдаг. Хаягийн дэлгэрэнгүйг «Холбоо барих» хэсгээс үзнэ үү.",
  },
];

const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

export function getBotReply(userText: string): string {
  const n = normalizeUserText(userText);
  if (!n) return DEFAULT_REPLY;

  for (const rule of sortedRules) {
    if (rule.test(n)) return rule.reply;
  }
  return DEFAULT_REPLY;
}
