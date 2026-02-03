/**
 * AIたなかたかし 対話 UI: 入力・送信・履歴表示。
 * 通常は直近の Q と A のみ表示。履歴ボタンで全履歴を表示。
 */
(function (global) {
  const SELECTORS = {
    form: "#chat-form",
    input: "#chat-input",
    history: "#chat-history",
    currentQa: "#current-qa",
    historyBtn: "#chat-history-btn",
    historyContainer: "#chat-history-container",
    chatSection: "#chat-section",
  };

  /** URL のみを <a> に。地の文（。、や日本語）がリンクに混ざらないよう、URL の後に来る文字でマッチを止める */
  function linkifyUrls(text) {
    if (typeof text !== "string") return text;
    return text.replace(/(https?:\/\/[^\s<>"。、）\]】」』\u3000-\u303f\u3040-\u309f\u4e00-\u9faf]+)/g, function (url) {
      return "<a href=\"" + url + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + url + "</a>";
    });
  }

  /** デフォルトの回答アバター画像パス（プロジェクト内 img/avatar.png） */
  const BOT_AVATAR_SRC = "img/avatar.png";

  function createMessageRow(role, text, pairNumber) {
    const row = document.createElement("div");
    row.className = "chat-row chat-row--" + role;
    const content = document.createElement("div");
    content.className = "chat-row-content";
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
    content.appendChild(label);
    content.appendChild(body);
    if (role === "bot") {
      const avatar = document.createElement("img");
      avatar.src = BOT_AVATAR_SRC;
      avatar.alt = "";
      avatar.className = "chat-avatar chat-avatar--bot";
      row.appendChild(avatar);
    }
    row.appendChild(content);
    return row;
  }

  function appendMessage(container, role, text, pairNumber) {
    if (!container) return;
    const row = createMessageRow(role, text, pairNumber);
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  /** 履歴の最後の 1 組（Q + A）を #current-qa に表示する */
  function updateCurrentPair(historyEl) {
    const currentQa = document.querySelector(SELECTORS.currentQa);
    if (!currentQa) return;
    const rows = historyEl ? historyEl.querySelectorAll(".chat-row") : [];
    if (rows.length < 2) {
      currentQa.innerHTML = "<p class=\"current-qa-placeholder\">質問を送信すると、ここに Q と A が表示されます。</p>";
      return;
    }
    const lastUser = rows[rows.length - 2];
    const lastBot = rows[rows.length - 1];
    if (!lastUser.classList.contains("chat-row--user") || !lastBot.classList.contains("chat-row--bot")) {
      currentQa.innerHTML = "<p class=\"current-qa-placeholder\">質問を送信すると、ここに Q と A が表示されます。</p>";
      return;
    }
    const wrap = document.createElement("div");
    wrap.className = "current-qa-pair";
    wrap.appendChild(lastUser.cloneNode(true));
    wrap.appendChild(lastBot.cloneNode(true));
    currentQa.innerHTML = "";
    currentQa.appendChild(wrap);
  }

  function bindHistoryToggle() {
    const btn = document.querySelector(SELECTORS.historyBtn);
    const container = document.querySelector(SELECTORS.historyContainer);
    const section = document.querySelector(SELECTORS.chatSection);
    const history = document.querySelector(SELECTORS.history);
    if (!btn || !container || !section) return;
    btn.addEventListener("click", function () {
      const isOpen = section.classList.toggle("show-history");
      container.classList.toggle("is-hidden", !isOpen);
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      btn.textContent = isOpen ? "履歴を閉じる" : "履歴";
      if (isOpen && history) history.scrollTop = history.scrollHeight;
    });
  }

  function getInputEl() {
    return document.querySelector(SELECTORS.input);
  }

  function getHistoryEl() {
    return document.querySelector(SELECTORS.history);
  }

  function bindSubmit(getReply, getNextPairNumber, onAfterSubmit) {
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
      updateCurrentPair(history);
      if (typeof onAfterSubmit === "function") onAfterSubmit();
    });

    bindHistoryToggle();
  }

  global.ChatUI = {
    appendMessage: appendMessage,
    updateCurrentPair: updateCurrentPair,
    getInputEl: getInputEl,
    getHistoryEl: getHistoryEl,
    bindSubmit: bindSubmit,
    SELECTORS: SELECTORS,
  };
})(typeof window !== "undefined" ? window : this);
