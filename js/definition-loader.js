/**
 * definition/*.json を読み込み、カテゴリ別にマージしたオブジェクトを返す。
 * 個人情報は公開範囲のみ。大きなファイルは分割して管理する。
 */
(function (global) {
  const DEFINITION_FILES = [
    "basic",
    "profile",
    "params",
    "public",
    "site-content",
    "tone",
    "privacy",
    "rules",
    "recent",
    "faq",
    "behavior",
    "timeline",
  ];
  function getDefinitionBase() {
    if (typeof document === "undefined" || !document.location) return "definition/";
    var href = document.location.href;
    var path = document.location.pathname || "/";
    var base = path.replace(/\/[^/]*$/, "") || "/";
    return base + (base.endsWith("/") ? "" : "/") + "definition/";
  }

  function loadOne(name) {
    var url = getDefinitionBase() + name + ".json";
    return fetch(url)
      .then(function (r) {
        if (!r.ok && typeof console !== "undefined" && console.warn) {
          console.warn("definition: " + name + ".json の取得に失敗しました (" + r.status + "): " + url);
        }
        return r.ok ? r.json() : null;
      })
      .catch(function (err) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("definition: " + name + ".json の取得に失敗しました: " + url, err);
        }
        return null;
      });
  }

  function loadAll() {
    const promises = DEFINITION_FILES.map(function (name) {
      return loadOne(name).then(function (data) {
        return { name: name, data: data };
      });
    });
    return Promise.all(promises).then(function (results) {
      const merged = {};
      results.forEach(function (r) {
        if (r.data != null) merged[r.name] = r.data;
      });
      return merged;
    });
  }

  global.DefinitionLoader = {
    loadAll: loadAll,
    loadOne: loadOne,
  };
})(typeof window !== "undefined" ? window : this);
