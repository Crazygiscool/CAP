export { parseTFWiki } from "./tfwiki.js";
export { parseWikipedia } from "./wikipedia.js";
export { parseFandom } from "./fandom.js";

import type { ParsedWikiPage } from "../parser.js";
import { parseTFWiki } from "./tfwiki.js";
import { parseWikipedia } from "./wikipedia.js";
import { parseFandom } from "./fandom.js";

export function getParser(
  name: "tfwiki" | "wikipedia" | "fandom",
): (html: string) => ParsedWikiPage {
  switch (name) {
    case "tfwiki":
      return parseTFWiki;
    case "wikipedia":
      return parseWikipedia;
    case "fandom":
      return parseFandom;
  }
}
