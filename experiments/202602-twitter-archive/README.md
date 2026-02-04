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
  - `note_frequentTerms` で frequentTerms の説明を記載。

- **output/suggested-rules-keywords.json**（自動生成）  
  - `suggestedKeywordsForRules` と同じキーワード配列。definition/rules.json のいずれかのルールの `keywords` に追加するときのコピー用。

- **output/suggested-timeline-items.json**（自動生成）  
  - `timelineCandidates` から先頭 30 件を `{ label, date, category }` 形式にした配列。`category` は空なので手で game/cedec/event などを入れる。definition/timeline.json の `recentYear.items` に追加するときのたたき。

出力は **候補**なので、そのまま definition にコピーせず、手で選んで反映する。

## プライバシー

- `output/` 内の `*.json` は `.gitignore` で無視される。ツイート本文のスニペットが含まれるため、必要に応じてリポジトリに commit しない運用にする。

## 参照

- 本リポジトリ [tweetデータ活用.md](../tweetデータ活用.md) の「キーワードの半自動抽出」「データ化の流れ」
- 企画・運用ルールはリポジトリルートの .cursor/rules を参照。
