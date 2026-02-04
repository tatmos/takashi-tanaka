/**
 * X (Twitter) アーカイブ tweets.js を解析し、
 * timeline 用候補と FAQ キーワード候補を output/ に出力する。
 * 実行: node analyze.js [path/to/tweets.js]
 */
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const CONFIG_PATH = path.join(DIR, "config.json");
const OUTPUT_DIR = path.join(DIR, "output");

const PREFIX_REGEX = /^window\.YTD\.tweets\.part\d+\s*=\s*/;

// 簡易ストップワード（1–2文字の助詞・常用語）
const STOPWORDS = new Set([
  "の", "を", "に", "は", "が", "と", "で", "し", "た", "て", "だ", "な", "よ", "か", "も", "や", "する", "した", "です", "ある", "いる", "こと", "よう", "これ", "それ", "あれ", "その", "この", "どの", "です", "ます", "でした", "ました", "れる", "られる", "てる", "でる", "から", "より", "まで", "など", "って", "なら", "ので", "ため", "rt", "RT"
]);

function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  return JSON.parse(raw);
}

function getTweetsPath(argv, config) {
  const arg = argv && argv[2];
  if (arg && arg.trim()) return path.resolve(arg.trim());
  if (config.tweetsJsPath && config.tweetsJsPath.trim()) return path.resolve(config.tweetsJsPath.trim());
  return null;
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

function toYearMonth(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function toDateStr(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function collectExistingKeywords() {
  const defDir = path.join(DIR, "..", "..", "definition");
  const keywords = new Set();
  try {
    const rulesPath = path.join(defDir, "rules.json");
    if (fs.existsSync(rulesPath)) {
      const rules = JSON.parse(fs.readFileSync(rulesPath, "utf8"));
      (rules.rules || []).forEach((r) => (r.keywords || []).forEach((k) => keywords.add(String(k).toLowerCase())));
    }
  } catch (_) {}
  try {
    const faqPath = path.join(defDir, "faq.json");
    if (fs.existsSync(faqPath)) {
      const faq = JSON.parse(fs.readFileSync(faqPath, "utf8"));
      (faq.items || []).forEach((item) => {
        const q = (item && item.q) || "";
        if (q.trim()) keywords.add(String(q).trim().toLowerCase());
      });
    }
  } catch (_) {}
  return keywords;
}

function buildTimelineOutput(tweets, recentStart, recentEnd, config) {
  const recentYearDays = config.recentYearDays || 365;
  const snippetLen = Math.max(0, parseInt(config.timelineSnippetLength, 10) || 50);
  const perMonth = Math.max(1, parseInt(config.timelineCandidatesPerMonth, 10) || 5);

  const byMonth = {};
  const hashtagsRecentCount = {};
  const byYearCount = {};
  const recentTweets = [];
  const monthToTweets = {};

  for (const entry of tweets) {
    const t = entry && entry.tweet;
    if (!t) continue;
    const text = getFullText(t);
    const createdAt = parseTweetDate(t.created_at);
    if (!createdAt) continue;

    const y = createdAt.getUTCFullYear();
    byYearCount[y] = (byYearCount[y] || 0) + 1;

    if (createdAt >= recentStart && createdAt <= recentEnd) {
      recentTweets.push({ date: createdAt, text, tweet: t });
      const ym = toYearMonth(createdAt);
      byMonth[ym] = (byMonth[ym] || 0) + 1;
      if (!monthToTweets[ym]) monthToTweets[ym] = [];
      monthToTweets[ym].push({ date: createdAt, text, tweet: t });
      for (const tag of getHashtags(t)) {
        const key = tag.replace(/\s/g, "");
        if (key) hashtagsRecentCount[key] = (hashtagsRecentCount[key] || 0) + 1;
      }
    }
  }

  const hashtagsRecent = Object.entries(hashtagsRecentCount)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => [tag, count]);

  const timelineCandidates = [];
  for (const ym of Object.keys(monthToTweets).sort()) {
    const list = monthToTweets[ym];
    list.sort((a, b) => b.date - a.date);
    const sampled = list.slice(0, perMonth);
    for (const s of sampled) {
      const snippet = (s.text || "").replace(/\s+/g, " ").trim().slice(0, snippetLen);
      timelineCandidates.push({
        date: toDateStr(s.date),
        textSnippet: snippet
      });
    }
  }
  timelineCandidates.sort((a, b) => b.date.localeCompare(a.date));

  return {
    recentYearRange: {
      from: toDateStr(recentStart),
      to: toDateStr(recentEnd)
    },
    recentYearTweetCount: recentTweets.length,
    byMonth,
    hashtagsRecent,
    timelineCandidates,
    byYearCount
  };
}

function simpleTokenize(text) {
  if (!text || typeof text !== "string") return [];
  const normalized = text.replace(/\s+/g, " ").trim();
  const tokens = normalized.split(/[\s\u3000、。！？・（）［］\s]+/).filter(Boolean);
  return tokens;
}

function looksLikeProperNoun(token) {
  if (!token || token.length < 2) return false;
  if (/[a-zA-Z0-9]/.test(token)) return true;
  if (/[\u30A0-\u30FF]{2,}/.test(token)) return true;
  if (/[\u4E00-\u9FAF]{2,}/.test(token) && !STOPWORDS.has(token)) return true;
  return false;
}

/** URL のみの文字列かどうか。suggestedKeywordsForRules から除外するため */
function isUrlOnly(str) {
  if (!str || typeof str !== "string") return true;
  const t = str.trim();
  if (!t) return true;
  return /^https?:\/\/\S*$/i.test(t) || /^[a-z][a-z0-9+.-]*:\/\/\S*$/i.test(t);
}

function buildFaqOutput(tweets, config, existingKeywords) {
  const topHashtags = Math.max(1, parseInt(config.faqTopHashtags, 10) || 50);
  const topTerms = Math.max(1, parseInt(config.faqTopTerms, 10) || 80);
  const minLen = Math.max(1, parseInt(config.faqMinTermLength, 10) || 2);

  const allHashtags = {};
  const termCount = {};

  for (const entry of tweets) {
    const t = entry && entry.tweet;
    if (!t) continue;
    const text = getFullText(t);
    for (const tag of getHashtags(t)) {
      const key = tag.replace(/\s/g, "");
      if (key) allHashtags[key] = (allHashtags[key] || 0) + 1;
    }
    for (const token of simpleTokenize(text)) {
      const key = token.trim();
      if (key.length < minLen) continue;
      if (STOPWORDS.has(key)) continue;
      termCount[key] = (termCount[key] || 0) + 1;
    }
  }

  const hashtags = Object.entries(allHashtags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topHashtags)
    .map(([tag]) => tag);

  const frequentTerms = Object.entries(termCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topTerms * 2)
    .filter(([term]) => term.length >= minLen && !STOPWORDS.has(term))
    .slice(0, topTerms)
    .map(([term, count]) => [term, count]);

  const suggestedKeywordsForRules = [];
  const existingLower = new Set([...(existingKeywords || [])].map((k) => k.toLowerCase()));
  for (const tag of hashtags) {
    if (!existingLower.has(tag.toLowerCase()) && !isUrlOnly(tag)) suggestedKeywordsForRules.push(tag);
  }
  for (const [term] of frequentTerms) {
    if (looksLikeProperNoun(term) && !existingLower.has(term.toLowerCase()) && !isUrlOnly(term) && suggestedKeywordsForRules.length < 100) {
      suggestedKeywordsForRules.push(term);
    }
  }

  const filtered = [...new Set(suggestedKeywordsForRules)].filter((s) => !isUrlOnly(s)).slice(0, 80);

  return {
    faqKeywordCandidates: {
      note_frequentTerms: "全ツイート本文をスペース・句読点で区切った単語の出現頻度（ストップワード除外後）。ルールの keywords や FAQ の q の言い換え候補。",
      hashtags,
      frequentTerms,
      suggestedKeywordsForRules: filtered
    }
  };
}

/** 年別のキーワード候補を生成（apply-candidates.js --year で利用） */
function buildByYearKeywords(tweets, years, config, existingKeywords) {
  const byYear = {};
  for (const year of years) {
    const y = parseInt(year, 10);
    if (isNaN(y)) continue;
    const filtered = tweets.filter((entry) => {
      const t = entry && entry.tweet;
      if (!t) return false;
      const d = parseTweetDate(t.created_at);
      return d && d.getUTCFullYear() === y;
    });
    if (filtered.length === 0) continue;
    const out = buildFaqOutput(filtered, config, existingKeywords);
    const suggested = (out.faqKeywordCandidates && out.faqKeywordCandidates.suggestedKeywordsForRules) || [];
    byYear[String(year)] = { suggestedKeywords: suggested, tweetCount: filtered.length };
  }
  return byYear;
}

function main() {
  const config = loadConfig();
  const tweetsPath = getTweetsPath(process.argv, config);
  if (!tweetsPath || !fs.existsSync(tweetsPath)) {
    console.error("Usage: node analyze.js <path/to/tweets.js>");
    console.error("  Or set tweetsJsPath in config.json");
    process.exit(1);
  }

  console.error("Reading:", tweetsPath);
  const tweets = parseTweetsJs(tweetsPath);
  if (!Array.isArray(tweets)) {
    console.error("Expected an array of tweet entries.");
    process.exit(1);
  }

  const now = new Date();
  const recentEnd = new Date(now.getTime());
  const recentStart = new Date(now.getTime());
  recentStart.setDate(recentStart.getDate() - (config.recentYearDays || 365));

  const existingKeywords = collectExistingKeywords();

  const timelineOut = buildTimelineOutput(tweets, recentStart, recentEnd, config);
  const faqOut = buildFaqOutput(tweets, config, existingKeywords);

  const years = Object.keys(timelineOut.byYearCount || {}).sort((a, b) => Number(b) - Number(a));
  const byYear = buildByYearKeywords(tweets, years, config, existingKeywords);
  faqOut.byYear = byYear;
  faqOut.byYear_note = "apply-candidates.js --year=YYYY でその年の suggestedKeywords を rules/faq に追加するときに参照します。";

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const timelinePath = path.join(OUTPUT_DIR, "timeline-candidates.json");
  const faqPath = path.join(OUTPUT_DIR, "faq-keyword-candidates.json");

  fs.writeFileSync(timelinePath, JSON.stringify(timelineOut, null, 2), "utf8");
  fs.writeFileSync(faqPath, JSON.stringify(faqOut, null, 2), "utf8");

  // 定義にそのまま使える形式で自動生成: rules に足すキーワード一覧
  const suggestedKeywords = faqOut.faqKeywordCandidates.suggestedKeywordsForRules || [];
  const rulesKeywordsPath = path.join(OUTPUT_DIR, "suggested-rules-keywords.json");
  fs.writeFileSync(rulesKeywordsPath, JSON.stringify({ note: "definition/rules.json のいずれかのルールの keywords に追加する候補。URL のみのものは除外済み。", keywords: suggestedKeywords }, null, 2), "utf8");

  // timeline の items 候補を definition 形式で（label はスニペット、category は手で付与）
  const timelineItems = (timelineOut.timelineCandidates || []).slice(0, 30).map((c) => ({
    label: (c.textSnippet || "").replace(/\s+/g, " ").trim() || c.date,
    date: c.date,
    category: ""
  }));
  const timelineItemsPath = path.join(OUTPUT_DIR, "suggested-timeline-items.json");
  fs.writeFileSync(timelineItemsPath, JSON.stringify({ note: "definition/timeline.json の recentYear.items に追加する候補。category は game/cedec/event など手で入れる。", items: timelineItems }, null, 2), "utf8");

  console.error("Wrote:", timelinePath);
  console.error("Wrote:", faqPath);
  console.error("Wrote:", rulesKeywordsPath);
  console.error("Wrote:", timelineItemsPath);
  console.error("recentYear:", timelineOut.recentYearRange, "count:", timelineOut.recentYearTweetCount);
}

main();
