function initSupport() {
  const toggleBtn = document.getElementById("support-toggle-btn");
  const chatWindow = document.getElementById("support-chat-window");
  const closeBtn = document.getElementById("support-close-btn");
  const form = document.getElementById("support-form");
  const input = document.getElementById("support-input");
  const messagesContainer = document.getElementById("support-messages");

  if (!toggleBtn || !chatWindow) return;

  const conversationHistory = [];

  toggleBtn.addEventListener("click", () => {
    chatWindow.classList.toggle("hidden");
    if (!chatWindow.classList.contains("hidden")) {
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

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const query = input.value.trim();
      if (!query) return;

      appendMessage(query, "user");
      conversationHistory.push({ role: "user", text: query });
      input.value = "";

      appendMessage("En cours d'écriture...", "bot");
      const loadingMsg = messagesContainer.lastElementChild;

      try {
        const res = await fetch("/api/support/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: conversationHistory }),
        });

        const data = await res.json();
        loadingMsg.remove();

        const botReply =
          data.answer ||
          "Désolé, je ne parviens pas à répondre pour le moment.";
        appendMessage(botReply, "bot");
        conversationHistory.push({ role: "model", text: botReply });
      } catch (err) {
        if (loadingMsg) loadingMsg.remove();
        appendMessage(
          "Problème de connexion. Utilisez le bouton Contacter en haut.",
          "bot",
        );
      }
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSupport);
} else {
  initSupport();
}
