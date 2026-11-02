# LFM3 Workspace launch site

A static, no-build landing page and documentation site for the LFM3 Workspace release. The landing page explains
what the harness is, shows the real desktop UI, and links to the Windows installer, the Linux desktop packages, and
the Linux CLI archive. The documentation under `docs/` covers installation, the app's behaviour, the CLI and
configuration reference, architecture, privacy, and troubleshooting.

## Preview

```bash
cd web
python -m http.server 8080
```

Open <http://localhost:8080>. Any static server works; there is no build step and no JavaScript.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | The page: copy, capability list, downloads, screenshots, docs band, FAQ, structured data |
| `styles.css` | All styling and responsive rules |
| `docs/` | The documentation: 15 generated pages plus `search-index.json` |
| `docs.css` | Documentation layout, built on the palette in `styles.css` |
| `docs.js` | Progressive enhancement only: search, copy buttons, scrollspy, full-size screenshots |
| `assets/` | Screenshots (PNG + WebP), icons, and the Open Graph card |
| `assets/docs/` | Annotated desktop-UI captures used by the documentation figures |
| `robots.txt` | Crawler rules, including AI answer engines, and the sitemap URL |
| `sitemap.xml` | Sitemap for the landing page and the three write-ups, with image entries |
| `llms.txt` | Short, quotable summary for AI answer engines |
| `blog/` | Three long-form write-ups plus the `index.html` list page, sharing `blog.css` |

## Documentation

The documentation is authored as Markdown in the repository at `docs/guide/` and rendered into `docs/` by a
dependency-free Node script:

```bash
node scripts/build-docs.mjs          # render pages, search index, sitemap entries
node scripts/build-docs.mjs --check  # fail if the committed HTML is stale
```

Titles, descriptions, ledes, and navigation order live in `scripts/build-docs.mjs`; the Markdown files hold only
content. The generated HTML, `docs/search-index.json`, and the `docs:start` block in `sitemap.xml` are committed, so
deployment still has no build step. Run `--check` before publishing to catch a page edited without a rebuild.

Supported Markdown is deliberately small: `##`/`###` headings, paragraphs, lists, tables, fenced code, links,
bold/italic/inline code, `---`, `::: note|tip|warn|danger` callouts, and `:::figure` screenshots. Anything else is
treated as text. Raw HTML blocks are passed through for the home page cards.

An annotated screenshot is a fenced block whose image lives in `assets/docs/` (PNG for the full-size link, WebP for
the inline view). Pin coordinates are percentages, so they hold at every width, and the numbered legend is generated
from the same list:

```text
:::figure app-home.png
alt: What the screenshot shows, for screen readers.
caption: The line printed under the image.
width: 520
pin: 37.8,10.8 | Model selector | Which local model answers.
:::
```

The build fails on a missing image, a missing `alt` or `caption`, an unknown key, or a pin outside the image, so a
figure cannot silently rot.

Each page carries a canonical URL, Open Graph tags, `TechArticle` and `BreadcrumbList` structured data, a right-hand
"On this page" list, previous/next links, and an "Edit this page" link back to its Markdown source.

## Deploy

The site is plain files, so any static host works. Remember to run `node scripts/build-docs.mjs` first if you
changed anything under `docs/guide/`. Two easy routes:

**GitHub Pages (project site).** GitHub Pages cannot publish an arbitrary `/web` folder from a branch, so use an
Actions workflow. Add `.github/workflows/pages.yml`:

```yaml
name: Publish launch site
on:
  push:
    branches: [main]
    paths: ["web/**"]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: web
      - id: deployment
        uses: actions/deploy-pages@v4
```

Then set **Settings → Pages → Source** to **GitHub Actions**.

**Netlify or Cloudflare Pages.** Point the project at this repository and set the publish directory to `web`. No
build command is needed.

## Update the site URL

The canonical URL, Open Graph URLs, structured data, sitemap, `robots.txt`, and `llms.txt` assume the project
site at `https://lfm3-harness.github.io/LFM3-Harness/`. If you deploy to a custom domain, replace that prefix in:

- `index.html` (canonical, `og:url`, `og:image`, Twitter image, JSON-LD `@id`/`url`/`screenshot`)
- `blog/index.html` and each `blog/<slug>.html` (canonical, Open Graph, Twitter, and every JSON-LD `@id`)
- `sitemap.xml`
- `robots.txt`
- `llms.txt`

## Update a release

When a new version ships, update the version, asset URLs, byte sizes, and checksums in:

- `index.html` — hero buttons, download cards, JSON-LD `softwareVersion` and `downloadUrl`
- `llms.txt` — facts and download list
- Footer version label in `index.html`

The checksums are the SHA-256 values published with the GitHub release. The Linux desktop card links to the
release page because the `.deb` and `.AppImage` assets are produced by the `Release Linux` workflow; once those
assets exist, replace that link with direct asset URLs and add their sizes and hashes.

## Write-ups

`blog/` holds the three long-form posts and the `index.html` list page. Each post is a self-contained HTML file with
`../styles.css` plus `blog.css`, its own canonical URL under `https://lfm3-harness.github.io/LFM3-Harness/blog/`, and
one JSON-LD `@graph` (Person, Organization, WebSite, SoftwareApplication, BreadcrumbList, BlogPosting, FAQPage; the
multi-model post adds a `HowTo`). No JavaScript, no build step.

To add a post: copy an existing file, change the title, description, canonical URL, `og:`/`twitter:` tags, every
`@id` in the graph, the breadcrumb, and the `read-next` links. Then add its URL to `sitemap.xml`, to the `ItemList`
and post list in `blog/index.html`, and to the Write-ups section of `llms.txt`. Set
`article:published_time` and `datePublished` to the release day, and re-check the numbers against the code before
publishing — the posts quote measured constants, not adjectives.

## Search, answer, and generative engine notes

- One `<h1>`, descriptive section headings, and a short answer-first paragraph under “What it is”.
- `SoftwareApplication`, `WebSite`, and `FAQPage` structured data, with the FAQ also visible on the page.
- A “Key facts” table and a `llms.txt` file give answer engines compact, quotable facts.
- `robots.txt` allows search crawlers and AI crawlers and points to the sitemap.
- Images are served as WebP with PNG fallbacks, with explicit dimensions to avoid layout shift.
- The landing page has no JavaScript; documentation adds one small deferred script for search, copy buttons, and
  scrollspy, and every page still reads and navigates without it.
- No third-party fonts and no analytics; the pages work offline once loaded.
- Each write-up uses question-form `<h2>`s, a visible key-takeaways list, a matching FAQ `<details>` block plus
  `FAQPage` markup, an author box, and cross-links between the posts and the product page, so a single answer can be
  lifted without losing its caveats.
