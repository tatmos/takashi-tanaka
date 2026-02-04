/**
 * ユーザー入力にマッチするルールを探し、定義データでテンプレートを埋めて返答を返す。
 * プライバシーキーワードに触れた場合は答えない。
 */
(function (global) {
  function getByPath(obj, path) {
    if (!obj || !path) return undefined;
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length; i++) {
      cur = cur[parts[i]];
      if (cur === undefined) return undefined;
    }
    return cur;
  }

  function fillTemplate(template, definition) {
    if (!template || !definition) return template;
    return template.replace(/\{\{([^}]+)\}\}/g, function (_, key) {
      const value = getByPath(definition, key.trim());
      return value != null ? String(value) : "";
    });
  }

  function shouldRefuse(input, privacy) {
    if (!input || !privacy || !privacy.refuseKeywords) return false;
    const text = input.toLowerCase().replace(/\s/g, "");
    return privacy.refuseKeywords.some(function (kw) {
      return text.indexOf(kw.toLowerCase()) !== -1;
    });
  }

  function matchRule(input, rulesArray) {
    if (!input || !rulesArray || !rulesArray.length) return null;
    const text = input.trim();
    if (!text) return null;
    for (let i = 0; i < rulesArray.length; i++) {
      const rule = rulesArray[i];
      const keywords = rule.keywords || [];
      const hit = keywords.some(function (kw) {
        return text.indexOf(kw) !== -1;
      });
      if (hit) return rule;
    }
    return null;
  }

  function getReply(input, definition) {
    if (!definition) {
      return "その質問にはまだ答えられないかも。別の聞き方か、別の話題で聞いてください。";
    }
    const privacy = definition.privacy;
    if (shouldRefuse(input, privacy)) {
      return (privacy && privacy.refuseMessage) || "それは公開してない情報だから、答えられない。";
    }
    const rulesConfig = definition.rules;
    const rulesArray = rulesConfig && (Array.isArray(rulesConfig) ? rulesConfig : rulesConfig.rules);
    if (!rulesArray || !rulesArray.length) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("ルールが読み込めていません。definition/rules.json が fetch で取得できているか確認してください。file:// で開いている場合はローカルサーバー（npx serve など）を使ってください。");
      }
      return "その質問にはまだ答えられないかも。別の聞き方か、別の話題で聞いてください。";
    }
    const rule = matchRule(input, rulesArray);
    if (rule && rule.echo) {
      return (input && input.trim()) || "";
    }
    if (rule && rule.template) {
      return fillTemplate(rule.template, definition);
    }
    return (rulesConfig && rulesConfig.fallback) || "その質問にはまだ答えられないかも。別の聞き方か、別の話題で聞いてください。";
  }

  global.RulesEngine = {
    getReply: getReply,
    getByPath: getByPath,
    fillTemplate: fillTemplate,
    shouldRefuse: shouldRefuse,
    matchRule: matchRule,
  };
})(typeof window !== "undefined" ? window : this);
