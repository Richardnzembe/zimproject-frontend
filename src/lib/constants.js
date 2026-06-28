export const USER_OPENROUTER_MODEL_STORAGE = "NotesAI-RNA_openrouter_model";
export const AI_HEADER_VISIBILITY_STORAGE = "NotesAI-RNA_ai_header_visible";

export const FREE_OPENROUTER_MODELS = [
  { value: "auto", label: "Auto (OpenRouter default)" },
  { value: "deepseek/deepseek-r1:free", label: "DeepSeek R1 (Free)" },
  { value: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B Instruct (Free)" },
  { value: "qwen/qwen-2.5-72b-instruct:free", label: "Qwen 2.5 72B Instruct (Free)" },
  { value: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B Instruct (Free)" },
  { value: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash (Free)" },
];

export const CHAT_MODES = [
  { value: "general", label: "General", description: "Quick answers and everyday help." },
  { value: "research", label: "Deep Research", description: "Structured analysis, tradeoffs, and deeper reasoning." },
  { value: "writing", label: "Writing", description: "Draft, rewrite, and polish text clearly." },
];

export const MODE_ENDPOINTS = {
  general: "/api/ai/general/",
  research: "/api/ai/research/",
  writing: "/api/ai/writing/",
};

export const normalizeChatMode = (value) => {
  if (value === "study" || value === "project") {
    return "research";
  }
  if (value === "writing" || value === "research" || value === "general") {
    return value;
  }
  return "general";
};

export const getChatModeLabel = (value) =>
  CHAT_MODES.find((item) => item.value === normalizeChatMode(value))?.label || "General";
