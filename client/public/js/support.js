function initSupport() {
  const toggleBtn = document.getElementById("support-toggle-btn");
  const chatWindow = document.getElementById("support-chat-window");
  const closeBtn = document.getElementById("support-close-btn");
  const form = document.getElementById("support-form");
  const input = document.getElementById("support-input");
  const messagesContainer = document.getElementById("support-messages");

  if (!toggleBtn || !chatWindow) return;

  const history = document.getElementById("support-history");
  const newChat = document.getElementById("support-new-chat");
  let conversationId = null;
  let generation = 0;
  let busy = false;
  let authenticated = false;

  function setBusy(value) {
    busy = value;
    input.disabled = value || !authenticated;
    form.querySelector("button").disabled = value || !authenticated;
    history.disabled = value || !authenticated;
    newChat.disabled = value || !authenticated;
  }

  async function request(path, body) {
    const res = await fetch(`/api/support${path}`, {
      method: body ? "POST" : "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(res.status >= 500
      ? "L’assistant est temporairement indisponible. Réessayez dans quelques instants."
      : res.status === 401 ? "Connectez-vous pour retrouver vos discussions."
      : data.error || "Impossible de charger la discussion.");
    return data;
  }

  function resetMessages() {
    conversationId = null;
    history.value = "";
    messagesContainer.replaceChildren();
    appendMessage(authenticated ? "Bonjour ! Comment puis-je vous aider ?" : "Connectez-vous pour retrouver vos discussions et poser une question.");
  }

  async function loadHistory(version = generation) {
    const data = await request("/conversations");
    if (version !== generation) return;
    history.replaceChildren(new Option("Nouvelle discussion", ""));
    data.conversations.forEach(chat => history.add(new Option(chat.title, chat.id)));
    history.value = conversationId || "";
  }

  async function refreshAccount() {
    const version = ++generation;
    authenticated = false;
    history.replaceChildren(new Option("Nouvelle discussion", ""));
    resetMessages();
    setBusy(true);
    try {
      await loadHistory(version);
      if (version !== generation) return;
      authenticated = true;
      resetMessages();
    } catch (error) {
      if (version === generation) {
        messagesContainer.replaceChildren();
        appendMessage(error.message);
      }
    } finally {
      if (version === generation) setBusy(false);
    }
  }

  window.addEventListener("support-auth-change", refreshAccount);
  newChat.addEventListener("click", () => {
    if (busy) return;
    resetMessages();
    input.focus();
  });
  history.addEventListener("change", async () => {
    if (busy) return;
    const id = history.value;
    if (!id) return resetMessages();
    const version = generation;
    setBusy(true);
    try {
      const { conversation } = await request(`/conversations/${encodeURIComponent(id)}`);
      if (version !== generation) return;
      conversationId = conversation.id;
      messagesContainer.replaceChildren();
      conversation.messages.forEach(msg => appendMessage(msg.text, msg.role === "user" ? "user" : "bot"));
    } catch (error) {
      if (version === generation) {
        history.value = conversationId || "";
        appendMessage(error.message);
      }
    } finally {
      if (version === generation) setBusy(false);
    }
  });

  toggleBtn.addEventListener("click", () => {
    chatWindow.classList.toggle("hidden");
    if (!chatWindow.classList.contains("hidden")) {
      if (!authenticated && !busy) refreshAccount();
      input?.focus();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      chatWindow.classList.add("hidden");
    });
  }

  function formatMarkdown(raw) {
    if (!raw) return "";

    return raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(
        /(?:^|\n)\s*(\d+)\.\s+(.*?)(?=\n\s*\d+\.|\n\n|$)/gs,
        (match, num, content) => {
          return `<div class="support-list-item"><span class="support-list-num">${num}</span><span>${content.trim()}</span></div>`;
        },
      )
      .replace(
        /(?:^|\n)\s*[-*]\s+(.*?)(?=\n\s*[-*]|\n\n|$)/gs,
        (match, content) => {
          return `<div class="support-list-item"><span class="support-list-bullet">•</span><span>${content.trim()}</span></div>`;
        },
      )
      .replace(/\n{2,}/g, "<br><br>")
      .replace(/\n/g, "<br>");
  }

  function appendMessage(text, sender = "bot") {
    const msgDiv = document.createElement("div");
    msgDiv.className = `support-msg ${sender === "user" ? "user-msg" : "bot-msg"}`;

    if (sender === "bot") {
      msgDiv.innerHTML = formatMarkdown(text);
    } else {
      msgDiv.textContent = text;
    }

    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query || busy || !authenticated) return;
    const version = generation;
    setBusy(true);
    appendMessage(query, "user");
    input.value = "";
    appendMessage("En cours d'écriture...");
    const loading = messagesContainer.lastElementChild;
    try {
      const data = await request("/ask", { text: query, conversationId });
      if (version !== generation) return;
      loading.remove();
      conversationId = data.conversationId;
      appendMessage(data.answer);
      try { await loadHistory(version); } catch {
        if (version === generation) appendMessage("Réponse sauvegardée. L'historique sera actualisé à la prochaine ouverture.");
      }
    } catch (error) {
      if (version !== generation) return;
      loading.remove();
      appendMessage(error.message);
      input.value = query;
    } finally {
      if (version === generation) { setBusy(false); input.focus(); }
    }
  });
  refreshAccount();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSupport);
} else {
  initSupport();
}
