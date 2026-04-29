/**
 * Text normalization for matching user input to CMS chatbot labels (Cyrillic-safe).
 * Reply copy lives in `sitepages` / `chatbot` sections — not here.
 */

export function normalizeUserText(text: string): string {
  return text
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
