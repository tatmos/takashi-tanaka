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
    "tone",
    "privacy",
    "rules",
    "recent",
  ];
  const DEFINITION_BASE = "definition/";

  function loadOne(name) {
    return fetch(DEFINITION_BASE + name + ".json")
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .catch(function () {
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
