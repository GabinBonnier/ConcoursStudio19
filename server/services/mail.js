const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.MAIL_FROM;
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;
const siteUrl = process.env.APP_URL || "http://localhost:3000";

async function sendCredentials({ to, nomAssociation, username, password }) {
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Studio 19 — Vos identifiants de connexion",
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#1a1a1a;color:#f0ead6;padding:32px;border-radius:12px;border:1px solid rgba(201,162,39,0.4)">
        <h2 style="color:#c9a227;font-family:Georgia,serif;letter-spacing:2px">STUDIO 19</h2>
        <p style="margin-top:16px">Bonjour,</p>
        <p style="margin-top:8px">L'espace <strong>${nomAssociation}</strong> a été créé. Voici vos identifiants de connexion :</p>
        <div style="background:#2a2a2a;border:1px solid rgba(201,162,39,0.3);border-radius:8px;padding:20px;margin:24px 0">
          <p><strong style="color:#c9a227">Identifiant :</strong> ${username}</p>
          <p style="margin-top:8px"><strong style="color:#c9a227">Mot de passe :</strong> ${password}</p>
          <p style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(201,162,39,0.2)"><strong style="color:#c9a227">Important :</strong> Pour des raisons de sécurité, il vous sera demandé de changer ce mot de passe lors de votre première connexion.</p>
        </div>
        <div style="text-align:center;margin:24px 0">
          <a href="${siteUrl}" style="display:inline-block;padding:12px 28px;background:#c9a227;color:#1a1a1a;font-weight:bold;border-radius:6px;text-decoration:none;font-family:Georgia,serif;letter-spacing:1px">Se connecter à son espace</a>
        </div>
        <p style="color:#aaa;font-size:13px;margin-top:16px">Conservez ces informations précieusement. En cas de problème, contactez l'administrateur.</p>
      </div>
    `,
  });
  if (error) console.error("Resend error sendCredentials:", error);
}

async function sendNewDepotNotification({
  nomGroupe,
  categorie,
  nomAssociation,
}) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Studio 19 — Nouveau dépôt · ${nomGroupe}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#1a1a1a;color:#f0ead6;padding:32px;border-radius:12px;border:1px solid rgba(201,162,39,0.4)">
        <h2 style="color:#c9a227;font-family:Georgia,serif;letter-spacing:2px">STUDIO 19</h2>
        <p style="margin-top:16px">🎵 Nouveau dépôt de musique :</p>
        <div style="background:#2a2a2a;border:1px solid rgba(201,162,39,0.3);border-radius:8px;padding:20px;margin:24px 0">
          <p><strong style="color:#c9a227">Groupe :</strong> ${nomGroupe}</p>
          <p style="margin-top:8px"><strong style="color:#c9a227">Catégorie :</strong> ${categorie}</p>
          <p style="margin-top:8px"><strong style="color:#c9a227">Association :</strong> ${nomAssociation}</p>
        </div>
        <div style="text-align:center;margin:24px 0">
          <a href="${siteUrl}" style="display:inline-block;padding:12px 28px;background:#c9a227;color:#1a1a1a;font-weight:bold;border-radius:6px;text-decoration:none;font-family:Georgia,serif;letter-spacing:1px">Voir dans l'admin</a>
        </div>
      </div>
    `,
  });
  if (error) console.error("Resend error sendNewDepot:", error);
}

async function sendMusiqueModifieeNotification({
  nomGroupe,
  categorie,
  nomAssociation,
}) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Studio 19 — Musique modifiée · ${nomGroupe}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#1a1a1a;color:#f0ead6;padding:32px;border-radius:12px;border:1px solid rgba(201,162,39,0.4)">
        <h2 style="color:#c9a227;font-family:Georgia,serif;letter-spacing:2px">STUDIO 19</h2>
        <p style="margin-top:16px">🔄 Une musique a été remplacée :</p>
        <div style="background:#2a2a2a;border:1px solid rgba(201,162,39,0.3);border-radius:8px;padding:20px;margin:24px 0">
          <p><strong style="color:#c9a227">Groupe :</strong> ${nomGroupe}</p>
          <p style="margin-top:8px"><strong style="color:#c9a227">Catégorie :</strong> ${categorie}</p>
          <p style="margin-top:8px"><strong style="color:#c9a227">Association :</strong> ${nomAssociation}</p>
        </div>
        <div style="text-align:center;margin:24px 0">
          <a href="${siteUrl}" style="display:inline-block;padding:12px 28px;background:#c9a227;color:#1a1a1a;font-weight:bold;border-radius:6px;text-decoration:none;font-family:Georgia,serif;letter-spacing:1px">Voir dans l'admin</a>
        </div>
      </div>
    `,
  });
  if (error) console.error("Resend error sendMusiqueModifiee:", error);
}

async function sendNouveauGroupeNotification({
  nomGroupe,
  categorie,
  nomAssociation,
}) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Studio 19 — Nouveau groupe · ${nomGroupe}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#1a1a1a;color:#f0ead6;padding:32px;border-radius:12px;border:1px solid rgba(201,162,39,0.4)">
        <h2 style="color:#c9a227;font-family:Georgia,serif;letter-spacing:2px">STUDIO 19</h2>
        <p style="margin-top:16px">✨ Un nouveau groupe vient d'être créé :</p>
        <div style="background:#2a2a2a;border:1px solid rgba(201,162,39,0.3);border-radius:8px;padding:20px;margin:24px 0">
          <p><strong style="color:#c9a227">Groupe :</strong> ${nomGroupe}</p>
          <p style="margin-top:8px"><strong style="color:#c9a227">Catégorie :</strong> ${categorie}</p>
          <p style="margin-top:8px"><strong style="color:#c9a227">Association :</strong> ${nomAssociation}</p>
        </div>
        <div style="text-align:center;margin:24px 0">
          <a href="${siteUrl}" style="display:inline-block;padding:12px 28px;background:#c9a227;color:#1a1a1a;font-weight:bold;border-radius:6px;text-decoration:none;font-family:Georgia,serif;letter-spacing:1px">Voir dans l'admin</a>
        </div>
      </div>
    `,
  });
  if (error) console.error("Resend error sendNouveauGroupe:", error);
}

module.exports = {
  sendCredentials,
  sendNewDepotNotification,
  sendMusiqueModifieeNotification,
  sendNouveauGroupeNotification,
};
