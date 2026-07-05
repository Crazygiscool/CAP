import { parseGenericInfobox, type ParsedWikiPage } from "../parser.js";

export function parseTFWiki(html: string): ParsedWikiPage {
  return parseGenericInfobox(
    html,
    "table.infobox",
    "th",
    "td",
    "th[colspan]",
  );
}
