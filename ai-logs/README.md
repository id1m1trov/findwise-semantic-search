# AI conversation logs

This folder holds my full Claude Code conversation from building the project, split into
phases. Every message is kept as written, and each tool call (commands, file edits, browser
checks) is listed with shortened output. JEV reviews, which I ran from the same conversation,
are included in full.

| File | What happens in it |
|---|---|
| [01-planning-and-setup.md](01-planning-and-setup.md) | Reviewing the brief, planning the architecture, setting up the project, fixing the `hnswlib-node` install on Windows, first quick tests |
| [02-dataset-and-backend.md](02-dataset-and-backend.md) | Designing the dataset, the 72 products and evaluation queries, then SQLite, embeddings, the HNSW index, the search API and tests |
| [03-frontend-and-backend-review.md](03-frontend-and-backend-review.md) | The first React frontend, a full backend review (keeping the index in sync, price rounding, fresh-clone fixes), checking why some searches rank badly |
| [04-search-quality-evaluation.md](04-search-quality-evaluation.md) | My held-out queries, the evaluation results, why a big score gap doesn't mean a correct result, documenting the limitations |
| [05-store-redesign.md](05-store-redesign.md) | The store design, finding and checking product photos, accessibility and performance checks (axe, Lighthouse), home page, product details and cart |
| [06-final-features-and-docs.md](06-final-features-and-docs.md) | "Load more", removable filter tags, documentation, these logs, and deployment |

## How they were made

A small script converted the raw conversation file into these Markdown files. Nothing was
rewritten or summarised. It only removed the model's hidden reasoning, task-list updates,
internal app data, screenshots, local file paths, usernames, email addresses, and the path
of one unrelated program on my machine.

I also used ChatGPT during the project, to discuss ideas, review decisions and improve my
prompts. Those conversations are separate and not included here.
