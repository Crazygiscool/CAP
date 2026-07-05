import { parsePortableInfobox, type ParsedWikiPage } from "../parser.js";

export function parseFandom(html: string): ParsedWikiPage {
  return parsePortableInfobox(html);
}
