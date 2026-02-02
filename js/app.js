/**
 * エントリ: 定義読み込み → 自己紹介表示・最近のこと・AIたなかたかし対話を初期化。
 */
(function () {
  let definition = null;
  let qaPairNumber = 0;

  function getNextPairNumber() {
    qaPairNumber += 1;
    return qaPairNumber;
  }

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

  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function createFaqButton(item, container, faqPool, faqDisplayed, fullItems, showCount) {
    const q = item.q != null ? String(item.q).trim() : "";
    if (!q) return null;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "faq-btn";
    btn.textContent = q;
    btn.addEventListener("click", function () {
      const history = typeof ChatUI !== "undefined" && ChatUI.getHistoryEl ? ChatUI.getHistoryEl() : null;
      const num = getNextPairNumber();
      if (history) ChatUI.appendMessage(history, "user", q, num);
      let answer;
      if (item.a != null && String(item.a).trim() !== "") {
        answer = typeof RulesEngine !== "undefined" && RulesEngine.fillTemplate
          ? RulesEngine.fillTemplate(String(item.a), definition)
          : String(item.a);
      } else {
        answer = getReply(q);
      }
      if (history) ChatUI.appendMessage(history, "bot", answer, num);

      btn.remove();
      const idx = faqDisplayed.indexOf(item);
      if (idx !== -1) faqDisplayed.splice(idx, 1);
      let newItem = faqPool.length > 0 ? faqPool.pop() : null;
      if (!newItem && fullItems.length > 0) {
        const notShown = fullItems.filter(function (i) { return faqDisplayed.indexOf(i) === -1; });
        const refill = shuffleArray(notShown.length > 0 ? notShown.slice() : fullItems.slice());
        refill.forEach(function (i) { faqPool.push(i); });
        newItem = faqPool.length > 0 ? faqPool.pop() : fullItems[0];
      }
      if (newItem) {
        faqDisplayed.push(newItem);
        const newBtn = createFaqButton(newItem, container, faqPool, faqDisplayed, fullItems, showCount);
        if (newBtn) container.appendChild(newBtn);
      }
    });
    return btn;
  }

  function renderFaqButtons(merged) {
    const container = document.getElementById("faq-buttons");
    if (!container || !merged.faq || !merged.faq.items || !merged.faq.items.length) return;
    const fullItems = merged.faq.items.slice();
    const showCount = Math.max(0, parseInt(merged.faq.showCount, 10) || 4);
    const shuffled = shuffleArray(fullItems);
    const faqDisplayed = shuffled.slice(0, showCount);
    const faqPool = shuffled.slice(showCount);
    container.innerHTML = "";
    faqDisplayed.forEach(function (item) {
      const btn = createFaqButton(item, container, faqPool, faqDisplayed, fullItems, showCount);
      if (btn) container.appendChild(btn);
    });
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
      renderFaqButtons(merged);

      if (typeof ChatUI !== "undefined" && ChatUI.bindSubmit) {
        ChatUI.bindSubmit(getReply, getNextPairNumber);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
