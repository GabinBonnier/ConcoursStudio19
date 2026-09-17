const App = (() => {
  let currentUser = null;
  let currentAssociation = null;
  let currentGroupFile = null;
  let editingGroupFile = null;
  let adminCurrentAssocId = null;

  async function init() {
    Router.init();
    try {
      currentUser = await API.auth.me();
      if (currentUser.role === "ADMIN") await loadAdminDashboard();
      else await loadAssociationDashboard();
    } catch {
      Router.show("view-login");
    }
  }

  async function login() {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const btn = document.getElementById("login-btn");
    if (!email || !password) return Toast.error("Renseignez vos identifiants");
    btn.classList.add("btn--loading");
    try {
      const res = await API.auth.login(email, password);
      currentUser = await API.auth.me();
      if (res.role === "ADMIN") await loadAdminDashboard();
      else await loadAssociationDashboard();
    } catch (e) {
      Toast.error(e.message);
    } finally {
      btn.classList.remove("btn--loading");
    }
  }

  async function logout() {
    await API.auth.logout().catch(() => {});
    currentUser = null;
    currentAssociation = null;
    Router.show("view-login");
  }

  async function loadAdminDashboard() {
    if (currentUser.mustChangePassword) {
      Router.show("view-change-password");
      return;
    }
    await loadAdminAssociations();
    await loadAdminNotifsBadge();
    Router.show("view-admin-associations");
    const isSuperAdmin =
      currentUser?.email?.toLowerCase() === "admin@admin.com";
    document
      .querySelectorAll('[id^="nav-admins"], [id^="nav-ia"]')
      .forEach((el) => {
        el.style.display = isSuperAdmin ? "inline-block" : "none";
      });
  }

  async function loadAdminAssociations() {
    const list = document.getElementById("admin-assoc-list");
    list.innerHTML = '<div class="spinner"></div>';
    try {
      const data = await API.admin.getAssociations();
      document.getElementById("admin-assoc-count").textContent =
        `${data.length} inscrite${data.length > 1 ? "s" : ""}`;
      if (data.length === 0) {
        list.innerHTML =
          '<div class="empty-state"><div class="empty-state__icon">🎭</div><div class="empty-state__text">Aucune association avec des groupes</div></div>';
        return;
      }
      list.innerHTML = data
        .map(
          (a) => `
        <div class="assoc-card" onclick="App.goAdminAssociation('${a.id}')">
          <span class="avatar avatar--md">${Helpers.initiales(a.nom)}</span>
          <div class="assoc-card__info">
            <div class="assoc-card__name">${a.nom}</div>
            <div class="assoc-card__meta">${a.prenom} ${a.nomResponsable} · ${a.totalGroupes}/${a.quotaMax} groupes · ${a.groupesPublies} publié${a.groupesPublies > 1 ? "s" : ""}</div>
          </div>
          <button class="btn btn--outline btn--sm" onclick="event.stopPropagation(); App.goAdminAssociation('${a.id}')">Gérer ›</button>
        </div>
      `,
        )
        .join("");
    } catch {
      list.innerHTML =
        '<div class="empty-state"><div class="empty-state__text">Erreur de chargement</div></div>';
    }
  }

  function filterAdminAssociations() {
    const q = document.getElementById("admin-assoc-search").value.toLowerCase();
    document
      .querySelectorAll("#admin-assoc-list .assoc-card")
      .forEach((card) => {
        card.style.display = card.textContent.toLowerCase().includes(q)
          ? "flex"
          : "none";
      });
  }

  async function goAdminAssociation(id) {
    adminCurrentAssocId = id;
    Router.show("view-admin-assoc-detail");
    const content = document.getElementById("admin-assoc-detail-content");
    content.innerHTML = '<div class="spinner"></div>';
    try {
      const a = await API.admin.getAssociation(id);
      document.getElementById("admin-assoc-detail-title").textContent = a.nom;
      document.getElementById("admin-assoc-detail-meta").textContent =
        a.user.email;
      document.getElementById("admin-assoc-detail-quota").textContent =
        `${a.groupes.length}/${a.quotaMax} groupes`;
      document.getElementById("admin-assoc-detail-pills").innerHTML = `
        <div class="info-pill"><span class="info-pill__label">Quota</span><span class="info-pill__value">${a.quotaMax} max</span></div>
        <div class="info-pill"><span class="info-pill__label">Créé le</span><span class="info-pill__value">${Helpers.formatDate(a.createdAt)}</span></div>
        <div class="info-pill"><span class="info-pill__label">Statut</span><span class="info-pill__value info-pill__value--green">${a.statut}</span></div>
      `;
      const groupList = document.getElementById("admin-assoc-groupe-list");
      if (a.groupes.length === 0) {
        groupList.innerHTML =
          '<div class="empty-state"><div class="empty-state__icon">🎵</div><div class="empty-state__text">Aucun groupe créé</div></div>';
      } else {
        groupList.innerHTML = a.groupes
          .map((g) => {
            const m = g.musiques?.[0];
            return `
            <div class="group-card" onclick="App.goAdminGroupe('${g.id}')">
              <span class="avatar avatar--md">${Helpers.initiales(g.nom)}</span>
              <div class="group-card__info">
                <div class="group-card__name">${g.nom}</div>
                <div class="group-card__meta">${g.categorie}</div>
              </div>
              ${m ? `<a class="btn btn--ghost btn--sm" href="${m.url}" download="${m.originalName}" onclick="event.stopPropagation()">↓ Télécharger</a>` : ""}
              <span class="group-card__status group-card__status--${Helpers.statutClass(g.statut)}">${Helpers.statutLabel(g.statut)} ›</span>
            </div>`;
          })
          .join("");
      }
      content.innerHTML = "";
    } catch {
      content.innerHTML =
        '<div class="empty-state"><div class="empty-state__text">Erreur de chargement</div></div>';
    }
  }

  async function goAdminGroupe(id) {
    Router.show("view-admin-groupe-detail");
    const content = document.getElementById("admin-groupe-content");
    content.innerHTML = '<div class="spinner"></div>';
    try {
      const g = await API.admin.getGroupe(id);
      document.getElementById("admin-groupe-name").textContent = g.nom;
      document.getElementById("admin-groupe-meta").textContent =
        `${g.categorie} · ${g.association.nom}`;
      document.getElementById("admin-groupe-couleur").textContent =
        g.couleur || "Non renseignée";
      document.getElementById("admin-groupe-statut").className =
        `badge badge--${Helpers.statutClass(g.statut)}`;
      document.getElementById("admin-groupe-statut").textContent =
        Helpers.statutLabel(g.statut);
      const hist = document.getElementById("admin-groupe-history");
      if (g.musiques.length === 0) {
        hist.innerHTML =
          '<div class="empty-state"><div class="empty-state__text muted">Aucune musique déposée</div></div>';
      } else {
        hist.innerHTML = g.musiques
          .map(
            (m, i) => `
  <div class="history-item">
    <span class="history-item__date">${Helpers.formatDateTime(m.createdAt)}</span>
    <span class="history-item__type">${i === g.musiques.length - 1 ? "Dépôt initial" : "Mise à jour"}</span>
    <a class="btn btn--ghost btn--sm" href="${m.url}" download="${m.originalName}">↓</a>
  </div>
  <div class="music-file" style="margin-bottom:8px">
    <span class="badge badge--format">${m.originalName.split(".").pop().toUpperCase()}</span>
    <span class="music-file__name">${m.originalName}</span>
    ${m.duration ? `<span style="color:var(--gold);font-size:13px;margin-left:8px">⏱ ${Helpers.formatDuration(m.duration)}</span>` : ""}
  </div>`,
          )
          .join("");
      }
      content.innerHTML = "";
    } catch {
      content.innerHTML =
        '<div class="empty-state"><div class="empty-state__text">Erreur</div></div>';
    }
  }

  function openAdminEdit() {
    if (!adminCurrentAssocId) return;
    API.admin.getAssociation(adminCurrentAssocId).then((a) => {
      document.getElementById("edit-assoc-nom").value = a.nom;
      document.getElementById("edit-assoc-prenom").value = a.prenom;
      document.getElementById("edit-assoc-nom-resp").value = a.nomResponsable;
      document.getElementById("edit-assoc-email").value = a.user.email;
      document.getElementById("edit-assoc-quota-val").textContent = a.quotaMax;
      Router.show("view-admin-edit-assoc");
    });
  }

  async function saveAdminEdit() {
    const btn = document.getElementById("save-assoc-btn");
    btn.classList.add("btn--loading");
    try {
      await API.admin.updateAssociation(adminCurrentAssocId, {
        nom: document.getElementById("edit-assoc-nom").value,
        prenom: document.getElementById("edit-assoc-prenom").value,
        nomResponsable: document.getElementById("edit-assoc-nom-resp").value,
        email: document.getElementById("edit-assoc-email").value,
        quotaMax: document.getElementById("edit-assoc-quota-val").textContent,
      });
      Toast.success("Association mise à jour");
      await goAdminAssociation(adminCurrentAssocId);
    } catch (e) {
      Toast.error(e.message);
    } finally {
      btn.classList.remove("btn--loading");
    }
  }

  async function resendCredentials() {
    const btn = document.getElementById("resend-btn");
    btn.classList.add("btn--loading");
    try {
      await API.admin.resendCredentials(adminCurrentAssocId);
      Toast.success("Identifiants renvoyés par email");
    } catch (e) {
      Toast.error(e.message);
    } finally {
      btn.classList.remove("btn--loading");
    }
  }

  async function createAssociation() {
    const btn = document.getElementById("create-assoc-btn");
    btn.classList.add("btn--loading");
    try {
      await API.admin.createAssociation({
        nom: document.getElementById("new-assoc-nom").value,
        prenom: document.getElementById("new-assoc-prenom").value,
        nomResponsable: document.getElementById("new-assoc-nom-resp").value,
        email: document.getElementById("new-assoc-email").value,
        quotaMax: document.getElementById("new-assoc-quota-val").textContent,
      });
      Toast.success("Association créée · identifiants envoyés par email");
      document.getElementById("form-create-assoc").reset();
      document.getElementById("new-assoc-quota-val").textContent = "3";
      await loadAdminAssociations();
      Router.show("view-admin-associations");
    } catch (e) {
      Toast.error(e.message);
    } finally {
      btn.classList.remove("btn--loading");
    }
  }

  async function loadAdminNotifs() {
    const list = document.getElementById("admin-notif-list");
    list.innerHTML = '<div class="spinner"></div>';
    try {
      const notifs = await API.admin.getNotifications();
      const unread = notifs.filter((n) => !n.lu).length;
      document.getElementById("admin-notif-count").textContent =
        `${unread} nouvelle${unread > 1 ? "s" : ""}`;
      if (notifs.length === 0) {
        list.innerHTML =
          '<div class="empty-state"><div class="empty-state__icon">🔔</div><div class="empty-state__text">Aucune notification</div></div>';
        return;
      }
      list.innerHTML = notifs
        .map(
          (n) => `
        <div class="notif-card ${n.lu ? "notif-card--read" : ""}" onclick="App.markNotifRead('${n.id}', this)">
          <div class="notif-card__dot"></div>
          <div class="notif-card__body">
            <div class="notif-card__text"><strong>${n.titre}</strong><br>${n.message}</div>
            <div class="notif-card__time">${Helpers.formatDateTime(n.createdAt)}</div>
          </div>
        </div>`,
        )
        .join("");
      await loadAdminNotifsBadge();
    } catch {
      list.innerHTML =
        '<div class="empty-state"><div class="empty-state__text">Erreur</div></div>';
    }
  }

  async function loadAdminNotifsBadge() {
    try {
      const notifs = await API.admin.getNotifications();
      const unread = notifs.filter((n) => !n.lu).length;
      const badge = document.getElementById("notif-badge");
      if (badge) {
        badge.textContent = unread;
        badge.style.display = unread > 0 ? "flex" : "none";
      }
    } catch {}
  }

  async function markNotifRead(id, el) {
    if (el.classList.contains("notif-card--read")) return;
    await API.admin.markRead(id).catch(() => {});
    el.classList.add("notif-card--read");
    el.querySelector(".notif-card__dot").style.background = "var(--text-dim)";
    await loadAdminNotifsBadge();
  }

  async function markAllNotifsRead() {
    await API.admin.markAllRead().catch(() => {});
    await loadAdminNotifs();
  }

  async function loadAssociationDashboard() {
    try {
      currentAssociation = await API.association.me();
      if (currentUser.mustChangePassword) {
        Router.show("view-change-password");
        return;
      }
      renderAssocDashboard();
      Router.show("view-mes-groupes");
    } catch {
      Toast.error("Erreur de chargement du tableau de bord");
    }
  }

  function renderAssocDashboard() {
    const a = currentAssociation;
    document.getElementById("assoc-nom").textContent = a.nom;
    document.getElementById("assoc-quota").textContent =
      `Il vous reste ${a.quotaMax - a.groupes.length} emplacement(s)`;
    document.getElementById("assoc-quota-bar").textContent =
      `${a.groupes.length} / ${a.quotaMax} groupes`;
    const list = document.getElementById("mes-groupes-list");
    if (a.groupes.length === 0) {
      list.innerHTML =
        '<div class="empty-state"><div class="empty-state__icon">🎵</div><div class="empty-state__text">Aucun groupe créé</div></div>';
      return;
    }
    list.innerHTML = a.groupes
      .map((g) => {
        const m = g.musiques?.[0];
        return `
        <div class="group-card" onclick="App.goGroupe('${g.id}')">
          <span class="avatar avatar--md">${Helpers.initiales(g.nom)}</span>
          <div class="group-card__info">
            <div class="group-card__name">${g.nom}</div>
            <div class="group-card__meta">${g.categorie} · ${m ? "musique déposée" : "aucune musique"}</div>
          </div>
          <span class="group-card__status group-card__status--${Helpers.statutClass(g.statut)}">${Helpers.statutLabel(g.statut)} ›</span>
        </div>`;
      })
      .join("");
  }

  async function goGroupe(id) {
    Router.show("view-groupe-detail");
    const content = document.getElementById("groupe-detail-content");
    content.innerHTML = '<div class="spinner"></div>';
    try {
      const g = await API.association.getGroupe(id);
      currentGroupFile = null;
      document.getElementById("groupe-detail-name").textContent = g.nom;
      document.getElementById("groupe-detail-meta").textContent =
        `${g.categorie} · ${currentAssociation?.nom || ""}`;
      document.getElementById("groupe-detail-statut").className =
        `badge badge--${Helpers.statutClass(g.statut)}`;
      document.getElementById("groupe-detail-statut").textContent =
        Helpers.statutLabel(g.statut);
      document.getElementById("btn-edit-groupe").onclick = () =>
        openEditGroupe(g);

      const deadlineBanner = document.getElementById("groupe-deadline-banner");
      const dl = Helpers.deadlineLabel(g.dateLimite);
      if (dl) {
        deadlineBanner.className = `deadline-banner${dl.type === "warning" ? " deadline-banner--warning" : ""}`;
        deadlineBanner.textContent = dl.text;
        deadlineBanner.style.display = "flex";
      } else {
        deadlineBanner.style.display = "none";
      }

      const musiqueSection = document.getElementById("groupe-musique-section");
      const musiques = g.musiques || [];
      musiqueSection.innerHTML =
        musiques.length > 0
          ? `
  <p class="section-label">Musique déposée</p>
  <div class="music-file">
    <span class="badge badge--format">${musiques[0].originalName.split(".").pop().toUpperCase()}</span>
    <span class="music-file__name">${musiques[0].originalName}</span>
    ${musiques[0].duration ? `<span class="music-file__duration" style="color:var(--gold);font-size:13px;margin-left:8px">⏱ ${Helpers.formatDuration(musiques[0].duration)}</span>` : ""}
    <a class="music-file__download" href="${musiques[0].url}" download="${musiques[0].originalName}" title="Télécharger">↓</a>
  </div>`
          : "";

      const dropzone = document.getElementById("groupe-dropzone");
      const isClosed = Helpers.isDeadlinePassed(g.dateLimite);
      if (isClosed) {
        dropzone.className = "dropzone dropzone--closed";
        dropzone.innerHTML = `<div class="dropzone__icon">🔒</div><div class="dropzone__text">Dépôt fermé</div><div class="dropzone__hint dropzone__hint--red">Date limite dépassée</div>`;
      } else {
        dropzone.className = "dropzone";
        Dropzone.reset(
          dropzone,
          musiques.length > 0
            ? "Déposer un nouveau fichier pour remplacer"
            : "Glissez ou cliquez pour choisir",
        );
        Dropzone.bind(dropzone, (file) => {
          currentGroupFile = file;
        });
      }

      document.getElementById("btn-upload-musique").dataset.groupeId = g.id;
      document.getElementById("btn-upload-musique").style.display = isClosed
        ? "none"
        : "flex";
      content.innerHTML = "";
    } catch {
      content.innerHTML =
        '<div class="empty-state"><div class="empty-state__text">Erreur de chargement</div></div>';
    }
  }

  async function uploadMusique() {
    const btn = document.getElementById("btn-upload-musique");
    const id = btn.dataset.groupeId;
    if (!currentGroupFile) return Toast.error("Sélectionnez un fichier audio");
    btn.classList.add("btn--loading");
    try {
      const fd = new FormData();
      fd.append("musique", currentGroupFile);
      await API.association.uploadMusique(id, fd);
      Toast.success("Musique déposée avec succès");
      currentAssociation = await API.association.me();
      await goGroupe(id);
    } catch (e) {
      Toast.error(e.message);
    } finally {
      btn.classList.remove("btn--loading");
    }
  }

  function openEditGroupe(g) {
    document.getElementById("edit-groupe-nom").value = g.nom;
    document.getElementById("edit-groupe-categorie").value = g.categorie;
    document.getElementById("edit-groupe-couleur").value = g.couleur || "";
    document.getElementById("btn-save-groupe").dataset.groupeId = g.id;
    editingGroupFile = null;
    const dz = document.getElementById("edit-dropzone");
    Dropzone.reset(dz, "Nouveau fichier MP3 / MP4");
    Dropzone.bind(dz, (file) => {
      editingGroupFile = file;
    });
    Router.show("view-editer-groupe");
  }

  async function saveEditGroupe() {
    const btn = document.getElementById("btn-save-groupe");
    const id = btn.dataset.groupeId;
    btn.classList.add("btn--loading");
    try {
      await API.association.updateGroupe(id, {
        nom: document.getElementById("edit-groupe-nom").value,
        categorie: document.getElementById("edit-groupe-categorie").value,
        couleur: document.getElementById("edit-groupe-couleur").value.trim(),
      });
      if (editingGroupFile) {
        const fd = new FormData();
        fd.append("musique", editingGroupFile);
        await API.association.uploadMusique(id, fd);
      }
      Toast.success("Groupe mis à jour");
      currentAssociation = await API.association.me();
      renderAssocDashboard();
      await goGroupe(id);
    } catch (e) {
      Toast.error(e.message);
    } finally {
      btn.classList.remove("btn--loading");
    }
  }

  async function createGroupe() {
    const btn = document.getElementById("btn-create-groupe");
    const nom = document.getElementById("new-groupe-nom").value.trim();
    const categorie = document.getElementById("new-groupe-categorie").value;
    if (!nom || !categorie) return Toast.error("Nom et catégorie requis");
    btn.classList.add("btn--loading");
    try {
      const fd = new FormData();
      fd.append("nom", nom);
      fd.append("categorie", categorie);
      const couleur = document
        .getElementById("new-groupe-couleur")
        ?.value.trim();
      if (couleur) fd.append("couleur", couleur);
      if (currentGroupFile) fd.append("musique", currentGroupFile);
      await API.association.createGroupe(fd);
      Toast.success("Groupe créé");
      currentGroupFile = null;
      document.getElementById("form-create-groupe").reset();
      Dropzone.reset(document.getElementById("new-groupe-dropzone"));
      currentAssociation = await API.association.me();
      renderAssocDashboard();
      Router.show("view-mes-groupes");
    } catch (e) {
      Toast.error(e.message);
    } finally {
      btn.classList.remove("btn--loading");
    }
  }

  function renderMonCompte() {
    const a = currentAssociation;
    if (!a) return;
    document.getElementById("compte-nom").textContent = a.nom;
    document.getElementById("compte-prenom").textContent =
      `${a.prenom} ${a.nomResponsable}`;
    document.getElementById("compte-email").textContent =
      currentUser?.email || "";
    document.getElementById("compte-quota").textContent =
      `${a.groupes.length} / ${a.quotaMax} groupes créés`;
    document.getElementById("compte-groupe-list").innerHTML = a.groupes
      .map(
        (g) => `
      <div class="group-card" onclick="App.goGroupe('${g.id}')">
        <span class="avatar avatar--md">${Helpers.initiales(g.nom)}</span>
        <div class="group-card__info">
          <div class="group-card__name">${g.nom}</div>
          <div class="group-card__meta">${g.categorie} · ${Helpers.statutLabel(g.statut)}</div>
        </div>
        <button class="btn btn--outline btn--sm" onclick="event.stopPropagation(); App.goGroupe('${g.id}')">Éditer</button>
      </div>`,
      )
      .join("");
  }

  function adjustQuota(elId, delta) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = Math.max(
      1,
      Math.min(10, parseInt(el.textContent, 10) + delta),
    );
  }

  function goAdminNav(viewId) {
    closeAllMobileMenus();
    if (viewId === "view-admin-associations") loadAdminAssociations();
    if (viewId === "view-admin-notifs") loadAdminNotifs();
    if (viewId === "view-admin-comptes") loadAdminComptes();
    if (viewId === "view-admin-admins") loadAdminAdmins();
    if (viewId === "view-admin-ia") {
      loadSupportHistory();
    }
    Router.show(viewId);
  }

  async function loadAdminComptes() {
    const list = document.getElementById("admin-comptes-list");
    list.innerHTML = '<div class="spinner"></div>';
    try {
      const data = await API.admin.getComptes();
      document.getElementById("admin-comptes-count").textContent =
        `${data.length} compte${data.length > 1 ? "s" : ""}`;
      if (data.length === 0) {
        list.innerHTML =
          '<div class="empty-state"><div class="empty-state__text">Aucun compte</div></div>';
        return;
      }
      list.innerHTML = data
        .map(
          (u) => `
      <div class="assoc-card">
        <span class="avatar avatar--md">${u.role === "ADMIN" ? "AD" : Helpers.initiales(u.association?.nom || u.username)}</span>
        <div class="assoc-card__info">
          <div class="assoc-card__name">${u.association?.nom || u.username}</div>
          <div class="assoc-card__meta">${u.email} · <span style="color:var(--gold)">${u.role}</span> · créé le ${Helpers.formatDate(u.createdAt)}</div>
        </div>
        ${u.role !== "ADMIN" ? `<button class="btn btn--danger btn--sm" onclick="App.deleteCompte('${u.id}', '${(u.association?.nom || u.username).replace(/'/g, "\\'")}')">Supprimer</button>` : ""}
      </div>
    `,
        )
        .join("");
    } catch {
      list.innerHTML =
        '<div class="empty-state"><div class="empty-state__text">Erreur de chargement</div></div>';
    }
  }

  async function deleteCompte(id, nom) {
    if (!confirm(`Supprimer le compte "${nom}" ?`)) return;
    try {
      await API.admin.deleteCompte(id);
      Toast.success("Compte supprimé");
      await loadAdminComptes();
    } catch (e) {
      Toast.error(e.message);
    }
  }

  async function submitChangePassword() {
    const newPassword = document.getElementById("new-password").value;
    const confirm = document.getElementById("confirm-password").value;
    const btn = document.getElementById("change-password-btn");

    if (!newPassword || !confirm)
      return Toast.error("Remplissez les deux champs");
    if (newPassword !== confirm)
      return Toast.error("Les mots de passe ne correspondent pas");
    if (newPassword.length < 6)
      return Toast.error("Au moins 6 caractères requis");

    btn.classList.add("btn--loading");

    try {
      // 1. Envoi de la requête HTTP au serveur
      await API.auth.changePassword(newPassword);

      Toast.success("Mot de passe mis à jour !");
      currentUser.mustChangePassword = false;

      // 2. Redirection vers le dashboard approprié
      if (currentUser.role === "ADMIN") {
        await loadAdminDashboard();
      } else {
        currentAssociation = await API.association.me();
        renderAssocDashboard();
        Router.show("view-mes-groupes");
      }
    } catch (e) {
      Toast.error(e.message);
    } finally {
      btn.classList.remove("btn--loading");
    }
  }

  async function loadAdminAdmins() {
    if (currentUser?.email?.toLowerCase() !== "admin@admin.com") return;
    const list = document.getElementById("admin-admins-list");
    list.innerHTML = '<div class="spinner"></div>';
    try {
      const data = await API.admin.getAdmins();
      list.innerHTML = data
        .map(
          (a) => `
      <div class="assoc-card">
        <span class="avatar avatar--md">AD</span>
        <div class="assoc-card__info">
          <div class="assoc-card__name">${a.username}</div>
          <div class="assoc-card__meta">${a.email} · créé le ${Helpers.formatDate(a.createdAt)}</div>
        </div>
        ${a.email.toLowerCase() !== "admin@admin.com" ? `<button class="btn btn--danger btn--sm" onclick="App.deleteAdmin('${a.id}', '${a.username}')">Supprimer</button>` : '<span class="badge badge--count">Super Admin</span>'}
      </div>
    `,
        )
        .join("");
    } catch {
      list.innerHTML =
        '<div class="empty-state"><div class="empty-state__text">Erreur</div></div>';
    }
  }

  async function createAdmin() {
    const btn = document.getElementById("create-admin-btn");
    const email = document.getElementById("new-admin-email").value.trim();
    const username = document.getElementById("new-admin-username").value.trim();
    if (!email || !username) return Toast.error("Email et identifiant requis");
    btn.classList.add("btn--loading");
    try {
      await API.admin.createAdmin({ email, username });
      Toast.success("Compte admin créé · identifiants envoyés par email");
      document.getElementById("new-admin-email").value = "";
      document.getElementById("new-admin-username").value = "";
      await loadAdminAdmins();
    } catch (e) {
      Toast.error(e.message);
    } finally {
      btn.classList.remove("btn--loading");
    }
  }

  async function deleteAdmin(id, username) {
    if (!confirm(`Supprimer l'admin "${username}" ?`)) return;
    try {
      await API.admin.deleteAdmin(id);
      Toast.success("Compte admin supprimé");
      await loadAdminAdmins();
    } catch (e) {
      Toast.error(e.message);
    }
  }

  function toggleMobileMenu(btn) {
    const topbar = btn.closest(".topbar");
    const menu = topbar
      ? topbar.querySelector(".topbar__menu-container")
      : null;

    if (btn && menu) {
      btn.classList.toggle("is-active");
      menu.classList.toggle("is-open");
    }
  }

  function closeAllMobileMenus() {
    document
      .querySelectorAll(".burger-btn")
      .forEach((b) => b.classList.remove("is-active"));
    document
      .querySelectorAll(".topbar__menu-container")
      .forEach((m) => m.classList.remove("is-open"));
  }

  async function loadSupportHistory() {
    const container = document.getElementById("admin-ia-container");
    if (!container) return;
    container.innerHTML = '<div class="spinner"></div>';

    try {
      const res = await fetch("/api/admin/support-history");
      const { conversations } = await res.json();

      if (!conversations || conversations.length === 0) {
        container.innerHTML =
          '<p style="color:#71717a">Aucun échange pour le moment.</p>';
        return;
      }

      container.innerHTML = `
        <div style="width:35%; overflow-y:auto; border-right:1px solid rgba(255,255,255,0.08); padding-right:12px; display:flex; flex-direction:column; gap:8px;">
          ${conversations
            .map((c) => {
              const firstMsg =
                c.messages.find((m) => m.role === "user")?.text ||
                "Session vide";
              const date = new Date(c.createdAt).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              });
              return `
              <div class="ia-item" data-id="${c.id}" style="padding:10px; background:#1c1c1f; border-radius:8px; cursor:pointer; border:1px solid rgba(255,255,255,0.05);">
                <div style="font-size:11px; color:var(--gold, #d4af37);">${date} ·${c.messages.length} msg</div>
                <div style="font-size:13px; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${firstMsg}</div>
              </div>
            `;
            })
            .join("")}
        </div>
        <div id="ia-detail" style="flex:1; overflow-y:auto; padding:10px; display:flex; flex-direction:column; gap:10px;">
          <p style="color:#71717a; margin:auto;">Sélectionnez une discussion à gauche.</p>
        </div>
      `;

      document.querySelectorAll(".ia-item").forEach((item) => {
        item.addEventListener("click", () => {
          const conv = conversations.find((c) => c.id === item.dataset.id);
          const detail = document.getElementById("ia-detail");
          detail.innerHTML = conv.messages
            .map(
              (m) => `
            <div style="max-width:85%; padding:10px 12px; border-radius:8px; font-size:13px; ${
              m.role === "user"
                ? "align-self:flex-end; background:var(--gold, #d4af37); color:#111;"
                : "align-self:flex-start; background:#242427; color:#fff;"
            }">
              <small style="display:block; opacity:0.7; font-size:10px; margin-bottom:2px;">${m.role === "user" ? "Utilisateur" : "IA"}</small>
              ${m.text.replace(/\n/g, "<br>")}
            </div>
          `,
            )
            .join("");
        });
      });
    } catch (e) {
      container.innerHTML =
        '<p style="color:#ef4444">Erreur de chargement.</p>';
    }
  }

  return {
    init,
    login,
    logout,
    toggleMobileMenu,
    closeAllMobileMenus,
    loadAdminAssociations,
    filterAdminAssociations,
    goAdminAssociation,
    goAdminGroupe,
    openAdminEdit,
    saveAdminEdit,
    resendCredentials,
    createAssociation,
    loadAdminNotifs,
    markNotifRead,
    markAllNotifsRead,
    goAdminNav,
    goGroupe,
    uploadMusique,
    openEditGroupe,
    saveEditGroupe,
    createGroupe,
    renderMonCompte,
    adjustQuota,
    deleteCompte,
    loadAdminComptes,
    submitChangePassword,
    loadAdminAdmins,
    createAdmin,
    deleteAdmin,
    loadSupportHistory,
  };
})();

document.addEventListener("DOMContentLoaded", () => App.init());
