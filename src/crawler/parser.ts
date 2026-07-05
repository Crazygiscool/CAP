import * as cheerio from "cheerio";
import type { ParsedWikiPage } from "./types.js";
export type { ParsedWikiPage };

export function extractFirstParagraph($: cheerio.CheerioAPI): string {
  const content = $("#mw-content-text")[0] ?? $("body")[0];
  if (!content) return "";

  const paragraphs = $(content).find("p");
  for (const p of paragraphs) {
    const text = $(p).text().trim();
    if (text.length > 20) return text;
  }
  return "";
}

export function extractCategories($: cheerio.CheerioAPI): string[] {
  const cats: string[] = [];
  const catLinks = $("#mw-normal-catlinks ul li a");
  if (catLinks.length) {
    catLinks.each((_, el) => {
      const text = $(el).text().trim();
      if (text) cats.push(text);
    });
  }
  return cats;
}

export function extractPageTitle($: cheerio.CheerioAPI): string {
  const h1 = $("#firstHeading").text().trim();
  if (h1) return h1;
  return $("title").text().replace(/ – .+$/, "").replace(/ - .+$/, "").trim();
}

function cleanValue(value: string): string {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export function parseGenericInfobox(
  html: string,
  tableSelector: string,
  labelSelector: string,
  valueSelector: string,
  titleSelector: string = "",
): ParsedWikiPage {
  const $ = cheerio.load(html);

  const title = extractPageTitle($);
  const description = extractFirstParagraph($);
  const categories = extractCategories($);
  const infoboxFields: { label: string; value: string }[] = [];

  const table = $(tableSelector).first();
  if (table.length) {
    if (titleSelector) {
      table.find(titleSelector).each((_, el) => {
        const colspan = $(el).attr("colspan");
        if (colspan) {
          const val = $(el).text().trim();
          if (val) {
            infoboxFields.push({ label: "_title", value: val });
          }
        }
      });
    }

    const rows = table.find("tr");
    rows.each((_, row) => {
      const labelEl = $(row).find(labelSelector).first();
      const valueEl = $(row).find(valueSelector).first();
      if (labelEl.length && valueEl.length) {
        const label = labelEl.text().trim();
        const rawHtml = valueEl.html() ?? "";
        const value = cleanValue(rawHtml);
        if (label && label !== "_title" && !label.startsWith("Image")) {
          infoboxFields.push({ label, value });
        }
      }
    });
  }

  return { title, description, categories, infoboxFields };
}

export function parsePortableInfobox(
  html: string,
): ParsedWikiPage {
  const $ = cheerio.load(html);

  const title = extractPageTitle($);
  const description = extractFirstParagraph($);
  const categories = extractCategories($);
  const infoboxFields: { label: string; value: string }[] = [];

  const aside = $("aside.portable-infobox").first();
  if (aside.length) {
    const titleEl = aside.find(".pi-title, .pi-data-value.pi-item");
    if (titleEl.length) {
      infoboxFields.push({ label: "_title", value: titleEl.first().text().trim() });
    }

    aside.find('[class*="pi-item"][class*="pi-data"]').each((_, item) => {
      const labelEl = $(item).find("h3");
      const valueEl = $(item).find("div").last();
      if (labelEl.length && valueEl.length) {
        const label = labelEl.text().trim();
        const value = cleanValue(valueEl.html() ?? "");
        if (label) infoboxFields.push({ label, value });
      }
    });
  }

  return { title, description, categories, infoboxFields };
}
