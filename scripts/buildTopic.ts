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
  topic: string;
  weekOf: string;
  lead: string;
  stories: BriefStory[];
};

const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error("OPENAI_API_KEY is not set");

const topic = process.env.SEARCH_TOPIC;
if (!topic) throw new Error("SEARCH_TOPIC is not set");

const outDir = path.join(process.cwd(), "briefs");
const feedsPath = path.join(process.cwd(), "scripts", "feeds.json");
const parser = new Parser();
const openai = new OpenAI({ apiKey: key });

const now = new Date();
const yyyy = now.getUTCFullYear();
const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
const dd = String(now.getUTCDate()).padStart(2, "0");
const weekOf = `${yyyy}-${mm}-${dd}`;
const fileName = `topic-${topic.toLowerCase()}.json`;

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
  
  const sourceNames: Record<string, string> = {
    'https://www.axios.com/technology/rss': 'Axios',
    'https://www.techbusinessnews.com.au/feed': 'Tech Business News',
    'https://www.cnbc.com/id/100727382/device/rss/rss.xml': 'CNBC',
    'https://www.pcmag.com/rss/all': 'PCMag',
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

const filterByTopic = (items: FeedItem[], topic: string): FeedItem[] => {
  const searchTerms = topic.toLowerCase().split(/\s+/);
  
  return items.filter(item => {
    const text = [
      item.title,
      item.contentSnippet,
      item.content
    ].join(' ').toLowerCase();
    
    return searchTerms.some(term => text.includes(term));
  }).sort((a, b) => parseDateMs(b) - parseDateMs(a));
};

const buildPrompt = (items: FeedItem[], topic: string): string => {
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

const generateBrief = async (items: FeedItem[], topic: string): Promise<Brief> => {
  const prompt = buildPrompt(items, topic);
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that writes a concise tech brief in JSON about a specific topic. " +
          "Return ONLY JSON with fields: lead (string), " +
          "stories (array of 8-10 objects with title, link, summary, source). " +
          "Select the most interesting and diverse stories related to the topic from the provided items. " +
          "The source field should contain the publication name from the provided feed items. " +
          "Summaries should be 3-4 sentences and grounded in the provided items."
      },
      {
        role: "user",
        content:
          `Generate a brief about "${topic}" from the following feed items:\n\n` +
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
  
  const parsed = JSON.parse(cleanContent) as Omit<Brief, "generatedAt" | "topic" | "weekOf">;
  
  return {
    generatedAt: now.toISOString(),
    topic: topic,
    weekOf: weekOf,
    lead: parsed.lead ?? "",
    stories: Array.isArray(parsed.stories) ? parsed.stories : []
  };
};

const main = async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const urls = readFeeds();
  const items = await collectItems(urls);
  const filtered = filterByTopic(items, topic);
  
  if (filtered.length === 0) {
    console.warn(`No feed items found related to topic: ${topic}`);
    // Create empty brief
    const emptyBrief: Brief = {
      generatedAt: now.toISOString(),
      topic: topic,
      weekOf: weekOf,
      lead: `No recent articles found about ${topic} this week.`,
      stories: []
    };
    fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(emptyBrief, null, 2));
    console.log(`Wrote empty brief: briefs/${fileName}`);
    return;
  }

  console.log(`Found ${filtered.length} items related to "${topic}"`);
  
  const topItems = filtered.slice(0, 50);
  const brief = await generateBrief(topItems, topic);
  
  fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(brief, null, 2));
  
  console.log(`Wrote briefs/${fileName}`);
};

main().catch((error) => {
  console.error("Failed to generate topic brief:", error);
  process.exitCode = 1;
});