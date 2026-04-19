/** Rule-based bot replies (MN). Skipped when conversation is in humanMode. */
export function getBotReply(userText: string): string {
  const lower = userText.toLowerCase();
  let reply =
    "Таны асуултыг бид хүлээн авлаа. Оператортой холбогдохыг хүсвэл шууд чатнаас хүлээн авна уу эсвэл +976 1100-0000 дугаарт залгана уу.";

  if (
    lower.includes("оффис") ||
    lower.includes("боломжит") ||
    lower.includes("захиалга") ||
    lower.includes("хоол") ||
    lower.includes("заавар")
  ) {
    reply =
      "Захиалга өгөх бол вэб дээрх «Захиалга» хэсгээс бөглөнө үү. Оффис болон үйлчилгээний талаар дэлгэрэнгүй мэдээллийг «Борлуулалтын зар»-аас үзнэ үү.";
  } else if (
    lower.includes("бидний тухай") ||
    lower.includes("танилцуулга") ||
    lower.includes("компани")
  ) {
    reply =
      "«Бидний тухай» хэсгээс FoodCity-ийн туршлага, гүйцэтгэсэн төслүүд, багийн мэдээлэлтэй танилцана уу. Тодорхой асуулт байвал энд шууд бичээрэй.";
  } else if (
    lower.includes("үнэ") ||
    lower.includes("price") ||
    lower.includes("төлбөр") ||
    lower.includes("хямдрал")
  ) {
    reply =
      "Үнэ, хямдралын мэдээллийг «Борлуулалтын зар» хэсэгт нийтэлдэг. Тодорхой бүтээгдэхүүнээс хамаарч өөр өөр байна.";
  } else if (
    lower.includes("холбоо") ||
    lower.includes("утас") ||
    lower.includes("имэйл")
  ) {
    reply =
      "Утас: +976 1100-0000\nИмэйл: info@foodcity.mn\nАжлын цаг: Даваа–Баасан 09:00–18:00";
  } else if (lower.includes("ажил") || lower.includes("ажлын зар")) {
    reply = "Нээлттэй ажлын байрны заруудыг «Ажлын зар» хуудаснаас үзнэ үү.";
  } else if (lower.includes("байршил") || lower.includes("хаана")) {
    reply =
      "Бид Улаанбаатар хотод үйл ажиллагаа явуулдаг. Хаягийн дэлгэрэнгүйг «Холбоо барих» хэсгээс үзнэ үү.";
  }

  return reply;
}
