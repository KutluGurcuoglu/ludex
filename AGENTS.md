<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Karpathy Coding Principles

Adapted from https://github.com/multica-ai/andrej-karpathy-skills. Apply these on top of, not instead of, the project rules above.

1. **Think before coding.** Surface assumptions and ambiguities instead of silently picking an interpretation; ask before implementing when a request is genuinely ambiguous.
2. **Simplicity first.** Ship the minimum that satisfies the request — no speculative features, no abstractions for single-use code, no unneeded error handling.
3. **Surgical changes.** Touch only what the task requires; match existing style; don't refactor or clean up adjacent code unless asked.
4. **Goal-driven execution.** Turn requests into verifiable success criteria before implementing (e.g. a failing test to make pass) rather than vague instructions.
