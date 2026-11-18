---
name: bifrost-ai-services
description: "Check or change the Bifrost AI service that writes bb thread titles and commit messages."
---

# Bifrost AI services

This plugin registers a `bifrost` AI service with bb. bb owns the prompts and
cleans the replies; the service forwards each prompt to a local Bifrost
gateway's `/v1/chat/completions`.

## Check state

- `bb settings ai-services` shows each task's selection, every registered
  service, and whether it is ready.
- `bb plugin config bifrost-ai --json` shows the settings. `apiKey` is secret
  and reported as `[set]`, never as a value.
- `bb plugin logs bifrost-ai -n 20` shows load and dispose lines; a failed
  title is recorded by bb, not here.

## Change it

- Pick the service per task: `bb settings ai-services set thread-title bifrost`
  and `commit-message bifrost`; `automatic` and `off` are the other choices.
- Change the model: `bb plugin config bifrost-ai set model zai/glm-5.3-flash`.
  Bare aliases and full `provider/model` ids both work, but Bifrost rejects with
  `403 model_blocked` any model the provider key does not list in `config.json`.
- Rotate the key: `bb plugin config bifrost-ai set apiKey <key>`, then
  `bb plugin reload bifrost-ai`.
- Sample it: `bb settings ai-services test thread-title` and
  `test commit-message` print the reply and elapsed time.

## Limits

bb aborts a title or commit message after 8 seconds; the plugin caps at 7s.
Keep the model fast: `auto` on this host takes 2-4.5s and times out
intermittently, `zai/glm-5.3-flash` 1.5-2.4s, `deepseek-v4.1-flash` 0.6-0.7s.
