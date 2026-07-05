import { parseGenericInfobox, type ParsedWikiPage } from "../parser.js";

export function parseWikipedia(html: string): ParsedWikiPage {
  return parseGenericInfobox(
    html,
    "table.infobox",
    "th",
    "td",
    "th[colspan]",
  );
}
