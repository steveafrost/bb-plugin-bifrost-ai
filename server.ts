// bb-plugin-bifrost-ai — serves bb's AI-service tasks (thread titles and commit
// messages) from a local Bifrost gateway.
//
// bb owns the prompts and cleans the reply; this plugin only forwards the
// prompt to Bifrost's OpenAI-compatible /v1/chat/completions and returns the
// text. The user picks it per task with
//   bb settings ai-services set thread-title bifrost
// or in Settings → AI services.
import type { BbPluginApi, PluginAiServiceDeclaration } from "@get-bb/plugin-sdk";

/** bb aborts `complete` after 5s; finish before that with room to clean up. */
const REQUEST_TIMEOUT_MS = 4_500;

type CompleteArgs = {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  signal: AbortSignal;
};

/** POST one chat completion and return the assistant text. Throws on any failure. */
async function complete({ baseUrl, apiKey, model, prompt, signal }: CompleteArgs): Promise<string> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const combined = AbortSignal.any([signal, timeout]);
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    signal: combined,
    headers: {
      "content-type": "application/json",
      // Bifrost identifies the caller by virtual key in this header.
      "x-bf-vk": apiKey,
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      // Reasoning-style models spend tokens thinking before they emit text; a
      // small cap returns an empty message with finish_reason "length".
      max_tokens: 512,
      temperature: 0.2,
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Bifrost ${response.status}: ${text.slice(0, 300)}`);
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Bifrost returned non-JSON: ${text.slice(0, 300)}`);
  }
  const content = (body as { choices?: Array<{ message?: { content?: unknown } }> })
    .choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new Error("Bifrost returned no message content");
  }
  return content;
}

/** Trim trailing slashes so `${baseUrl}/v1/...` never doubles a separator. */
function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export default async function plugin(bb: BbPluginApi) {
  bb.log.info("loaded");

  const settings = bb.settings.define({
    baseUrl: {
      type: "string",
      label: "Bifrost URL",
      description: "Base URL of the gateway, without /v1.",
      default: "http://127.0.0.1:8090",
    },
    model: {
      type: "string",
      label: "Model",
      description:
        "Model or gateway alias for titles and commit messages. Bifrost accepts a bare alias (`deepseek-v4.1-flash`) or a full id (`vercel-token-pass/deepseek/deepseek-v4.1-flash`). `auto` also works but costs 2-4s per title, close to bb's 5s budget.",
      default: "deepseek-v4.1-flash",
    },
    apiKey: {
      type: "string",
      label: "Virtual key",
      description:
        "Bifrost virtual key. Stored as a secret on the server, never in the database or the browser.",
      secret: true,
    },
  });

  const service: PluginAiServiceDeclaration = {
    id: "bifrost",
    displayName: "Bifrost",
    async complete(prompt, { signal }) {
      const current = await settings.get();
      const apiKey = current.apiKey?.trim() ?? "";
      if (apiKey === "") throw new Error("Add a Bifrost virtual key in the plugin settings");
      return complete({
        baseUrl: normalizeBaseUrl(current.baseUrl.trim() || "http://127.0.0.1:8090"),
        apiKey,
        model: current.model.trim() || "deepseek-v4.1-flash",
        prompt,
        signal,
      });
    },
    async status() {
      const current = await settings.get();
      if ((current.apiKey?.trim() ?? "") === "") {
        return { ready: false, message: "Add a Bifrost virtual key" };
      }
      return { ready: true };
    },
  };

  bb.experimental_aiServices.register(service);

  bb.onDispose(() => {
    bb.log.info("disposed");
  });
}
