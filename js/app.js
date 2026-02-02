/**
 * エントリ: 定義読み込み → 自己紹介表示・最近のこと・AIたなかたかし対話を初期化。
 */
(function () {
  let definition = null;

  function renderSelfIntro(merged) {
    const container = document.getElementById("self-intro");
    if (!container) return;
    const basic = merged.basic;
    const profile = merged.profile || {};
    if (!basic) {
      container.innerHTML = "<p class=\"status-note\">読み込めなかったよ。またあとで見てね。</p>";
      return;
    }
    const name = basic.displayName || "";
    const handle = basic.handle ? " X では @" + basic.handle + " で発信してる。" : "";
    const oneLiner = basic.oneLinerJa || basic.oneLiner || "";
    const type = profile.type || "";
    const reward = profile.reward || "実装が動いた瞬間";
    const future = profile.future10y || "自由に面白い実験を続けていたい";
    const html =
      "<p class=\"self-intro-lead\">" + name + "です。" + (handle ? handle : "") + "</p>" +
      "<p>世界にまだないものを作るのが好きで、" + reward + "が一番うれしい。</p>" +
      "<p>" + (type ? type + "で、" : "") + "10年後も" + future + "なと思ってる。</p>" +
      (oneLiner ? "<p class=\"self-intro-oneliner\">一言でいうと、「" + oneLiner + "」って感じ。</p>" : "");
    container.innerHTML = html;
  }

  function renderRecent(merged) {
    const el = document.getElementById("recent-summary");
    if (!el || !merged.recent || !merged.recent.summary) return;
    const summary = merged.recent.summary;
    const url = (merged.recent.twitterUrl || "https://x.com/tatmos").trim();
    const linked = summary.replace(/@tatmos/g, "<a href=\"" + url + "\">@tatmos</a>");
    el.innerHTML = linked;
  }

  function getReply(text) {
    if (!definition) return "まだ準備中だからちょっと待ってね。";
    return typeof RulesEngine !== "undefined" && RulesEngine.getReply
      ? RulesEngine.getReply(text, definition)
      : "うまく動いてないかも。もう一度試してみて。";
  }

  function init() {
    const loader = typeof DefinitionLoader !== "undefined" ? DefinitionLoader : null;
    if (!loader || !loader.loadAll) {
      document.addEventListener("DOMContentLoaded", init);
      return;
    }

    loader.loadAll().then(function (merged) {
      definition = merged;
      renderSelfIntro(merged);
      renderRecent(merged);

      if (typeof ChatUI !== "undefined" && ChatUI.bindSubmit) {
        ChatUI.bindSubmit(getReply);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
