# AIたなかたかし

自己紹介・最近のこと・対話ができる 1 ページサイト。田中孝（ちゃり）の定義をもとに、いろいろ質問に答える。

## このリポジトリでやっていること

- **公開サイト**: ルートの `index.html` を GitHub Pages で公開（Folder: / (root)）。自己紹介・最近のこと（X タイムライン）・「なんでも聞いて」対話の 3 ブロック。
- **対話**: ルールベース。定義データ（`definition/`）と `definition/rules.json` に基づいて返答する。日本語のみ。
- **定義**: `definition/` 配下の JSON（basic, profile, params, public, recent, tone, privacy, rules）を手動で編集。個人情報は公開してよい範囲のみ。詳しくは [企画書.md](企画書.md) を参照。

## 構成（抜粋）

```
/
├── index.html          # エントリ
├── style.css
├── definition/         # 定義（カテゴリ別 JSON）
├── js/                 # definition-loader, rules-engine, chat-ui, app
├── README.md
├── 企画書.md
└── experiments/        # 実験用（運用ルールは .cursor/rules/repo.mdc）
```

## 運用

- 実験は `experiments/` 以下。命名は `experiments/YYYYMM-短い名前`。
- 定義の更新は `definition/*.json` を直接編集。
- 詳細な仕様・画面構成・今後の拡張案は [企画書.md](企画書.md) に記載。

## リンク

- [park18](http://park18.wakwak.com/~cha/index.html)
- [X @tatmos](https://x.com/tatmos)
