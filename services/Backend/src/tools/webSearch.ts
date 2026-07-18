export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResponse {
  query: string;
  provider: "tavily" | "bing";
  results: WebSearchResult[];
}

const cleanText = (value: string) => value
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
  .replace(/\s+/g, " ")
  .trim();

const validUrl = (value: string) => {
  try {
    const url = new URL(cleanText(value));
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
};

const between = (text: string, tag: string) => {
  const match = text.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] || "";
};

async function searchTavily(query: string, maxResults: number): Promise<WebSearchResponse> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      max_results: maxResults,
      include_answer: false,
      include_raw_content: false,
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Tavily search returned ${response.status}.`);
  const data = await response.json() as { results?: Array<{ title?: string; url?: string; content?: string }> };
  const results = (data.results || []).map((item) => ({
    title: cleanText(item.title || "Untitled result").slice(0, 180),
    url: validUrl(item.url || ""),
    snippet: cleanText(item.content || "").slice(0, 600),
  })).filter((item) => item.url);
  return { query, provider: "tavily", results };
}

async function searchBing(query: string, maxResults: number): Promise<WebSearchResponse> {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&format=rss`;
  const response = await fetch(url, {
    headers: { "User-Agent": "NeuraLens/1.0" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Web search returned ${response.status}.`);
  const xml = await response.text();
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
  const results = items.slice(0, maxResults).map((item) => ({
    title: cleanText(between(item, "title")).slice(0, 180),
    url: validUrl(between(item, "link")),
    snippet: cleanText(between(item, "description")).slice(0, 600),
  })).filter((item) => item.url && item.title);
  return { query, provider: "bing", results };
}

export async function searchWeb(queryInput: unknown, maxResultsInput: unknown): Promise<WebSearchResponse> {
  const query = typeof queryInput === "string" ? queryInput.trim() : "";
  if (query.length < 2 || query.length > 300) throw new Error("Use a search query between 2 and 300 characters.");
  const maxResults = Math.min(5, Math.max(1, Number(maxResultsInput) || 4));
  const result = process.env.TAVILY_API_KEY
    ? await searchTavily(query, maxResults)
    : await searchBing(query, maxResults);
  if (!result.results.length) throw new Error("The web search completed but returned no usable results.");
  return result;
}
