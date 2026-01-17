# Weekly Tech News

An automated weekly tech news brief generator that curates stories from RSS feeds, ranks them using OpenAI, and publishes a beautiful static site.

## Features

- 🤖 **AI-Powered Curation**: Uses OpenAI GPT-4 to rank stories by novelty and impact
- 📰 **RSS Feed Aggregation**: Monitors 8-12 top tech/startup/innovation feeds
- 🎯 **Smart Filtering**: Automatically filters last 14 days and deduplicates by URL
- 📊 **Rich Story Analysis**: Each story includes summary, "why it matters", and new use cases
- 🎨 **Clean UI**: Modern, responsive design with beautiful typography
- ⚡ **Automated**: GitHub Actions runs weekly and on manual dispatch
- 📦 **Archived**: Each week's brief is saved with a dated filename

## Project Structure

```
weekly-tech/
├── index.html              # Main HTML page
├── style.css              # Styling
├── app.js                 # Frontend JavaScript
├── briefs/
│   ├── latest.json        # Current brief (auto-generated)
│   └── YYYY-MM-DD.json    # Archived briefs
├── scripts/
│   └── buildBrief.ts      # TypeScript script to generate briefs
├── package.json           # Node.js dependencies
├── tsconfig.json          # TypeScript configuration
└── .github/
    └── workflows/
        └── weekly-brief.yml  # GitHub Actions workflow
```

## Setup

### Prerequisites

- Node.js 20 or higher
- npm
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd weekly-tech
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up OpenAI API key**
   
   For local development, create a `.env` file (optional, or use environment variable):
   ```bash
   echo "OPENAI_API_KEY=your-api-key-here" > .env
   ```
   
   Or export it directly:
   ```bash
   export OPENAI_API_KEY=your-api-key-here
   ```

4. **Generate your first brief**
   ```bash
   npm run build:brief
   ```

5. **View the site locally**
   ```bash
   npm run dev
   ```
   This will start a local server at `http://localhost:8080`

## GitHub Pages Setup

1. **Enable GitHub Pages**
   - Go to your repository Settings → Pages
   - Select source: "Deploy from a branch"
   - Choose branch: `main` and folder: `/ (root)`

2. **Configure GitHub Secrets**
   - Go to Settings → Secrets and variables → Actions
   - Add a new secret named `OPENAI_API_KEY`
   - Paste your OpenAI API key

3. **The workflow will automatically:**
   - Run every Monday at 9 AM UTC
   - Generate a new brief
   - Commit and push the updated `briefs/latest.json`
   - Your GitHub Pages site will automatically update

## Manual Generation

To manually generate a brief:

```bash
npm run build:brief
```

This will:
1. Fetch RSS feeds from configured sources
2. Filter items from the last 14 days
3. Deduplicate by URL
4. Use OpenAI to rank and summarize top 5 stories
5. Generate themes
6. Write to `briefs/latest.json`
7. Archive to `briefs/YYYY-MM-DD.json` (using weekOf date)

## RSS Feeds

The generator monitors these feeds (configured in `scripts/buildBrief.ts`):

- TechCrunch
- The Verge
- O'Reilly Radar
- Wired
- Ars Technica
- VentureBeat
- Product Hunt
- Fast Company
- MIT Technology Review
- And more...

You can customize the feeds by editing the `RSS_FEEDS` array in `scripts/buildBrief.ts`.

## Output Format

Each brief (`briefs/latest.json`) contains:

```json
{
  "generatedAt": "2024-01-15T10:30:00.000Z",
  "weekOf": "2024-01-15",
  "themes": [
    "AI Innovation",
    "Platform Evolution",
    "Startup Funding"
  ],
  "stories": [
    {
      "title": "Story Title",
      "url": "https://example.com/story",
      "source": "techcrunch.com",
      "publishedAt": "2024-01-14T08:00:00.000Z",
      "summary": "Brief summary of the story...",
      "whyItMatters": "Why this story is significant...",
      "newUseCases": [
        "Use case 1",
        "Use case 2",
        "Use case 3"
      ]
    }
  ]
}
```

## Required Secrets

For GitHub Actions to work, you need to set:

- **`OPENAI_API_KEY`**: Your OpenAI API key (required)
  - Get one at: https://platform.openai.com/api-keys
  - Add in: Repository Settings → Secrets and variables → Actions

## Development

### Type Checking

```bash
npm run type-check
```

### Local Development Server

```bash
npm run dev
```

## Cost Considerations

- Each brief generation makes multiple OpenAI API calls (ranking + 5 story summaries + themes)
- Estimated cost per brief: ~$0.10-0.30 (depending on GPT-4 pricing)
- Weekly generation: ~$0.40-1.20/month

## License

MIT
