// Parse all [[wikilinks]] from a markdown string.
// Returns array of { target, alias, raw, index } objects.
// Pattern: [[target]] or [[target|alias]]
export interface ParsedLink {
  target: string;       // the note title or ID being linked to
  alias: string | null; // custom display text after |
  raw: string;          // the full matched string e.g. "[[My Note|alias]]"
  index: number;        // position in the source string
}

const WIKILINK_REGEX = /\[\[([^\[\]\|]+?)(?:\|([^\[\]]+?))?\]\]/g;

export function parseWikilinks(markdown: string): ParsedLink[] {
  const links: ParsedLink[] = [];
  let match: RegExpExecArray | null;
  while ((match = WIKILINK_REGEX.exec(markdown)) !== null) {
    links.push({
      target: match[1].trim(),
      alias: match[2]?.trim() ?? null,
      raw: match[0],
      index: match.index,
    });
  }
  return links;
}

// Strip [[wikilinks]] to just display text for previews.
// "See [[My Note]] for details" → "See My Note for details"
// "See [[My Note|the thing]] for details" → "See the thing for details"
export function stripWikilinks(text: string): string {
  return text.replace(WIKILINK_REGEX, (_, target, alias) => {
    return alias || target;
  });
}
