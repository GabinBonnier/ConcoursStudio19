const API = (() => {
  async function request(method, path, body, isFormData = false) {
    const opts = {
      method,
      credentials: "include",
      headers: isFormData ? {} : { "Content-Type": "application/json" },
    };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);
    const res = await fetch(`/api${path}`, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erreur serveur");
    return data;
  }

  return {
    auth: {
      login: (email, password) =>
        request("POST", "/auth/login", { email, password }),
      logout: () => request("POST", "/auth/logout"),
      me: () => request("GET", "/auth/me"),
      changePassword: (newPassword) =>
        request("POST", "/auth/change-password", { newPassword }),
    },
    admin: {
      getAssociations: () => request("GET", "/admin/associations"),
      getAssociation: (id) => request("GET", `/admin/associations/${id}`),
      createAssociation: (data) => request("POST", "/admin/associations", data),
      updateAssociation: (id, data) =>
        request("PUT", `/admin/associations/${id}`, data),
      deleteAssociation: (id) => request("DELETE", `/admin/associations/${id}`),
      resendCredentials: (id) =>
        request("POST", `/admin/associations/${id}/resend`),
      getGroupe: (id) => request("GET", `/admin/groupes/${id}`),
      getNotifications: () => request("GET", "/admin/notifications"),
      markRead: (id) => request("PATCH", `/admin/notifications/${id}/read`),
      markAllRead: () => request("PATCH", "/admin/notifications/read-all"),
      getComptes: () => request("GET", "/admin/comptes"),
      deleteCompte: (id) => request("DELETE", `/admin/comptes/${id}`),
      getAdmins: () => request("GET", "/admin/admins"),
      createAdmin: (data) => request("POST", "/admin/admins", data),
      deleteAdmin: (id) => request("DELETE", `/admin/admins/${id}`),
    },
    association: {
      me: () => request("GET", "/association/me"),
      createGroupe: (fd) => request("POST", "/association/groupes", fd, true),
      getGroupe: (id) => request("GET", `/association/groupes/${id}`),
      updateGroupe: (id, data) =>
        request("PUT", `/association/groupes/${id}`, data),
      uploadMusique: (id, fd) =>
        request("POST", `/association/groupes/${id}/musique`, fd, true),
    },
  };
})();
