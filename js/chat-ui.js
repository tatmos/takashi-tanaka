/**
 * AIたなかたかし 対話 UI: 入力・送信・履歴表示。
 * 定義データとルールエンジンは外部から渡す。
 */
(function (global) {
  const SELECTORS = {
    form: "#chat-form",
    input: "#chat-input",
    history: "#chat-history",
  };

  function linkifyUrls(text) {
    if (typeof text !== "string") return text;
    return text.replace(/(https?:\/\/[^\s<>"]+)/g, function (url) {
      return "<a href=\"" + url + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + url + "</a>";
    });
  }

  function createMessageRow(role, text, pairNumber) {
    const row = document.createElement("div");
    row.className = "chat-row chat-row--" + role;
    const label = document.createElement("span");
    label.className = "chat-label";
    if (pairNumber != null) {
      label.textContent = role === "user" ? "Q" + pairNumber : "A" + pairNumber;
    } else {
      label.textContent = role === "user" ? "あなた" : "AIたなかたかし";
    }
    const body = document.createElement("div");
    body.className = "chat-body";
    if (role === "bot") {
      body.innerHTML = linkifyUrls(text);
    } else {
      body.textContent = text;
    }
    row.appendChild(label);
    row.appendChild(body);
    return row;
  }

  function appendMessage(container, role, text, pairNumber) {
    if (!container) return;
    const row = createMessageRow(role, text, pairNumber);
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  function getInputEl() {
    return document.querySelector(SELECTORS.input);
  }

  function getHistoryEl() {
    return document.querySelector(SELECTORS.history);
  }

  function bindSubmit(getReply, getNextPairNumber) {
    const form = document.querySelector(SELECTORS.form);
    const input = document.querySelector(SELECTORS.input);
    const history = document.querySelector(SELECTORS.history);
    if (!form || !input || !history) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      const num = typeof getNextPairNumber === "function" ? getNextPairNumber() : null;
      appendMessage(history, "user", text, num);
      input.value = "";

      const reply = getReply(text);
      appendMessage(history, "bot", reply, num);
    });
  }

  global.ChatUI = {
    appendMessage: appendMessage,
    getInputEl: getInputEl,
    getHistoryEl: getHistoryEl,
    bindSubmit: bindSubmit,
    SELECTORS: SELECTORS,
  };
})(typeof window !== "undefined" ? window : this);
