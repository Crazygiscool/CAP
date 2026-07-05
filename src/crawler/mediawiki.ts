interface MediaWikiConfig {
  baseUrl: string;
  apiUrl: string;
}

interface CategoryMember {
  title: string;
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

  constructor(config: MediaWikiConfig) {
    this.config = config;
  }

  async listCategoryMembers(
    categoryPath: string,
    maxPages = 500,
  ): Promise<string[]> {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      list: "categorymembers",
      cmtitle: categoryPath,
      cmlimit: String(Math.min(maxPages, 500)),
      cmtype: "page",
    });

    const url = `${this.config.apiUrl}?${params}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`MediaWiki API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json() as {
      query?: { categorymembers?: CategoryMember[] };
      error?: { code: string; info: string };
    };

    if (data.error) {
      throw new Error(`MediaWiki API: ${data.error.code} — ${data.error.info}`);
    }

    return (data.query?.categorymembers ?? []).map(
      (m: CategoryMember) => m.title,
    );
  }

  async fetchPageHtml(pageTitle: string): Promise<string> {
    const params = new URLSearchParams({
      action: "parse",
      format: "json",
      page: pageTitle,
      prop: "text",
    });

    const url = `${this.config.apiUrl}?${params}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(
        `MediaWiki API error: ${res.status} for page "${pageTitle}"`,
      );
    }

    const data = (await res.json()) as ParseResponse & {
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
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`MediaWiki API error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as {
      query?: { search?: SearchResult[] };
      error?: { code: string; info: string };
    };

    if (data.error) {
      throw new Error(`MediaWiki API: ${data.error.code} — ${data.error.info}`);
    }

    return (data.query?.search ?? []).map((s: SearchResult) => s.title);
  }
}
