const { GoogleGenAI } = require("@google/genai");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

exports.askQuestion = async (req, res) => {
  try {
    const { text, conversationId } = req.body;
    if (typeof text !== "string" || !text.trim() || text.length > 10000 ||
        (conversationId != null && typeof conversationId !== "string")) {
      return res.status(400).json({ error: "Message invalide (10 000 caractères maximum)." });
    }
    let conversation;
    if (conversationId) {
      conversation = await prisma.supportConversation.findFirst({
        where: { id: conversationId, userId: req.user.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
      if (!conversation) return res.status(404).json({ error: "Discussion introuvable." });
    } else {
      conversation = await prisma.supportConversation.create({
        data: { userId: req.user.id, title: text.trim().slice(0, 80) },
        include: { messages: true },
      });
    }
    const messages = [...conversation.messages, { role: "user", text: text.trim() }];
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

    if (!replyText) throw new Error("Réponse vide de l'assistant");
    await prisma.supportConversation.update({
      where: { id: conversation.id },
      data: {
        updatedAt: new Date(),
        messages: { create: [
          { role: "user", text: text.trim() },
          { role: "model", text: replyText },
        ] },
      },
    });

    return res.json({
      answer: replyText,
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error("Erreur Gemini Support :", error);
    return res.status(500).json({
      error:
        "Une erreur est survenue lors de la communication avec l'assistant.",
    });
  }
};

exports.listConversations = async (req, res) => {
  const conversations = await prisma.supportConversation.findMany({
    where: { userId: req.user.id },
    select: { id: true, title: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ conversations });
};

exports.getConversation = async (req, res) => {
  const conversation = await prisma.supportConversation.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { messages: { orderBy: [{ createdAt: "asc" }, { role: "desc" }] } },
  });
  if (!conversation) return res.status(404).json({ error: "Discussion introuvable." });
  res.json({ conversation });
};
