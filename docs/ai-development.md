# How AI tools were used

## Tools

- **Claude Code (Claude Opus 5.5, in the Claude desktop app)** was the main assistant. It
  helped plan the architecture and wrote the backend, frontend and tests. It also ran and
  debugged them, reviewed the backend and frontend (including Lighthouse and axe), sourced and
  checked product photos, and wrote documentation. The full conversation is in
  [`ai-logs/`](../ai-logs/), lightly cleaned (local paths, email and internal tool data
  removed).
- **JEV**, an evaluation agent available as a tool in the same session, gave independent,
  structured second opinions. It checked the plan against the brief and reviewed the
  architecture, the dataset strategy and the final backend. Its calls and answers are in the
  logs.
- **ChatGPT** was used separately to discuss ideas, sanity-check decisions and improve my
  prompts before giving them to Claude Code.

## How the work was split

AI assistants proposed options and wrote most of the code; the direction and the key decisions
were mine. For example:

- building step by step, with a review after each step
- sticking with `hnswlib-node` and installing the build tools instead of switching libraries
- treating SQLite as the source of truth
- writing the held-out evaluation queries myself, and not tuning descriptions or the cut-off
  to fit them
- replacing "strong/good match" labels with neutral wording
- keeping the backend unchanged during the frontend work

Every step was tested before it was committed. The step-by-step plan is in
[PLAN.md](PLAN.md).
