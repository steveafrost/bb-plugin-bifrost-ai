# Bifrost AI services for bb

Serves bb's thread titles and commit messages from a local
[Bifrost](https://github.com/maximhq/bifrost) gateway instead of bb cloud or
Codex, so the work runs on your own routing policy and keys.

## Setup

```
bb plugin install .                  # installs and builds
bb plugin config bifrost-ai set apiKey <virtual key>
bb plugin config bifrost-ai set model zai/glm-5.3-flash
bb settings ai-services set thread-title bifrost
bb settings ai-services set commit-message bifrost
bb settings ai-services test thread-title
```

`apiKey` is a secret setting: stored as a 0600 file under the plugin's
`secrets/` directory, never in `bb.db` and never sent to the browser.

## Settings

| Key | Default | Meaning |
| - | - | - |
| `baseUrl` | `http://127.0.0.1:8090` | Gateway base URL, without `/v1`. |
| `model` | `zai/glm-5.3-flash` | Model or alias passed to Bifrost. |
| `apiKey` | unset | Bifrost virtual key, sent as `x-bf-vk`. |

## Operating notes

- bb aborts a title or commit message after 8 seconds (`AI_TASK_TIMEOUT_MS`).
  The plugin caps each request at 7s and throws, so a slow model shows as a
  failed title rather than a hang.
- Measured on this host, titles including bb's own prompt overhead:
  `deepseek-v4.1-flash` 0.6-0.7s, `zai/glm-5.3-flash` 1.5-2.4s, `zai/glm-5.3`
  1.9-2.2s, `auto` 2-4.5s.
- A model must appear in the provider key's `models` list in Bifrost or the
  request fails with `403 model_blocked` before reaching the provider. Adding
  `zai/glm-5.3-flash` to `vercel-token-pass`'s key was required; the sibling
  `zai/glm-5.3` was already listed.
- Use `max_tokens` above the model's thinking budget. A cap of 32 returned
  empty content with `finish_reason: "length"` on DeepSeek V4.1 Flash.
- `antigravity/*` models reject chat completions from this key with HTTP 400;
  the working providers here are `vercel-token-pass` and `opencode-go-sub`.
- Voice input is not implemented; only titles and commit messages are offered.
