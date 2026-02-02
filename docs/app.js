/**
 * 確定パラメータの表示制御
 * 選択式 Q&A で確定した値を params.json または CONFIRMED に持たせ、「今、何が確定したか」を表示する。
 */
(function () {
  const CONFIRMED = {
    1: null,
    2: null,
    3: null,
  };

  function applyParams(data) {
    if (data && typeof data === "object") {
      ["1", "2", "3"].forEach(function (k) {
        if (data[k] != null && data[k] !== "") CONFIRMED[k] = data[k];
      });
    }
  }

  function updateConfirmedSummary() {
    const n = ["1", "2", "3"].filter(function (k) { return CONFIRMED[k] != null && CONFIRMED[k] !== ""; }).length;
    const el = document.getElementById("confirmed-summary");
    if (el) el.textContent = "今、何が確定したか: " + n + " / 3 項目";
  }

  function renderParamDisplay() {
    const container = document.getElementById("param-display");
    if (!container) return;

    updateConfirmedSummary();

    const items = container.querySelectorAll(".param-item");
    items.forEach(function (el) {
      const paramId = el.getAttribute("data-param");
      const valueEl = el.querySelector(".value");
      if (!valueEl) return;

      const raw = CONFIRMED[paramId];
      let placeholder = valueEl.querySelector(".placeholder");
      if (raw) {
        valueEl.textContent = raw;
        valueEl.classList.add("confirmed");
      } else {
        valueEl.classList.remove("confirmed");
        if (!placeholder) {
          placeholder = document.createElement("span");
          placeholder.className = "placeholder";
          valueEl.appendChild(placeholder);
        }
        placeholder.textContent = getPlaceholderText(paramId);
      }
    });
  }

  function getPlaceholderText(paramId) {
    const texts = {
      1: "未確定（理論 / 時間 / 精神 / スキル / 環境）",
      2: "未確定（観測者 / 共犯者 / センサー / ノイズ）",
      3: "未確定（落ち込み・怒り・無力感のトリガー）",
    };
    return texts[paramId] || "未確定";
  }

  function init() {
    renderParamDisplay();
    fetch("params.json")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        applyParams(data);
        renderParamDisplay();
      })
      .catch(function () {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
