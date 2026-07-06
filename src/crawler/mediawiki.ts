interface MediaWikiConfig {
  baseUrl: string;
  apiUrl: string;
}

interface CategoryMember {
  title: string;
}

interface ContinueResult {
  continue?: { cmcontinue?: string };
  query?: { categorymembers?: CategoryMember[] };
  error?: { code: string; info: string };
}

interface ParseResponse {
  parse?: {
    title: string;
    text: { "*": string };
  };
}

interface SearchResult {
  title: string;
}

export class MediaWikiClient {
  private config: MediaWikiConfig;
  private delayMs: number;

  constructor(config: MediaWikiConfig, delayMs = 50) {
    this.config = config;
    this.delayMs = delayMs;
  }

  private async delay(ms = this.delayMs): Promise<void> {
    if (ms > 0) await new Promise((r) => setTimeout(r, ms));
  }

  private async fetchJson(
    url: string,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(url, {
      headers: { "User-Agent": "CAP-Crawler/1.0 (crawler; contact@crazygiscool)" },
      signal,
    });
    if (!res.ok) {
      throw new Error(
        `MediaWiki API error: ${res.status} ${res.statusText}`,
      );
    }
    return res.json() as Promise<Record<string, unknown>>;
  }

  private async fetchAllCategoryMembers(
    categoryPath: string,
    maxPages: number,
    cmtype: "page" | "subcat",
    signal?: AbortSignal,
  ): Promise<string[]> {
    const allTitles: string[] = [];
    let cmcontinue: string | undefined;

    while (allTitles.length < maxPages) {
      const params = new URLSearchParams({
        action: "query",
        format: "json",
        list: "categorymembers",
        cmtitle: categoryPath,
        cmlimit: String(Math.min(maxPages - allTitles.length, 500)),
        cmtype,
      });
      if (cmcontinue) params.set("cmcontinue", cmcontinue);

      const url = `${this.config.apiUrl}?${params}`;
      const data = (await this.fetchJson(url, signal)) as ContinueResult;

      if (data.error) {
        throw new Error(
          `MediaWiki API: ${data.error.code} — ${data.error.info}`,
        );
      }

      const members = data.query?.categorymembers ?? [];
      allTitles.push(...members.map((m: CategoryMember) => m.title));

      if (data.continue?.cmcontinue) {
        cmcontinue = data.continue.cmcontinue;
        await this.delay();
      } else {
        break;
      }
    }

    return allTitles.slice(0, maxPages);
  }

  async listCategoryMembers(
    categoryPath: string,
    maxPages = 500,
    signal?: AbortSignal,
  ): Promise<string[]> {
    return this.fetchAllCategoryMembers(categoryPath, maxPages, "page", signal);
  }

  async listSubCategories(
    categoryPath: string,
    maxPages = 500,
    signal?: AbortSignal,
  ): Promise<string[]> {
    return this.fetchAllCategoryMembers(categoryPath, maxPages, "subcat", signal);
  }

  async discoverAllPages(
    categoryPath: string,
    maxPages = 500,
    maxDepth = 2,
    signal?: AbortSignal,
    seen = new Set<string>(),
  ): Promise<string[]> {
    if (maxDepth < 0 || seen.has(categoryPath)) return [];
    seen.add(categoryPath);

    const pages = await this.listCategoryMembers(categoryPath, maxPages, signal);
    const all = new Set(pages);

    if (maxDepth > 0) {
      await this.delay();
      const subcategories = await this.listSubCategories(categoryPath, maxPages, signal);
      for (const subcat of subcategories) {
        if (all.size >= maxPages) break;
        await this.delay();
        const subPages = await this.discoverAllPages(
          subcat,
          maxPages - all.size,
          maxDepth - 1,
          signal,
          seen,
        );
        for (const p of subPages) {
          all.add(p);
          if (all.size >= maxPages) break;
        }
      }
    }

    return [...all].slice(0, maxPages);
  }

  async fetchPageHtml(pageTitle: string): Promise<string> {
    const params = new URLSearchParams({
      action: "parse",
      format: "json",
      page: pageTitle,
      prop: "text",
    });

    const url = `${this.config.apiUrl}?${params}`;
    const data = (await this.fetchJson(url)) as ParseResponse & {
      error?: { code: string; info: string };
    };

    if (data.error) {
      throw new Error(
        `MediaWiki API: ${data.error.code} — ${data.error.info}`,
      );
    }

    return data.parse?.text?.["*"] ?? "";
  }

  async searchPages(query: string, maxResults = 50): Promise<string[]> {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      list: "search",
      srsearch: query,
      srlimit: String(Math.min(maxResults, 500)),
    });

    const url = `${this.config.apiUrl}?${params}`;
    const data = (await this.fetchJson(url)) as {
      query?: { search?: SearchResult[] };
      error?: { code: string; info: string };
    };

    if (data.error) {
      throw new Error(`MediaWiki API: ${data.error.code} — ${data.error.info}`);
    }

    return (data.query?.search ?? []).map((s: SearchResult) => s.title);
  }
}
