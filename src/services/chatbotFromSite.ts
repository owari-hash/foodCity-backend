import { SitePage } from "../models/SitePage.js";
import { normalizeUserText } from "./chatbot.js";

type ChoiceNode = {
  label: string;
  answer: string;
  choices: ChoiceNode[];
};

type ChatbotBundle = {
  roots: ChoiceNode[];
  welcomeMessage: string | null;
  startButtonLabel: string | null;
};

const CACHE_MS = 45_000;

let bundleCache: { exp: number; data: ChatbotBundle } | null = null;

function parseNode(raw: unknown, depth: number): ChoiceNode | null {
  if (!raw || typeof raw !== "object" || depth > 24) return null;
  const r = raw as Record<string, unknown>;
  const label = String(r.label ?? "").trim();
  if (!label) return null;
  const answerRaw = String(r.answer ?? "").trim();
  const answer = answerRaw || label;
  const childrenRaw = Array.isArray(r.choices) ? r.choices : [];
  const choices = childrenRaw
    .map((c) => parseNode(c, depth + 1))
    .filter((c): c is ChoiceNode => Boolean(c));
  return { label, answer, choices };
}

function findAnswerByNormalizedLabel(nodes: ChoiceNode[], userNorm: string): string | null {
  for (const n of nodes) {
    const labelNorm = normalizeUserText(n.label);
    if (labelNorm && labelNorm === userNorm) {
      const out = (n.answer ?? "").trim();
      if (out.length > 0) return out;
      const nested = findAnswerByNormalizedLabel(n.choices, userNorm);
      if (nested) return nested;
      return null;
    }
    const nested = findAnswerByNormalizedLabel(n.choices, userNorm);
    if (nested) return nested;
  }
  return null;
}

async function loadBundle(): Promise<ChatbotBundle> {
  const now = Date.now();
  if (bundleCache && bundleCache.exp > now) return bundleCache.data;

  const empty: ChatbotBundle = { roots: [], welcomeMessage: null, startButtonLabel: null };
  try {
    const doc = await SitePage.findOne({ pageId: "chatbot" }).lean();
    const sections = (doc?.sections as Record<string, unknown>) ?? {};
    const roots: ChoiceNode[] = [];
    const raw = Array.isArray(sections.rootChoices) ? sections.rootChoices : [];
    for (const item of raw) {
      const n = parseNode(item, 0);
      if (n) roots.push(n);
    }
    const data: ChatbotBundle = {
      roots,
      welcomeMessage: String(sections.welcomeMessage ?? "").trim() || null,
      startButtonLabel: String(sections.startButtonLabel ?? "").trim() || null,
    };
    bundleCache = { exp: now + CACHE_MS, data };
    return data;
  } catch {
    bundleCache = { exp: now + CACHE_MS, data: empty };
    return empty;
  }
}

/** First-line welcome when a new conversation is created (admin «Чатбот» page). */
export async function getWelcomeMessageFromSite(): Promise<string | null> {
  return (await loadBundle()).welcomeMessage;
}

/**
 * When the user message matches:
 * - **startButtonLabel** → returns **welcomeMessage** (if set), for “Чат эхлүүлэх”-style flows; or
 * - a choice **label** anywhere in the admin tree → that node’s **answer**;
 * otherwise null (caller uses rule-based `getBotReply`).
 */
export async function getConfiguredBotReply(userText: string): Promise<string | null> {
  const b = await loadBundle();
  const n = normalizeUserText(userText);
  if (!n) return null;

  if (b.startButtonLabel) {
    const startNorm = normalizeUserText(b.startButtonLabel);
    if (startNorm && startNorm === n && b.welcomeMessage) {
      const w = b.welcomeMessage.trim();
      if (w.length > 0) return w;
    }
  }

  if (b.roots.length === 0) return null;
  return findAnswerByNormalizedLabel(b.roots, n);
}

export function invalidateChatbotSiteCache(): void {
  bundleCache = null;
}
