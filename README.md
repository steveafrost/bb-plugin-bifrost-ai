# Bifrost AI services for bb

Serves bb's thread titles and commit messages from a local
[Bifrost](https://github.com/maximhq/bifrost) gateway instead of bb cloud or
Codex, so the work runs on your own routing policy and keys.

## Setup

```
bb plugin install .                  # installs and builds
bb plugin config bifrost-ai set apiKey <virtual key>
bb plugin config bifrost-ai set model deepseek-v4.1-flash
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
| `model` | `deepseek-v4.1-flash` | Model or alias passed to Bifrost. |
| `apiKey` | unset | Bifrost virtual key, sent as `x-bf-vk`. |

## Operating notes

- bb aborts a text task after 5 seconds. The plugin caps each request at 4.5s
  and throws, so a slow model shows as a failed title rather than a hang.
- Measured on this host: `deepseek-v4.1-flash` answers a title in 0.3-0.6s.
  Bifrost's `auto` alias routes through Vercel Token Pass and takes 2-4.5s per
  title, which loses titles intermittently against the 5s budget.
- Use `max_tokens` above the model's thinking budget. A cap of 32 returned
  empty content with `finish_reason: "length"` on DeepSeek V4.1 Flash.
- `antigravity/*` models reject chat completions from this key with HTTP 400;
  the working providers here are `vercel-token-pass` and `opencode-go-sub`.
- Voice input is not implemented; only titles and commit messages are offered.
