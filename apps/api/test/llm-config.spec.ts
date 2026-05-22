import { ConfigService } from "@nestjs/config";
import { resolveLlmConfig } from "../src/modules/ai/llm-config";

describe("resolveLlmConfig", () => {
  it("usa Ollama por padrao", () => {
    const config = new ConfigService({
      AI_PROVIDER: "ollama",
      OLLAMA_MODEL: "llama3.2"
    });
    const llm = resolveLlmConfig(config);
    expect(llm?.provider).toBe("ollama");
    expect(llm?.model).toBe("llama3.2");
    expect(llm?.baseUrl).toContain("11434");
  });

  it("nao usa HF quando AI_PROVIDER=ollama mesmo com token", () => {
    const config = new ConfigService({
      AI_PROVIDER: "ollama",
      HF_TOKEN: "hf_test_token_should_be_ignored"
    });
    const llm = resolveLlmConfig(config);
    expect(llm?.provider).toBe("ollama");
  });

  it("heuristic quando AI_PROVIDER=heuristic", () => {
    const config = new ConfigService({ AI_PROVIDER: "heuristic" });
    expect(resolveLlmConfig(config)).toBeNull();
  });
});
