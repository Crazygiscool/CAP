import { describe, it, expect } from "vitest";
import { parseTFWiki } from "../crawler/parsers/tfwiki.js";
import { parseWikipedia } from "../crawler/parsers/wikipedia.js";
import { parseFandom } from "../crawler/parsers/fandom.js";
import { extractFirstParagraph, extractCategories, extractPageTitle } from "../crawler/parser.js";
import * as cheerio from "cheerio";

const TFWIKI_HTML = `<!DOCTYPE html>
<html>
<head><title>Optimus Prime (G1) — TFWiki</title></head>
<body>
<div id="mw-content-text">
  <h1 id="firstHeading">Optimus Prime (G1)</h1>
  <table class="infobox">
    <tr><th colspan="2">Optimus Prime</th></tr>
    <tr><th>Affiliation</th><td>Autobot</td></tr>
    <tr><th>Function</th><td>Leader of the Autobots</td></tr>
    <tr><th>Motto</th><td>"Freedom is the right of all sentient beings"</td></tr>
    <tr><th>Alt Mode</th><td>Freightliner FLT Flat-Nose Semi-Truck</td></tr>
    <tr><th>Color Scheme</th><td>Red, Blue, Silver</td></tr>
    <tr><th>Firepower</th><td>10</td></tr>
    <tr><th>Strength</th><td>10</td></tr>
    <tr><th>Intelligence</th><td>10</td></tr>
    <tr><th>Speed</th><td>8</td></tr>
  </table>
  <p>Optimus Prime is the heroic leader of the Autobots. He is the reincarnation of the original Optimus Prime.</p>
</div>
<div id="mw-normal-catlinks">
  <ul>
    <li><a>Autobots</a></li>
    <li><a>Generation 1</a></li>
    <li><a>Primes</a></li>
  </ul>
</div>
</body>
</html>`;

const WIKIPEDIA_HTML = `<!DOCTYPE html>
<html>
<head><title>Optimus Prime - Wikipedia</title></head>
<body>
<div id="mw-content-text">
  <h1 id="firstHeading">Optimus Prime</h1>
  <table class="infobox">
    <tr><th colspan="2">Optimus Prime</th></tr>
    <tr><th scope="row">Affiliation</th><td>Autobot</td></tr>
    <tr><th scope="row">Function</th><td>Leader</td></tr>
    <tr><th scope="row">Motto</th><td>"Freedom is the right of all sentient beings"</td></tr>
    <tr><th scope="row">Series</th><td>Generation 1</td></tr>
  </table>
  <p>Optimus Prime is a fictional character and the main protagonist of the Transformers franchise.</p>
</div>
<div id="mw-normal-catlinks">
  <ul>
    <li><a>Autobots</a></li>
    <li><a>Fictional characters</a></li>
  </ul>
</div>
</body>
</html>`;

const FANDOM_HTML = `<!DOCTYPE html>
<html>
<head><title>Optimus Prime | Transformers Wiki | Fandom</title></head>
<body>
<div id="mw-content-text">
  <h1 id="firstHeading">Optimus Prime</h1>
  <aside class="portable-infobox">
    <div class="pi-item pi-data">
      <h3>Affiliation</h3>
      <div>Autobot</div>
    </div>
    <div class="pi-item pi-data">
      <h3>Function</h3>
      <div>Supreme Commander</div>
    </div>
    <div class="pi-item pi-data">
      <h3>Motto</h3>
      <div>"Freedom is the right of all sentient beings"</div>
    </div>
  </aside>
  <p>Optimus Prime is the noble leader of the Autobots in the Transformers franchise.</p>
</div>
<div id="mw-normal-catlinks">
  <ul>
    <li><a>Autobots</a></li>
    <li><a>Leaders</a></li>
  </ul>
</div>
</body>
</html>`;

const NO_INFOBOX_HTML = `<!DOCTYPE html>
<html>
<head><title>Some random page</title></head>
<body>
<div id="mw-content-text">
  <h1 id="firstHeading">Some Random Page</h1>
  <p>This is a page with no infobox at all.</p>
</div>
</body>
</html>`;

describe("parseTFWiki", () => {
  it("extracts infobox fields from TFWiki HTML", () => {
    const result = parseTFWiki(TFWIKI_HTML);
    expect(result.title).toBe("Optimus Prime (G1)");

    const labels = result.infoboxFields.map((f) => f.label);
    expect(labels).toContain("Affiliation");
    expect(labels).toContain("Function");
    expect(labels).toContain("Motto");
    expect(labels).toContain("Firepower");

    const aff = result.infoboxFields.find((f) => f.label === "Affiliation");
    expect(aff?.value).toBe("Autobot");

    const fp = result.infoboxFields.find((f) => f.label === "Firepower");
    expect(fp?.value).toBe("10");
  });

  it("extracts description from first paragraph", () => {
    const result = parseTFWiki(TFWIKI_HTML);
    expect(result.description).toContain("heroic leader");
  });

  it("extracts categories", () => {
    const result = parseTFWiki(TFWIKI_HTML);
    expect(result.categories).toContain("Autobots");
    expect(result.categories).toContain("Generation 1");
  });

  it("returns empty data for pages with no infobox", () => {
    const result = parseTFWiki(NO_INFOBOX_HTML);
    expect(result.infoboxFields).toHaveLength(0);
    expect(result.title).toBe("Some Random Page");
  });
});

describe("parseWikipedia", () => {
  it("extracts infobox fields from Wikipedia HTML", () => {
    const result = parseWikipedia(WIKIPEDIA_HTML);
    expect(result.title).toBe("Optimus Prime");

    const aff = result.infoboxFields.find((f) => f.label === "Affiliation");
    expect(aff?.value).toBe("Autobot");
  });

  it("extracts description and categories", () => {
    const result = parseWikipedia(WIKIPEDIA_HTML);
    expect(result.description).toContain("main protagonist");
    expect(result.categories).toContain("Autobots");
  });
});

describe("parseFandom", () => {
  it("extracts infobox fields from Fandom portable infobox", () => {
    const result = parseFandom(FANDOM_HTML);
    expect(result.title).toBe("Optimus Prime");

    const aff = result.infoboxFields.find((f) => f.label === "Affiliation");
    expect(aff?.value).toBe("Autobot");

    const fn = result.infoboxFields.find((f) => f.label === "Function");
    expect(fn?.value).toBe("Supreme Commander");
  });

  it("extracts description and categories", () => {
    const result = parseFandom(FANDOM_HTML);
    expect(result.description).toContain("noble leader");
    expect(result.categories).toContain("Autobots");
  });
});

describe("utility functions", () => {
  it("extractPageTitle returns h1 text", () => {
    const $ = cheerio.load('<h1 id="firstHeading">Test Title</h1>');
    expect(extractPageTitle($)).toBe("Test Title");
  });

  it("extractPageTitle falls back to title tag", () => {
    const $ = cheerio.load("<title>Fallback Title</title>");
    expect(extractPageTitle($)).toBe("Fallback Title");
  });

  it("extractFirstParagraph skips short paragraphs", () => {
    const html = '<div><p>Short</p><p>This is a sufficiently long paragraph for extraction.</p></div>';
    const $ = cheerio.load(html);
    expect(extractFirstParagraph($)).toBe("This is a sufficiently long paragraph for extraction.");
  });

  it("extractCategories returns empty array when no catlinks", () => {
    const $ = cheerio.load("<body></body>");
    expect(extractCategories($)).toEqual([]);
  });
});
