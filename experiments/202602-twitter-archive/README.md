# 202602 Twitter アーカイブ集計

X (Twitter) のアーカイブ `data/tweets.js` を解析し、**timeline 用候補**と **FAQ キーワード候補**を出力する実験。

## 使い方

1. X のデータダウンロードで取得した ZIP を解凍する。
2. `tweets.js` のパスを指定して実行する。

```bash
node analyze.js "D:\twitter20260204archive\twitter-2026-02-04-...\data\tweets.js"
```

パスを省略した場合は `config.json` の `tweetsJsPath` に絶対パスを書いておく。

## recentYear の定義

- **recentYear** = スクリプト実行時の「今」から **365 日間**（1 年）のツイート。
- 例: 2026-02-04 に実行した場合、2025-02-04 00:00:00 以降のツイートが recentYear 対象。
- 日付の境界は **UTC** で計算している（`created_at` が UTC のため）。

`config.json` の `recentYearDays` を変えると日数変更可能。

## 出力

- **output/timeline-candidates.json**  
  - `recentYearRange`, `recentYearTweetCount`, `byMonth`, `hashtagsRecent`, `timelineCandidates`（日付＋本文スニペット）, `byYearCount`。  
  - definition/timeline.json の `recentYear` / `byYear` を手で更新するときのたたきとして使う。

- **output/faq-keyword-candidates.json**  
  - `hashtags` … ハッシュタグの頻度順リスト。  
  - `frequentTerms` … **全ツイート本文をスペース・句読点で区切った単語**の出現頻度（ストップワード除外後）。ルールの keywords や FAQ の q の言い換え候補。  
  - `suggestedKeywordsForRules` … 既存キーワードと重複せず、**URL のみのものは除外**した候補。  
  - `byYear` … **年別**のキーワード候補。`byYear["2025"].suggestedKeywords` など。apply-candidates.js の `--year=2025 --add-rules=N` で利用。  
  - `note_frequentTerms` で frequentTerms の説明を記載。

- **output/suggested-rules-keywords.json**（自動生成）  
  - `suggestedKeywordsForRules` と同じキーワード配列。definition/rules.json のいずれかのルールの `keywords` に追加するときのコピー用。

- **output/suggested-timeline-items.json**（自動生成）  
  - `timelineCandidates` から先頭 30 件を `{ label, date, category }` 形式にした配列。`category` は空なので手で game/cedec/event などを入れる。definition/timeline.json の `recentYear.items` に追加するときのたたき。

出力は **候補**なので、そのまま definition にコピーせず、手で選んで反映する。

## プライバシー

- `output/` 内の `*.json` は `.gitignore` で無視される。ツイート本文のスニペットが含まれるため、必要に応じてリポジトリに commit しない運用にする。

## 定義への自動反映（1年単位）

`apply-candidates.js` で、候補を **definition にそのまま書き込む**ことができます。1年ずつ実行する想定です。

1. **先に analyze.js を実行**して output/ に候補を出力する。
2. **timeline（1年単位）**  
   - `--year=2025` … その年のツイートから `timeline.byYear["2025"]` の summary と items を生成し、timeline.json を上書き。  
   - `--year=recent` … 直近1年分から `recentYear` を更新。
3. **rules / faq（年単位 or 全体）**  
   - `--year=2025 --add-rules=N` … **その年**の候補（faq-keyword-candidates.json の `byYear["2025"].suggestedKeywords`）から先頭 N 件を、重複なしで `rules.json` の `games` の keywords に追加。  
   - `--year=2025 --add-faq=N` … 同じくその年の候補から N 件を `faq.json` の items に `{ q, a: null }` で追加。  
   - `--add-rules=N` / `--add-faq=N` だけ（--year なし）… 従来どおり **全体**の suggested-rules-keywords.json から追加。  
   - `--year=recent` のときは rules/faq には年を渡さない（recent 用の byYear は出さないため、全体候補を使用）。

```bash
# 2025年分で timeline.byYear["2025"] を更新（dry-run）
node apply-candidates.js --tweets="D:\...\data\tweets.js" --year=2025 --dry-run

# 反映する
node apply-candidates.js --tweets="D:\...\data\tweets.js" --year=2025

# recentYear を更新
node apply-candidates.js --tweets="D:\...\data\tweets.js" --year=recent

# 2025年分だけ: timeline 更新 + その年のキーワードで rules 5件・faq 3件追加（1年単位の一括）
node apply-candidates.js --tweets="D:\...\data\tweets.js" --year=2025 --add-rules=5 --add-faq=3

# 事前確認
node apply-candidates.js --year=2025 --add-rules=5 --add-faq=3 --dry-run

# 年を指定しない＝全体の候補から rules/faq に追加
node apply-candidates.js --add-rules=5 --add-faq=3
```

- **--dry-run** … 実際には書き込まず、何をするかだけ表示する。  
- timeline の summary は、その期間のハッシュタグ上位から自動で文を組み立てます。必要ならあとから definition/timeline.json を手で編集してください。  
- **変な文言の自動除外** … rules/faq に追加するキーワードは、`@` 始まり・URL・「を開始しました」「うーむ」などのノイズは apply-candidates 内でブロックしています。それ以外で不要なものは反映後に definition を開いて手で削除してください。

## 最近から過去へ1年ずつ反映

1. **analyze.js を実行**して output/ に候補（byYear 含む）を出す。
2. **config.json** の `tweetsJsPath` に `tweets.js` の絶対パスを書く。
3. **手動で1年ずつ**（推奨: 各年のあと definition をチェックして変な文言を削除）  
   - 直近1年: `node apply-candidates.js --year=recent`  
   - 各年: `node apply-candidates.js --year=2026 --add-rules=5 --add-faq=3` → 次に `--year=2025` … の順で実行。
4. **一括で順に実行**する場合:  
   `node apply-by-years.js --tweets="D:\...\data\tweets.js" --add-rules=5 --add-faq=3`  
   （config.json に tweetsJsPath を書いてあれば `--tweets=` は省略可。）  
   - recent を更新してから、faq-keyword-candidates の byYear にある年を新しい順に apply-candidates で反映する。  
   - 終了後に definition/timeline.json, rules.json, faq.json を開き、変な文言があれば削除する。
5. **事前確認**: `node apply-by-years.js --tweets="D:\...\data\tweets.js" --add-rules=5 --add-faq=3 --dry-run`

## 参照

- 本リポジトリ [tweetデータ活用.md](../tweetデータ活用.md) の「キーワードの半自動抽出」「データ化の流れ」
- 企画・運用ルールはリポジトリルートの .cursor/rules を参照。
