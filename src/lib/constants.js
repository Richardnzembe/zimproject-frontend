export const USER_OPENROUTER_MODEL_STORAGE = "NotesAI-RNA_openrouter_model";
export const AI_HEADER_VISIBILITY_STORAGE = "NotesAI-RNA_ai_header_visible";

export const FREE_OPENROUTER_MODELS = [
  { value: "auto", label: "Auto (Llama 3.3 70B Free)" },
  { value: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B Instruct (Free)" },
  { value: "google/gemma-4-31b-it:free", label: "Gemma 4 31B (Free)" },
  { value: "qwen/qwen3-coder:free", label: "Qwen3 Coder 480B (Free)" },
  { value: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super 120B (Free)" },
  { value: "openai/gpt-oss-120b:free", label: "GPT-OSS 120B (Free)" },
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
