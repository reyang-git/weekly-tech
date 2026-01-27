import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import Parser from "rss-parser";

type FeedItem = {
  title?: string;
  link?: string;
  isoDate?: string;
  pubDate?: string;
  contentSnippet?: string;
  content?: string;
  source?: string;
};

type BriefStory = {
  title: string;
  link: string;
  summary: string;
  source?: string;
};

type Brief = {
  generatedAt: string;
  weekOf: string;
  lead: string;
  themes: string[];
  stories: BriefStory[];
};

const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error("OPENAI_API_KEY is not set");

const outDir = path.join(process.cwd(), "briefs");
const feedsPath = path.join(process.cwd(), "scripts", "feeds.json");
const parser = new Parser();
const openai = new OpenAI({ apiKey: key });

const now = new Date();
const yyyy = now.getUTCFullYear();
const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
const dd = String(now.getUTCDate()).padStart(2, "0");
const weekOf = `${yyyy}-${mm}-${dd}`;
const archiveName = `${weekOf}.json`;

const readFeeds = (): string[] => {
  const raw = fs.readFileSync(feedsPath, "utf8");
  const urls = JSON.parse(raw);
  if (!Array.isArray(urls)) {
    throw new Error("feeds.json must contain an array of URLs");
  }
  return urls.filter((url) => typeof url === "string" && url.trim().length > 0);
};

const parseDateMs = (item: FeedItem): number => {
  const raw = item.isoDate ?? item.pubDate;
  if (!raw) return 0;
  const ts = Date.parse(raw);
  return Number.isNaN(ts) ? 0 : ts;
};

const collectItems = async (urls: string[]): Promise<FeedItem[]> => {
  const items: FeedItem[] = [];
  
  // Map URLs to proper source names
  const sourceNames: Record<string, string> = {
    'https://techcrunch.com/feed/': 'TechCrunch',
    'https://www.theverge.com/rss/index.xml': 'The Verge',
    'https://www.wired.com/feed/rss': 'Wired',
    'https://www.technologyreview.com/feed/': 'MIT Technology Review',
    'https://feeds.arstechnica.com/arstechnica/index': 'Ars Technica',
    'https://www.engadget.com/rss.xml': 'Engadget',
    'https://www.axios.com/technology/rss': 'Axios',
    'https://www.theguardian.com/uk/technology/rss': 'The Guardian',
    'https://www.theguardian.com/au/technology/rss': 'The Guardian Australia',
    'https://www.smh.com.au/rss/technology.xml': 'Sydney Morning Herald',
    'https://gizmodo.com/rss': 'Gizmodo',
    'https://www.itnews.com.au/RSS/rss.ashx': 'IT News',
    'https://www.techbusinessnews.com.au/feed': 'Tech Business News',
    'https://www.cio.com/rss': 'CIO',
    'https://www.cnbc.com/id/100727382/device/rss/rss.xml': 'CNBC',
    'https://www.forbes.com/technology/feed/': 'Forbes',
    'https://www.theregister.com/software/headlines.atom': 'The Register',
    'https://thenextweb.com/feed/': 'The Next Web',
    'https://www.zdnet.com/news/rss.xml': 'ZDNet',
    'https://www.pcmag.com/rss/all': 'PCMag',
    'https://www.cnet.com/rss/all/': 'CNET',
    'https://newsletter.letterofintent.com.au/feed': 'Letter of Intent',
'https://feeds.smartcompany.com.au/smartcompanyallcontent': 'SmartCompany',
'https://www.startupdaily.net/feed': 'Startup Daily'
  };
  
  for (const url of urls) {
    try {
      const feed = await parser.parseURL(url);
      const sourceName = sourceNames[url] || feed.title || url;
      
      for (const entry of feed.items ?? []) {
        items.push({
          title: entry.title ?? undefined,
          link: entry.link ?? undefined,
          isoDate: entry.isoDate ?? undefined,
          pubDate: entry.pubDate ?? undefined,
          contentSnippet: entry.contentSnippet ?? undefined,
          content: entry.content ?? undefined,
          source: sourceName
        });
      }
    } catch (error) {
      console.warn(`Skipping failed feed: ${url}`);
    }
  }
  return items;
};

const pickTopItems = (items: FeedItem[], limit: number): FeedItem[] => {
  const byLink = new Map<string, FeedItem>();
  for (const item of items) {
    if (!item.link) continue;
    if (!byLink.has(item.link)) {
      byLink.set(item.link, item);
    }
  }
  return [...byLink.values()]
    .sort((a, b) => parseDateMs(b) - parseDateMs(a))
    .slice(0, limit);
};

const buildPrompt = (items: FeedItem[]): string => {
  const lines = items.map((item, index) => {
    const date = item.isoDate ?? item.pubDate ?? "unknown";
    const title = item.title ?? "Untitled";
    const summary = item.contentSnippet ?? item.content ?? "";
    const source = item.source ?? "Unknown";
    return [
      `${index + 1}. ${title}`,
      `Source: ${source}`,
      `Date: ${date}`,
      `Link: ${item.link}`,
      summary ? `Snippet: ${summary}` : ""
    ]
      .filter(Boolean)
      .join("\n");
  });
  return lines.join("\n\n");
};

const generateBrief = async (items: FeedItem[]): Promise<Brief> => {
  const prompt = buildPrompt(items);
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that writes a concise weekly tech brief in JSON focused on innovation and new developments. " +
          "Prioritize stories about: startups and VC deals, innovation and new product launches, AI and emerging technologies, " +
          "the Australian tech ecosystem, and novel use cases and applications of technology. " +
          "Return ONLY JSON with fields: lead (string), themes (array of 3-5 strings), " +
          "stories (array of 10 objects with title, link, summary, source). " +
          "Select the 10 most interesting and diverse stories from the provided items that exemplify these focus areas. " +
          "IMPORTANT: For each story, the source field MUST contain the exact publication name " +
          "listed as 'Source:' in the feed items (e.g., 'TechCrunch', 'The Verge', 'Wired'). " +
          "Do not use generic names like 'Latest news'. " +
          "Summaries should be 3-4 sentences and grounded in the provided items."
      },
      {
        role: "user",
        content:
          "Generate a weekly brief from the following feed items:\n\n" +
          prompt
      }
    ],
    temperature: 0.4
  });

  const content = response.choices[0]?.message?.content ?? "";
  let cleanContent = content.trim();
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.replace(/^```json\n/, '').replace(/\n```$/, '');
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```\n/, '').replace(/\n```$/, '');
  }
  const parsed = JSON.parse(cleanContent) as Omit<Brief, "generatedAt" | "weekOf">;
  return {
    generatedAt: now.toISOString(),
    weekOf,
    lead: parsed.lead ?? "",
    themes: Array.isArray(parsed.themes) ? parsed.themes : [],
    stories: Array.isArray(parsed.stories) ? parsed.stories : []
  };
};

const main = async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const urls = readFeeds();
  const items = await collectItems(urls);
  const topItems = pickTopItems(items, 30);
  if (topItems.length === 0) {
    throw new Error("No feed items available to summarize");
  }

  const brief = await generateBrief(topItems);
  fs.writeFileSync(path.join(outDir, "latest.json"), JSON.stringify(brief, null, 2));
  fs.writeFileSync(path.join(outDir, archiveName), JSON.stringify(brief, null, 2));
  console.log("Wrote briefs/latest.json and", archiveName);
};

main().catch((error) => {
  console.error("Failed to generate weekly brief:", error);
  process.exitCode = 1;
});