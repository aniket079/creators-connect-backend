import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: "src/.env" });

const getAiProvider = () =>
  (process.env.AI_RECOMMENDATION_PROVIDER || (process.env.GROQ_API_KEY ? "groq" : "xai"))
    .trim()
    .toLowerCase();

const getProviderConfig = () => {
  const provider = getAiProvider();

  if (provider === "groq") {
    return {
      provider,
      apiKey: process.env.GROQ_API_KEY,
      apiUrl: process.env.GROQ_API_URL || "https://api.groq.com/openai/v1/responses",
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      apiKeyName: "GROQ_API_KEY"
    };
  }

  return {
    provider: "xai",
    apiKey: process.env.XAI_API_KEY,
    apiUrl: process.env.XAI_API_URL || "https://api.x.ai/v1/responses",
    model: process.env.XAI_MODEL || "grok-4.3",
    apiKeyName: "XAI_API_KEY"
  };
};

const parseJsonText = (text) => {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const getResponseText = (data) => {
  if (typeof data?.output_text === "string") {
    return data.output_text;
  }

  const textParts = data?.output
    ?.flatMap((item) => item.content || [])
    ?.filter((item) => item.type === "output_text" && item.text)
    ?.map((item) => item.text);

  return textParts?.join("\n") || "";
};

const toActivitySummary = (basedOn) => ({
  categories: basedOn?.categories || [],
  professions: basedOn?.professions || [],
  locations: basedOn?.locations || []
});

export const isGrokConfigured = () => Boolean(getProviderConfig().apiKey);

export const enrichRecommendationsWithGrok = async ({
  type,
  items,
  basedOn
}) => {
  const requestId = `grok-rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const providerConfig = getProviderConfig();

  if (!providerConfig.apiKey) {
    console.warn(`[${requestId}] AI enrichment skipped: missing ${providerConfig.apiKeyName}`);

    return {
      items,
      aiEnabled: false
    };
  }

  if (items.length === 0) {
    return {
      items,
      aiEnabled: false
    };
  }

  const candidates = items.slice(0, 12).map((item, index) => ({
    id: item._id?.toString?.() || item._id,
    index,
    title: item.title || item.name,
    description: item.description || item.bio,
    category: item.category,
    profession: item.profession || item.owner?.profession || item.title,
    location: item.location || item.owner?.location,
    creator: item.owner?.name,
    score: item.recommendationScore,
    popularity: item.popularity
  }));

  const prompt = {
    task: `Rerank these ${type} recommendations and give a short reason for each.`,
    rules: [
      "Return only valid JSON.",
      "Use every candidate id exactly once.",
      "Keep reasons under 18 words.",
      "Do not mention internal scores."
    ],
    userSignals: toActivitySummary(basedOn),
    candidates,
    responseShape: {
      recommendations: [
        {
          id: "candidate id",
          reason: "short user-facing reason"
        }
      ]
    }
  };

  const response = await fetch(providerConfig.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${providerConfig.apiKey}`
    },
    body: JSON.stringify({
      model: providerConfig.model,
      input: [
        {
          role: "system",
          content:
            "You personalize marketplace recommendations for a creator asset platform."
        },
        {
          role: "user",
          content: JSON.stringify(prompt)
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Grok request failed with status ${response.status}`);
  }

  const data = await response.json();
  const parsed = parseJsonText(getResponseText(data));
  const aiItems = Array.isArray(parsed?.recommendations)
    ? parsed.recommendations
    : [];

  const itemById = new Map(
    items.map((item) => [item._id?.toString?.() || item._id, item])
  );
  const usedIds = new Set();
  const rerankedItems = [];

  aiItems.forEach((aiItem) => {
    const id = aiItem.id?.toString?.() || aiItem.id;
    const item = itemById.get(id);

    if (!item || usedIds.has(id)) return;

    usedIds.add(id);
    rerankedItems.push({
      ...item,
      aiReason: aiItem.reason
    });
  });

  items.forEach((item) => {
    const id = item._id?.toString?.() || item._id;
    if (!usedIds.has(id)) {
      rerankedItems.push(item);
    }
  });

  return {
    items: rerankedItems,
    aiEnabled: true,
    aiProvider: providerConfig.provider,
    aiModel: providerConfig.model
  };
};
