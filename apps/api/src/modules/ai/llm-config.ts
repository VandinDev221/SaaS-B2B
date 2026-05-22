import { ConfigService } from "@nestjs/config";

export type LlmRuntimeConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  provider: "ollama" | "huggingface" | "openai";
  timeoutMs: number;
};

export type AiProviderName = "ollama" | "huggingface" | "openai" | "heuristic";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function ollamaConfig(config: ConfigService): LlmRuntimeConfig {
  return {
    baseUrl: normalizeBaseUrl(
      config.get<string>("OLLAMA_BASE_URL", "http://localhost:11434/v1")
    ),
    apiKey: config.get<string>("OLLAMA_API_KEY", "ollama"),
    model: config.get<string>("OLLAMA_MODEL", "llama3.2"),
    provider: "ollama",
    timeoutMs: Number(config.get<string>("OLLAMA_TIMEOUT_MS", "120000"))
  };
}

function huggingfaceConfig(config: ConfigService): LlmRuntimeConfig | null {
  const token = config.get<string>("HF_TOKEN")?.trim();
  if (!token) return null;
  return {
    baseUrl: normalizeBaseUrl(
      config.get<string>("HF_BASE_URL", "https://router.huggingface.co/v1")
    ),
    apiKey: token,
    model: config.get<string>("HF_MODEL", "deepseek-ai/DeepSeek-V4-Pro:novita"),
    provider: "huggingface",
    timeoutMs: Number(config.get<string>("HF_TIMEOUT_MS", "60000"))
  };
}

function openaiConfig(config: ConfigService): LlmRuntimeConfig | null {
  const key = config.get<string>("OPENAI_API_KEY")?.trim();
  if (!key) return null;
  return {
    baseUrl: "https://api.openai.com/v1",
    apiKey: key,
    model: config.get<string>("OPENAI_MODEL", "gpt-4o-mini"),
    provider: "openai",
    timeoutMs: Number(config.get<string>("OPENAI_TIMEOUT_MS", "60000"))
  };
}

/** Resolve provedor LLM: AI_PROVIDER=ollama|huggingface|openai|heuristic */
export function resolveLlmConfig(config: ConfigService): LlmRuntimeConfig | null {
  const chosen = (config.get<string>("AI_PROVIDER", "ollama") ?? "ollama")
    .trim()
    .toLowerCase() as AiProviderName;

  if (chosen === "heuristic") return null;
  if (chosen === "ollama") return ollamaConfig(config);
  if (chosen === "huggingface") return huggingfaceConfig(config);
  if (chosen === "openai") return openaiConfig(config);

  return ollamaConfig(config);
}

export function describeAiProvider(config: ConfigService): {
  enabled: boolean;
  provider: string;
  model: string | null;
  baseUrl: string | null;
} {
  const llm = resolveLlmConfig(config);
  return {
    enabled: Boolean(llm),
    provider: llm?.provider ?? "flowos-heuristic",
    model: llm?.model ?? null,
    baseUrl: llm?.baseUrl ?? null
  };
}
