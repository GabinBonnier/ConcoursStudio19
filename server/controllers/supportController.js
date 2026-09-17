const { GoogleGenAI } = require("@google/genai");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

exports.askQuestion = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Historique de messages requis." });
    }

    // Récupération dynamique de la FAQ pour contextualiser le modèle
    const faqs = await prisma.faq.findMany();
    const faqContext = faqs
      .map((f) => `- Question : "${f.question}" -> Réponse : "${f.answer}"`)
      .join("\n");

    const systemInstruction = `
Tu es l'assistant support officiel de l'application "Studio 19" (gestion de concours de danse).
Réponds en français, avec concision, clarté et bienveillance.

Documentation officielle de l'application :
${faqContext}
- Taille maximale autorisée pour les musiques : 500 Mo (formats acceptés : MP3 ou MP4).
- Inscription et quotas de groupes : définis et modifiés exclusivement par l'administrateur.

Consignes strictes :
1. Base-toi en priorité sur la documentation ci-dessus pour guider l'utilisateur.
2. Prends en compte l'historique de la discussion. Si l'utilisateur applique un conseil et signale que cela échoue toujours, propose une alternative technique simple (ex. : changer de navigateur, réencoder le fichier).
3. Si le problème ne peut pas être résolu via la FAQ, ou si l'utilisateur reste bloqué malgré tes conseils, invite-le clairement à utiliser le bouton "✉️ Contacter" en haut de la fenêtre de discussion pour écrire directement à Gabin (administrateur).
4. Reste exclusivement dans le cadre de Studio 19. Ne réponds à aucun sujet hors-contexte.
`;

    // Formatage des messages pour l'API
    const contents = messages.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    return res.json({
      answer: response.text,
    });
  } catch (error) {
    console.error("Erreur Gemini Support :", error);
    return res.status(500).json({
      answer:
        "Une erreur est survenue lors de la communication avec l'assistant. Tu peux contacter l'administrateur via le bouton ✉️ Contacter en haut.",
    });
  }
};

exports.askQuestion = async (req, res) => {
  try {
    const { messages, conversationId } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Historique de messages requis." });
    }

    // Récupération ou création de la conversation en BDD
    let conversation;
    if (conversationId) {
      conversation = await prisma.supportConversation.findUnique({
        where: { id: conversationId },
      });
    }

    if (!conversation) {
      conversation = await prisma.supportConversation.create({ data: {} });
    }

    const lastUserMessage = messages[messages.length - 1].text;

    // Enregistrement du message de l'utilisateur
    await prisma.supportMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        text: lastUserMessage,
      },
    });

    const faqs = await prisma.faq.findMany();
    const faqContext = faqs
      .map((f) => `- Question : "${f.question}" -> Réponse : "${f.answer}"`)
      .join("\n");

    const systemInstruction = `
Tu es l'assistant support officiel de l'application "Studio 19" (gestion de concours de danse).
Réponds en français, avec concision, clarté et bienveillance.

Documentation officielle de l'application :
${faqContext}
- Taille maximale autorisée pour les musiques : 500 Mo (formats acceptés : MP3 ou MP4).
- Inscription et quotas de groupes : définis et modifiés exclusivement par l'administrateur.

Consignes strictes :
1. Base-toi en priorité sur la documentation ci-dessus pour guider l'utilisateur.
2. Prends en compte l'historique de la discussion.
3. Si l'utilisateur reste bloqué, invite-le à utiliser le bouton "✉️ Contacter".
4. Reste exclusivement dans le cadre de Studio 19.
`;

    const contents = messages.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    const replyText = response.text;

    // Enregistrement de la réponse de l'IA
    await prisma.supportMessage.create({
      data: {
        conversationId: conversation.id,
        role: "model",
        text: replyText,
      },
    });

    return res.json({
      answer: replyText,
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error("Erreur Gemini Support :", error);
    return res.status(500).json({
      answer:
        "Une erreur est survenue lors de la communication avec l'assistant.",
    });
  }
};
