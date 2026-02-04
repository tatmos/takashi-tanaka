/**
 * 候補を definition に反映する（1年単位）。
 * 実行例:
 *   node apply-candidates.js --tweets=path/to/tweets.js --year=2025
 *   node apply-candidates.js --tweets=path/to/tweets.js --year=recent
 *   node apply-candidates.js --add-rules=5 --add-faq=3
 *   node apply-candidates.js --year=2025 --add-rules=5 --dry-run
 */
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const OUTPUT_DIR = path.join(DIR, "output");
const DEF_DIR = path.join(DIR, "..", "..", "definition");
const PREFIX_REGEX = /^window\.YTD\.tweets\.part\d+\s*=\s*/;
const CONFIG_PATH = path.join(DIR, "config.json");

/** rules/faq に追加しないキーワード（変な文言・ノイズ）。1年ごと反映後にチェックして削除も可能。 */
const BLOCKED_KEYWORDS = new Set([
  "を開始しました", "を投稿しました", "がアップロード", "on", "at", "by", "for", "the", "live", "Game",
  "...", "うーむ", "おお", "うむ", "なるほど", "さて", "ああ", "おお", "あと13時間", "あと15時間",
  "ifdefとかあるのかな", "渋谷へ移動中", "腹減った"
]);
function isBlockedKeyword(k) {
  if (!k || typeof k !== "string") return true;
  const t = k.trim();
  if (t.length <= 1) return true;
  if (t.startsWith("@")) return true;
  if (/^https?:\/\/\S*$/i.test(t) || /^[a-z][a-z0-9+.-]*:\/\/\S*$/i.test(t)) return true;
  if (BLOCKED_KEYWORDS.has(t)) return true;
  if (/^[\s\.…]+$/.test(t)) return true;
  return false;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { tweets: null, year: null, addRules: null, addFaq: null, dryRun: false };
  for (const a of args) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a.startsWith("--tweets=")) out.tweets = a.slice("--tweets=".length).trim();
    else if (a.startsWith("--year=")) out.year = a.slice("--year=".length).trim();
    else if (a.startsWith("--add-rules=")) out.addRules = parseInt(a.slice("--add-rules=".length), 10) || 0;
    else if (a.startsWith("--add-faq=")) out.addFaq = parseInt(a.slice("--add-faq=".length), 10) || 0;
  }
  return out;
}

function parseTweetsJs(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const jsonStr = raw.replace(PREFIX_REGEX, "").trim();
  return JSON.parse(jsonStr);
}

function parseTweetDate(createdAt) {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  return isNaN(d.getTime()) ? null : d;
}

function getHashtags(tweet) {
  const ent = tweet && tweet.entities;
  const tags = (ent && ent.hashtags) || [];
  return tags.map((h) => (h && h.text) || "").filter(Boolean);
}

function getFullText(tweet) {
  return (tweet && tweet.full_text) || "";
}

function toDateLabel(d) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return m === 1 ? String(y) : y + "." + m;
}

function buildTimelineForYear(tweets, yearOrRecent, config) {
  const snippetLen = Math.max(0, parseInt(config.timelineSnippetLength, 10) || 50);
  const perMonth = Math.max(1, parseInt(config.timelineCandidatesPerMonth, 10) || 5);

  const now = new Date();
  const recentStart = new Date(now.getTime());
  recentStart.setDate(recentStart.getDate() - (config.recentYearDays || 365));

  let filtered = [];
  let yearLabel;
  if (yearOrRecent === "recent") {
    filtered = tweets.filter((entry) => {
      const t = entry && entry.tweet;
      if (!t) return false;
      const d = parseTweetDate(t.created_at);
      return d && d >= recentStart && d <= now;
    });
    yearLabel = "recent";
  } else {
    const y = parseInt(yearOrRecent, 10);
    if (isNaN(y)) return null;
    yearLabel = String(y);
    filtered = tweets.filter((entry) => {
      const t = entry && entry.tweet;
      if (!t) return false;
      const d = parseTweetDate(t.created_at);
      return d && d.getUTCFullYear() === y;
    });
  }

  const monthToTweets = {};
  const hashtagCount = {};
  for (const entry of filtered) {
    const t = entry.tweet;
    const d = parseTweetDate(t.created_at);
    const text = getFullText(t);
    const ym = d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
    if (!monthToTweets[ym]) monthToTweets[ym] = [];
    monthToTweets[ym].push({ date: d, text, tweet: t });
    for (const tag of getHashtags(t)) {
      const key = tag.replace(/\s/g, "");
      if (key) hashtagCount[key] = (hashtagCount[key] || 0) + 1;
    }
  }

  const urlOnlyOrEmpty = (str) => !str || !str.trim() || /^https?:\/\/\S*$/i.test(str.trim()) || /^[\s\.…]+$/.test(str.trim());
  const items = [];
  for (const ym of Object.keys(monthToTweets).sort()) {
    const list = monthToTweets[ym].sort((a, b) => b.date - a.date);
    const sampled = list.slice(0, perMonth);
    for (const s of sampled) {
      let snippet = (s.text || "").replace(/\s+/g, " ").trim().slice(0, snippetLen);
      if (urlOnlyOrEmpty(snippet)) snippet = "";
      items.push({
        label: snippet || toDateLabel(s.date),
        date: toDateLabel(s.date),
        category: ""
      });
    }
  }
  items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const topHashtags = Object.entries(hashtagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag);
  const summary = topHashtags.length
    ? "この期間は " + topHashtags.join("、") + " などについて投稿しています。詳細は X やサイトを参照してください。"
    : "（要約は手で編集してください）";

  return { summary, items, yearLabel };
}

function applyTimeline(tweetsPath, yearOrRecent, dryRun) {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const tweets = parseTweetsJs(tweetsPath);
  if (!Array.isArray(tweets)) throw new Error("tweets.js: expected array");

  const built = buildTimelineForYear(tweets, yearOrRecent, config);
  if (!built) throw new Error("invalid year: " + yearOrRecent);

  const timelinePath = path.join(DEF_DIR, "timeline.json");
  const timeline = JSON.parse(fs.readFileSync(timelinePath, "utf8"));

  if (built.yearLabel === "recent") {
    timeline.recentYear = timeline.recentYear || {};
    timeline.recentYear.summary = built.summary;
    timeline.recentYear.items = built.items;
    if (!dryRun) fs.writeFileSync(timelinePath, JSON.stringify(timeline, null, 2), "utf8");
    console.error("[timeline] updated recentYear (summary +", built.items.length, "items)");
  } else {
    timeline.byYear = timeline.byYear || {};
    timeline.byYear[built.yearLabel] = { summary: built.summary, items: built.items };
    if (!dryRun) fs.writeFileSync(timelinePath, JSON.stringify(timeline, null, 2), "utf8");
    console.error("[timeline] updated byYear[" + built.yearLabel + "] (summary +", built.items.length, "items)");
  }
  if (dryRun) console.error("[dry-run] would write timeline.json");
}

function getSuggestedKeywordsForYear(yearFilter) {
  if (yearFilter) {
    const faqCandidatesPath = path.join(OUTPUT_DIR, "faq-keyword-candidates.json");
    if (!fs.existsSync(faqCandidatesPath)) return null;
    const faqCandidates = JSON.parse(fs.readFileSync(faqCandidatesPath, "utf8"));
    const byYear = faqCandidates.byYear || {};
    const yearEntry = byYear[String(yearFilter)];
    if (yearEntry && Array.isArray(yearEntry.suggestedKeywords)) return yearEntry.suggestedKeywords;
    return null;
  }
  const suggestedPath = path.join(OUTPUT_DIR, "suggested-rules-keywords.json");
  if (!fs.existsSync(suggestedPath)) return null;
  const data = JSON.parse(fs.readFileSync(suggestedPath, "utf8"));
  return data.keywords || null;
}

function applyRules(n, dryRun, yearFilter) {
  const suggested = getSuggestedKeywordsForYear(yearFilter);
  if (!suggested || suggested.length === 0) {
    const src = yearFilter ? `byYear[${yearFilter}]` : "suggested-rules-keywords.json";
    throw new Error("run analyze.js first; no keywords in " + src);
  }
  const rulesPath = path.join(DEF_DIR, "rules.json");
  const rules = JSON.parse(fs.readFileSync(rulesPath, "utf8"));
  const existing = new Set();
  (rules.rules || []).forEach((r) => (r.keywords || []).forEach((k) => existing.add(String(k).toLowerCase())));

  const toAdd = [];
  for (const kw of suggested) {
    if (toAdd.length >= n) break;
    const k = String(kw).trim();
    if (k && !existing.has(k.toLowerCase()) && !isBlockedKeyword(k)) {
      toAdd.push(k);
      existing.add(k.toLowerCase());
    }
  }

  const targetId = "games";
  const rule = (rules.rules || []).find((r) => r.id === targetId);
  if (!rule) throw new Error("rule not found: " + targetId);
  rule.keywords = rule.keywords || [];
  rule.keywords.push(...toAdd);

  if (!dryRun) fs.writeFileSync(rulesPath, JSON.stringify(rules, null, 2), "utf8");
  const scope = yearFilter ? ` (year ${yearFilter})` : "";
  console.error("[rules] added", toAdd.length, "keywords to rule", targetId, scope, ":", toAdd.slice(0, 5).join(", "), toAdd.length > 5 ? "..." : "");
  if (dryRun) console.error("[dry-run] would write rules.json");
}

function applyFaq(n, dryRun, yearFilter) {
  const suggested = getSuggestedKeywordsForYear(yearFilter);
  if (!suggested || suggested.length === 0) {
    const src = yearFilter ? `byYear[${yearFilter}]` : "suggested-rules-keywords.json";
    throw new Error("run analyze.js first; no keywords in " + src);
  }
  const faqPath = path.join(DEF_DIR, "faq.json");
  const faq = JSON.parse(fs.readFileSync(faqPath, "utf8"));
  const existingQ = new Set((faq.items || []).map((i) => (i && i.q || "").trim().toLowerCase()));

  const toAdd = [];
  for (const kw of suggested) {
    if (toAdd.length >= n) break;
    const q = String(kw).trim();
    if (q && !existingQ.has(q.toLowerCase()) && !isBlockedKeyword(q)) {
      toAdd.push({ q, a: null });
      existingQ.add(q.toLowerCase());
    }
  }

  faq.items = faq.items || [];
  faq.items.push(...toAdd);
  if (!dryRun) fs.writeFileSync(faqPath, JSON.stringify(faq, null, 2), "utf8");
  const scope = yearFilter ? ` (year ${yearFilter})` : "";
  console.error("[faq] added", toAdd.length, "items", scope + ":", toAdd.map((i) => i.q).slice(0, 3).join(", "), toAdd.length > 3 ? "..." : "");
  if (dryRun) console.error("[dry-run] would write faq.json");
}

function main() {
  const args = parseArgs();

  if (args.year && args.tweets) {
    applyTimeline(args.tweets, args.year, args.dryRun);
  } else if (args.year && !args.tweets) {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    const tweetsPath = config.tweetsJsPath && config.tweetsJsPath.trim() ? path.resolve(config.tweetsJsPath) : null;
    if (!tweetsPath || !fs.existsSync(tweetsPath)) {
      console.error("--year requires --tweets=path or tweetsJsPath in config.json");
      process.exit(1);
    }
    applyTimeline(tweetsPath, args.year, args.dryRun);
  }

  const yearForKeywords = args.year && args.year !== "recent" ? args.year : null;
  if (args.addRules > 0) applyRules(args.addRules, args.dryRun, yearForKeywords);
  if (args.addFaq > 0) applyFaq(args.addFaq, args.dryRun, yearForKeywords);

  if (!args.year && !args.addRules && !args.addFaq) {
    console.error("Usage: node apply-candidates.js [--tweets=path] --year=2025|recent [--add-rules=N] [--add-faq=N] [--dry-run]");
    console.error("  1年単位: --year=2025 で timeline 更新。--add-rules=N --add-faq=N を付けるとその年の候補から rules/faq に追加。");
    process.exit(1);
  }
}

main();
