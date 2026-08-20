# Context Harness

This folder is the project memory for future prompts.

## Purpose

- Keep one current summary of the repo in [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md).
- Keep an append-only prompt history in [PROMPT_LOG.md](./PROMPT_LOG.md).
- Make it easy to answer "what is the project state right now?" without re-reading the whole repo.

## Update Protocol

1. Read [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) before making changes.
2. After every meaningful prompt or code change, update the living summary if anything changed.
3. Add one short entry to [PROMPT_LOG.md](./PROMPT_LOG.md) for the prompt or work session.
4. Keep the summary distilled. Put detail in code or the log, not in prose bloat.
5. When repo structure changes, update the entry points, commands, and watchouts immediately.

## What To Track

- Current focus.
- Files touched.
- Decisions made.
- Known issues and risks.
- Next step.

## What Not To Track

- Secrets.
- Private keys.
- Passwords.
- Disposable debug output.
- Large copied code blocks.

## Usage

- Read this folder first when resuming work.
- If a future prompt asks for "current context", use [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) as the source of truth.
- If a future prompt asks for a history of changes, use [PROMPT_LOG.md](./PROMPT_LOG.md).
- Before any new production deployment, check [production_deployment.md](../production_deployment.md) for the Google OAuth env precedence rule, the URI matrix, and the EC2 deployment checklist.
