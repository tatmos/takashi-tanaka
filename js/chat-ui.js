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

  function createMessageRow(role, text) {
    const row = document.createElement("div");
    row.className = "chat-row chat-row--" + role;
    const label = document.createElement("span");
    label.className = "chat-label";
    label.textContent = role === "user" ? "あなた" : "AIたなかたかし";
    const body = document.createElement("div");
    body.className = "chat-body";
    body.textContent = text;
    row.appendChild(label);
    row.appendChild(body);
    return row;
  }

  function appendMessage(container, role, text) {
    if (!container) return;
    const row = createMessageRow(role, text);
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  function getInputEl() {
    return document.querySelector(SELECTORS.input);
  }

  function getHistoryEl() {
    return document.querySelector(SELECTORS.history);
  }

  function bindSubmit(getReply) {
    const form = document.querySelector(SELECTORS.form);
    const input = document.querySelector(SELECTORS.input);
    const history = document.querySelector(SELECTORS.history);
    if (!form || !input || !history) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      appendMessage(history, "user", text);
      input.value = "";

      const reply = getReply(text);
      appendMessage(history, "bot", reply);
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
