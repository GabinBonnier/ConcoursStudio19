const Helpers = (() => {
  function initiales(str) {
    return (str || "")
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .substring(0, 3);
  }

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function formatDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return (
      d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" }) +
      " · " +
      d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    );
  }

  function statutLabel(s) {
    return { PUBLIE: "Publié", EN_ATTENTE: "En Attente", CLOS: "Clos" }[s] || s;
  }
  function statutClass(s) {
    return (
      { PUBLIE: "published", EN_ATTENTE: "pending", CLOS: "closed" }[s] ||
      "pending"
    );
  }
  function isDeadlinePassed(d) {
    return d ? new Date() > new Date(d) : false;
  }

  function deadlineLabel(dateLimite) {
    if (!dateLimite) return null;
    const d = new Date(dateLimite);
    const diff = d - new Date();
    if (diff < 0)
      return {
        text: `Date limite dépassée · ${formatDate(dateLimite)}`,
        type: "error",
      };
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 3)
      return {
        text: `Date limite dans ${days} jour(s) · ${formatDate(dateLimite)}`,
        type: "warning",
      };
    return {
      text: `Dépôt ouvert jusqu'au ${formatDate(dateLimite)}`,
      type: "info",
    };
  }

  function formatDuration(seconds) {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return {
    initiales,
    formatDate,
    formatDateTime,
    statutLabel,
    statutClass,
    isDeadlinePassed,
    deadlineLabel,
    formatDuration,
  };
})();
