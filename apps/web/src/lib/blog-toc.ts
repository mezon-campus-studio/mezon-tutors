export type TocItem = {
  id: string;
  text: string;
  level: 1 | 2 | 3;
};

const HEADING_RE = /<h([123])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getExistingId(attrs: string | undefined): string | null {
  if (!attrs) return null;
  const match = attrs.match(/\bid=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

function slugifyHeading(text: string): string {
  const slug = text
    .normalize("NFD")
    // biome-ignore lint/suspicious/noMisleadingCharacterClass: remove combining diacritical marks
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  if (slug) return slug;

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return `section-${hash.toString(36)}`;
}

export function extractTocFromHtml(html: string): {
  items: TocItem[];
  htmlWithIds: string;
} {
  const items: TocItem[] = [];
  const usedIds = new Set<string>();

  const htmlWithIds = html.replace(
    HEADING_RE,
    (match, levelStr, attrs = "", inner) => {
      const level = Number(levelStr) as 1 | 2 | 3;
      const text = stripHtml(inner);
      if (!text) return match;

      const existingId = getExistingId(attrs);
      let id = existingId ?? slugifyHeading(text);

      if (!existingId) {
        const baseId = id;
        let counter = 2;
        while (usedIds.has(id)) {
          id = `${baseId}-${counter++}`;
        }
      }

      usedIds.add(id);
      items.push({ id, text, level });

      if (existingId) return match;

      const attrsPart = attrs.trim();
      return `<h${levelStr} id="${id}"${attrsPart ? ` ${attrsPart}` : ""}>${inner}</h${levelStr}>`;
    },
  );

  return { items, htmlWithIds };
}
