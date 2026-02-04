/**
 * 最近年から過去へ、1年ずつ apply-candidates を実行する。
 * 実行前に analyze.js を実行し、output/ に候補があること。
 * 各年の反映後は definition を開いて変な文言があれば手で削除する。
 *
 * 実行例:
 *   node apply-by-years.js
 *   node apply-by-years.js --add-rules=5 --add-faq=3
 *   node apply-by-years.js --dry-run
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const OUTPUT_DIR = path.join(DIR, "output");
const CONFIG_PATH = path.join(DIR, "config.json");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { tweets: null, addRules: 5, addFaq: 3, dryRun: false };
  for (const a of args) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a.startsWith("--tweets=")) out.tweets = a.slice("--tweets=".length).trim();
    else if (a.startsWith("--add-rules=")) out.addRules = Math.max(0, parseInt(a.slice("--add-rules=".length), 10) || 0);
    else if (a.startsWith("--add-faq=")) out.addFaq = Math.max(0, parseInt(a.slice("--add-faq=".length), 10) || 0);
  }
  return out;
}

function getYearsNewestFirst() {
  const faqPath = path.join(OUTPUT_DIR, "faq-keyword-candidates.json");
  const timelinePath = path.join(OUTPUT_DIR, "timeline-candidates.json");
  if (fs.existsSync(faqPath)) {
    const data = JSON.parse(fs.readFileSync(faqPath, "utf8"));
    const byYear = data.byYear || {};
    const years = Object.keys(byYear).filter((y) => /^\d{4}$/.test(y)).map(Number);
    if (years.length) return years.sort((a, b) => b - a).map(String);
  }
  if (fs.existsSync(timelinePath)) {
    const data = JSON.parse(fs.readFileSync(timelinePath, "utf8"));
    const byYearCount = data.byYearCount || {};
    const years = Object.keys(byYearCount).filter((y) => /^\d{4}$/.test(y)).map(Number);
    if (years.length) return years.sort((a, b) => b - a).map(String);
  }
  const now = new Date().getUTCFullYear();
  return Array.from({ length: 12 }, (_, i) => String(now - i));
}

function getTweetsPath() {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    const p = config.tweetsJsPath && config.tweetsJsPath.trim();
    if (p && fs.existsSync(path.resolve(p))) return path.resolve(p);
  } catch (_) {}
  return null;
}

function runApply(year, tweetsPath, addRules, addFaq, dryRun) {
  const argv = ["apply-candidates.js"];
  if (tweetsPath) argv.push("--tweets=" + tweetsPath);
  argv.push("--year=" + year);
  if (addRules > 0) argv.push("--add-rules=" + addRules);
  if (addFaq > 0) argv.push("--add-faq=" + addFaq);
  if (dryRun) argv.push("--dry-run");
  const r = spawnSync(process.execPath, argv, { cwd: DIR, stdio: "inherit", shell: false });
  return r.status === 0;
}

function main() {
  const args = parseArgs();
  const years = getYearsNewestFirst();
  const tweetsPath = args.tweets || getTweetsPath();
  if (!tweetsPath) {
    console.error("--tweets=path/to/tweets.js を指定するか、config.json の tweetsJsPath を設定してください。");
    process.exit(1);
  }

  console.error("対象年（新しい順）:", years.join(", "));
  console.error("recent を実行してから、各年を順に実行します。");

  const recentOk = runApply("recent", tweetsPath, 0, 0, args.dryRun);
  if (!recentOk) {
    console.error("recent で失敗しました。");
    process.exit(1);
  }

  for (const year of years) {
    const ok = runApply(year, tweetsPath, args.addRules, args.addFaq, args.dryRun);
    if (!ok) {
      console.error("year " + year + " で失敗しました。");
      process.exit(1);
    }
  }
  console.error("完了。definition/timeline.json, rules.json, faq.json を開いて変な文言があれば削除してください。");
}

main();
