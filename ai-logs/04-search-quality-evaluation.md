# AI log 04: Search quality evaluation with held-out queries

This is my Claude Code conversation (Claude Opus 5.5, desktop app), converted to Markdown.
Messages are unchanged. Tool calls are listed with shortened output, and JEV reviews are shown
in full. I removed the model's hidden reasoning, task-list updates, internal app data,
screenshots, local paths, usernames and email addresses.

---

## User (2026-10-20)

I tried to make them sound like something a real customer would search for, without mentioning the exact product names.
Query 1:
"The sunlight keeps waking me up too early. I need something to make my bedroom darker."

* No filters
* Expected: Blackout curtains
* Shouldn't rank unrelated bedroom or sleeping products above them.

Query 2:
"I'm going straight to the gym after work and need something to carry my clothes, trainers and a towel."

* Category: Fitness
* Expected: Gym duffel bag
* Shouldn't prioritise shoes, bottles or gym equipment.

Query 3:
"I'm tired of cleaning dust and crumbs off the floor myself. Is there something that could do it for me?"

* Maximum price: €250
* Expected: Robot vacuum
* Shouldn't prioritise unrelated home products.

Let's add these to our held-out evaluation group and map the expected products to their actual SKUs.
Please run the evaluation using the current model, product descriptions and relevance cutoff without changing anything first.
I'd like to see how each query performs, what products appear in the top results, their similarity scores and whether the expected products are ranked correctly.
If any of them fail, let's investigate why before deciding what to improve.
Also, please keep the previous evaluation results so we can compare them with the new ones.
For now, let's focus only on evaluating and understanding the search quality, without making implementation changes yet.

**Bash**: Save the current evaluation output as the baseline

```
mkdir -p docs/evaluation && npm run eval --silent 2>/dev/null > docs/evaluation/01-baseline.txt; grep -c . docs/evaluation/01-baseline.txt; sed -n '/## Summary/,/No-result/p' docs/evaluation/01-baseline.txt
```

<details><summary>Output</summary>

```
33
## Summary

group                                       cases  hit@3   MRR     traps  HNSW recall@10 vs exact
Semantic relevance (no filters)             11     0.91    0.88    1      1.000
Combined (query + filters)                  3      1.00    1.00    1      1.000
No-result cases: 4/4 passed
```

</details>

### Claude

The baseline is saved in `docs/evaluation/01-baseline.txt`. Adding your three queries word for word to the `heldOut` group.

**Edit**: Edited `U:\findwise-semantic-search\backend\data\evalQueries.json`

**Bash**: Add detailed ranking output for held-out queries to the eval script

```
cd /u/findwise-semantic-search/backend && python -I - <<'EOF'
def sub(path, a, b):
    s = open(path, encoding="utf-8").read(); assert a in s, (path, a)
    open(path, "w", encoding="utf-8", newline="\n").write(s.replace(a, b, 1))
p = "scripts/eval.ts"
sub(p, "  recallAt10: number; // HNSW vs exact\n}", "  recallAt10: number; // HNSW vs exact\n  ranked: { sku: string; similarity: number }[];\n}")
... (17 lines omitted) ...
  console.log("");
}

function summarise(results: CaseResult[]) {""")
sub(p, "const byId = new Map(products.map((p) => [p.id, p]));", "const byId = new Map(products.map((p) => [p.id, p]));\nconst skuToId = new Map(products.map((p) => [p.sku, p.id]));")
sub(p, "for (const [name, cases] of rankingGroups) allResults[name] = await runGroup(name, cases, current, true);",
       "for (const [name, cases] of rankingGroups) allResults[name] = await runGroup(name, cases, current, true, name.startsWith(\"Held-out\"));")
EOF
cd .. && npm run typecheck -w backend --silent && echo typecheck ok
```

<details><summary>Output</summary>

```
typecheck ok
```

</details>

### Claude

The typecheck passes. Running the unchanged evaluation (same model, descriptions and 0.30 cutoff) and saving the output next to the baseline.

**Bash**: Run evaluation with held-out queries and compare against baseline

```
npm run eval --silent 2>/dev/null > docs/evaluation/02-with-held-out.txt; sed -n '/## Held-out/,/## No-result/p' docs/evaluation/02-with-held-out.txt | sed '$d'; sed -n '/## Summary/,$p' docs/evaluation/02-with-held-out.txt; echo "--- semantic/combined groups identical to baseline?"; diff <(sed -n '/## Semantic/,/## No-result/p' docs/evaluation/01-baseline.txt) <(sed -n '/## Semantic/,/## Held-out/p' docs/evaluation/02-with-held-out.txt | sed '$d') && echo "identical" || echo "(differences above)"
```

<details><summary>Output</summary>

```
## Held-out (written before seeing results)

query                                               rank  best sim  top 3                      traps in top 3
The sunlight keeps waking me up too early. I need   4     0.336     OUT-004 ELE-008 OUT-005    -
      1  0.362  good   OUT-004  Rechargeable LED Headlamp
      2  0.347  good   ELE-008  E-Reader with Warm Light
... (27 lines omitted) ...

## Summary

group                                       cases  hit@3   MRR     traps  HNSW recall@10 vs exact
Semantic relevance (no filters)             11     0.91    0.88    1      1.000
Combined (query + filters)                  3      1.00    1.00    1      1.000
Held-out (written before seeing results)    3      0.67    0.75    0      1.000
No-result cases: 4/4 passed

Threshold calibration: lowest best-relevant similarity 0.335, highest no-result similarity 0.242 (current cut-off 0.3, strong 0.45)

## Embedding text recipe (semantic group)

name + description (current):         hit@3 0.91  MRR 0.88  traps 1
name + category + description:        hit@3 0.91  MRR 0.88  traps 1
--- semantic/combined groups identical to baseline?
23d22
< ## No-result cases (threshold 0.3)
(differences above)
```

</details>

**Write**: Wrote `U:\findwise-semantic-search\backend\scripts\diagnose.tmp.ts`

**Bash**: Run the query 1 diagnostic, then delete the temporary script

```
cd /u/findwise-semantic-search/backend && npx tsx scripts/diagnose.tmp.ts 2>&1 | grep -vi warn; rm scripts/diagnose.tmp.ts && echo "(temporary script deleted)"
```

<details><summary>Output</summary>

```
## A. Is the long two-sentence query diluting the key intent? (MiniLM)
The sunlight keeps waking me up too early. I need something to make my bedroom darker.       curtains #4 (0.336)   best other: OUT-004 0.362
The sunlight keeps waking me up too early.                                                   curtains #6 (0.247)   best other: OUT-006 0.306
I need something to make my bedroom darker.                                                  curtains #3 (0.326)   best other: OUT-004 0.369
make my bedroom darker                                                                       curtains #1 (0.343)   best other: OUT-004 0.329
block the sunlight in my bedroom                                                             curtains #1 (0.455)   best other: ELE-008 0.367
curtains that block sunlight                                                                 curtains #1 (0.726)   best other: CLO-011 0.350
blackout curtains                                                                            curtains #1 (0.758)   best other: CLO-007 0.374

## B. Does the model separate 'producing light' from 'blocking light'? (MiniLM, similarity to each product)
something that gives off light       curtains 0.319   headlamp 0.481   lantern 0.497   desk lamp 0.397
something that blocks out light      curtains 0.473   headlamp 0.401   lantern 0.400   desk lamp 0.302
make the room brighter               curtains 0.327   headlamp 0.336   lantern 0.336   desk lamp 0.329
make the room darker                 curtains 0.363   headlamp 0.259   lantern 0.288   desk lamp 0.253

## C. Reference model (bge-small-en-v1.5, diagnostic only)
The sunlight keeps waking me up too early. I need something to make my bedroom darker.       curtains #2 (0.584)   best other: HOM-004 0.598
(temporary script deleted)
```

</details>

**Bash**: Check eval output files for local paths and show changes

```
cd /u/findwise-semantic-search && grep -nE 'user|@gmail|C:\\|/c/Users|AppData' docs/evaluation/*.txt || echo "no local paths in eval outputs"; git status --short
```

<details><summary>Output</summary>

```
no local paths in eval outputs
 M backend/data/evalQueries.json
 M backend/scripts/eval.ts
?? .claude/
?? ai-logs/
?? docs/evaluation/
```

</details>

### Claude

Two of your three queries put the expected product first. The bedroom one fails: the blackout curtains come in 4th. I didn't change the model, descriptions, cutoff or app code. The only edits are your queries added to the eval file and the eval script printing more detail.

## Results

**Query 1, sunlight in the bedroom: ❌ curtains ranked 4th**

| # | Similarity | App would show | Product |
|---|---|---|---|
| 1 | 0.362 | Good match | Rechargeable LED Headlamp |
| 2 | 0.347 | Good match | E-Reader with Warm Light |
| 3 | 0.338 | Good match | Collapsible LED Lantern |
| **4** | **0.336** | Good match | **Thermal Blackout Curtains** ← expected |
| 5 | 0.303 | Good match | Wide-Brim Sun Hat |

**Query 2, gym bag (Fitness filter): ✅ ranked 1st, but six other products are wrongly labelled "Good match"**

| # | Similarity | App would show | Product |
|---|---|---|---|
| **1** | **0.622** | Strong match | **Gym Duffel Bag 35 L** ← expected |
| 2 | 0.413 | Good match | Evaporative Cooling Towel |
| 3 | 0.364 | Good match | Protein Shaker Bottle |
| 4–7 | 0.31–0.35 | Good match | sports bottle, resistance bands, yoga mat, jump rope |

**Query 3, robot vacuum (max €250): ✅ ranked 1st, with a clear lead**

| # | Similarity | App would show | Product |
|---|---|---|---|
| **1** | **0.449** | Good match | **Lidar Robot Vacuum Cleaner** ← expected |
| 2 | 0.211 | hidden | Evaporative Cooling Towel |
| 3+ | below 0.19 | hidden | everything else |

**Compared with the baseline**

| Group | hit@3 | MRR | HNSW vs exact |
|---|---|---|---|
| Baseline: relevance queries (11) | 0.91 | 0.88 | 1.000 |
| Baseline: combined queries (3) | 1.00 | 1.00 | 1.000 |
| **Your held-out queries (3)** | **0.67** | **0.75** | 1.000 |

The baseline numbers are unchanged. Both runs are saved as `docs/evaluation/01-baseline.txt` and `02-with-held-out.txt`.

The lower held-out score is the honest result. Your queries are written the way real customers type: long, conversational, and describing a *problem* rather than a product. That's harder than the short queries I wrote, which is exactly why held-out queries are valuable. HNSW still matched exact search exactly, so the search code isn't the issue.

## Why query 1 fails

I tested it in pieces with a temporary diagnostic script, which I've since deleted. There are two causes.

**1. The problem description drowns out the need.** The model averages every word into one vector, so the first sentence carries as much weight as the second:

| Query sent | Curtains rank |
|---|---|
| Your full query | #4 |
| Only "The sunlight keeps waking me up too early." | #6 (the solar charger comes first!) |
| Only "make my bedroom darker" | **#1** (0.343 vs 0.329, barely) |
| "block the sunlight in my bedroom" | **#1** (0.455, a clear lead) |

"Sunlight" and "early" pull the result toward products about light and mornings, so the actual need ("darker") gets outweighed.

**2. The model understands the topic better than the direction.** It knows the query is about *light*, but it's weak at telling apart *making* light and *blocking* it:

| Query | Curtains | Headlamp | Lantern |
|---|---|---|---|
| "something that blocks out light" | **0.47** | 0.40 | 0.40 |
| "make the room brighter" | 0.33 | 0.34 | 0.34 |

When the direction is spelled out, the model gets it right. When it's implied, the scores are almost identical. This is the same weakness as the "*without* a power outlet" query.

**Is it the model, the descriptions, or our code?**
- **Not our code:** the ranking matches exact search.
- **Not mainly the curtains' description:** it already says "block out nearly all daylight… helping light sleepers rest".
- **Not just MiniLM either:** the stronger reference model (bge-small) also fails this query, placing the curtains #2 behind the desk lamp.

So this is a genuinely hard query for small embedding models. Switching models would *not* reliably fix it. That's a useful finding in itself, because it argues against assuming "a bigger model fixes everything".

## The "Good match" problem, now with clearer evidence

These three queries show a pattern the baseline only hinted at.

**Raw scores can't be compared between queries.** Long, conversational queries produce lower and more bunched-up scores than short ones. In query 1, five products sit between 0.30 and 0.36 and all get "Good match", even though none is clearly right. In query 3, the robot vacuum is an obvious winner, yet it gets only "Good match", because 0.449 falls just under the 0.45 "strong" threshold.

**The gap between the top result and the rest says much more than the score itself:**

| Query | Top score | Lead over #2 | What it means |
|---|---|---|---|
| Robot vacuum | 0.449 | **0.238** | confident and correct |
| Gym bag | 0.622 | **0.209** | confident and correct |
| Bedroom darker | 0.362 | **0.015** | uncertain, and wrong |

So a fixed 0.30 cutoff works as a "nothing relevant at all" detector, as we found in the review. It can't tell "one clear answer" from "several weak guesses". That's why six fitness products get "Good match" next to the gym bag.

## Possible directions, for you to decide

1. **Labels based on the gap, not the raw score** (smallest change, biggest effect on what you flagged). For example, label a result "strong" when it clearly leads the others, and hide or demote results far behind the top one. This would fix the six "Good match" fitness items and the vacuum's understated label, and would mark query 1 as uncertain rather than confidently wrong.
2. **More realistic product descriptions**, like a real shop page, e.g. curtains mentioning "bedroom" and "sleep in later". This is legitimate, but it risks fitting the tests, so it would need fresh held-out queries afterwards.
3. **A different model.** Today's evidence shows it isn't a clear fix: bge-small also failed query 1.
4. **Keep everything as is** and document query 1 as a known limitation. That's also a valid outcome for a prototype.

If you want to change something, I'd start with option 1, because it directly addresses the misleading labels. Any rule we design should be tested against *all* the queries, not tuned to these three.

The updated eval file, the more detailed eval output and the two saved result files are uncommitted. The AI log and `.claude/` are still left out.

**Next-step box**: Held-out results: gym bag and robot vacuum rank first, but the blackout curtains rank 4th, giving held-out hit@3 0.67 vs 0.91 baseline. The cause is the model and the query style, not the code; both result files are saved and uncommitted.
Question: *Which relevance direction should we explore next?*

---

## User (2026-10-20)

I think they show that our search implementation is working correctly, but the model still has some limitations when it comes to understanding more complicated user intentions.
I'd rather not spend too much time trying different models or adjusting descriptions just to improve these particular results.
I like your first suggestion about improving how we present relevance, but I'm not sure we should rely too heavily on the gap between scores either. A large gap doesn't necessarily mean the first product is correct, right?
Maybe the better approach is to keep things simple and avoid labels like "Strong match" and "Good match" if they can be misleading. We could use something more neutral, like "Top ranked" or "Related results", and still show the similarity score as additional information.
Since we're going to work on the frontend design separately, let's leave those visual changes for that stage.
For now, I'd like to:

1. Keep our current embedding model, search logic and cutoff unchanged.
2. Save the evaluation results and document the limitations we've discovered.
3. Make sure the evaluation files are committed, without including any sensitive information or the AI logs.
4. Consider the backend complete for now unless there's a real technical issue we haven't addressed.

I'd also appreciate a quick explanation of why a large difference between similarity scores doesn't always mean the top result is correct.
Let's avoid starting another big optimisation process. I think we've learned quite a lot from these tests already.
Once that's done, I'd like us to move on to reviewing the frontend design and improving the overall user experience.

### Claude

Agreed on all four points. I'll document the findings without touching the model, search logic or cutoff, then commit. Your question about the score gap gets a full answer after that.

**Write**: Wrote `U:\findwise-semantic-search\docs\evaluation\README.md`

### Claude

One claim needs softening: I compared q8 and fp32 on only two queries, not all of them.

**Edit**: Edited `U:\findwise-semantic-search\docs\evaluation\README.md`

**Edit**: Edited `U:\findwise-semantic-search\README.md`

**Read**: Read `U:\findwise-semantic-search\docs\PLAN.md`

**Bash**: Update plan statuses and note the relevance-wording follow-up

```
python -I - <<'EOF'
p = "docs/PLAN.md"; s = open(p, encoding="utf-8").read()
reps = {
 "| done (held-out queries pending) |": "| done (incl. 3 held-out queries) |",
 "| script done; final run after held-out queries |": "| done: results and limitations in `docs/evaluation/` |",
 "| 8 | Frontend: search, filters, results, explanation of the pipeline | done |":
... (1 lines omitted) ...
}
for a, b in reps.items():
    assert a in s, a; s = s.replace(a, b)
old = "### UI (step 8)\n"
assert old in s
s = s.replace(old, old + "- **Revisit in the design stage:** \"Strong / Good match\" can overstate weak results\n  (see `docs/evaluation/`). Prefer neutral wording such as \"Top ranked\" / \"Related\n  results\", with the similarity score as secondary information.\n")
open(p, "w", encoding="utf-8", newline="\n").write(s)
EOF
grep -nE '^\| (1|6|8) \||Revisit' docs/PLAN.md
```

<details><summary>Output</summary>

```
22:| 1 | Product dataset **and** evaluation queries with expected results, written together (before any search results exist, to avoid overfitting) | done (incl. 3 held-out queries) |
27:| 6 | Evaluation script (`npm run eval`): relevance metrics + HNSW vs exact comparison | done: results and limitations in `docs/evaluation/` |
29:| 8 | Frontend: search, filters, results, explanation of the pipeline | done; design and UX review next (incl. neutral relevance wording) |
97:- **Revisit in the design stage:** "Strong / Good match" can overstate weak results
```

</details>

**Bash**: Run tests, stage evaluation docs, and scan the staged files

```
npm test --silent 2>&1 | grep -E 'Test Files|Tests |FAIL'; npm run typecheck -w backend --silent && echo "typecheck ok"; git add -- backend/data/evalQueries.json backend/scripts/eval.ts docs/evaluation README.md docs/PLAN.md && echo "--- staged:" && git diff --cached --name-status && F=$(git diff --cached --name-only --diff-filter=AM) && echo "--- secrets:" && (grep -nIiE '(api[_-]?key|secret[_-]?key|passw(or)?d *[:=]|bearer |BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{16,}|hf_[A-Za-z0-9]{16,})' $F || echo none) && echo "--- personal data / local paths:" && (grep -nIE '@gmail|user|C:\\\\Users|/c/Users|AppData' $F || echo none) && echo "--- generated files:" && (echo "$F" | grep -iE '\.(db|hnsw|onnx|env|log)$|generated/|dist/' || echo none) && echo "--- not staged:" && git status --short | grep -v '^[MADR] '
```

<details><summary>Output</summary>

```
Test Files  8 passed (8)
      Tests  70 passed (70)
 Test Files  2 passed (2)
      Tests  13 passed (13)
typecheck ok
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
... (4 lines omitted) ...
warning: in the working copy of 'docs/evaluation/02-with-held-out.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/evaluation/README.md', LF will be replaced by CRLF the next time Git touches it
--- staged:
M	README.md
M	backend/data/evalQueries.json
M	backend/scripts/eval.ts
M	docs/PLAN.md
A	docs/evaluation/01-baseline.txt
A	docs/evaluation/02-with-held-out.txt
A	docs/evaluation/README.md
--- secrets:
none
--- personal data / local paths:
none
--- generated files:
none
--- not staged:
?? .claude/
?? ai-logs/
```

</details>

**Bash**: Commit the evaluation results and documentation

```
git commit -q -F - <<'EOF'
docs: add held-out evaluation results and document known limitations

- three held-out queries written before seeing results, mapped to SKUs
- eval script prints full rankings (similarity and display band) for held-out queries
- saved baseline and held-out evaluation outputs in docs/evaluation
- findings: implementation verified (HNSW = exact search); model limitations
  (word overlap, direction/negation, long queries, English only); 0.30 cut-off
  works as a no-match detector but not as a quality filter
- README and plan: known limitations; relevance wording to revisit in the
  frontend design stage. Model, descriptions and cut-off deliberately unchanged.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git log --oneline -3 && git status -sb
```

<details><summary>Output</summary>

```
6655e38 docs: add held-out evaluation results and document known limitations
b077b93 fix: harden backend after review (live index sync, price bounds, setup)
41c1e22 feat: add React search frontend connected to the backend API
## main...origin/main [ahead 1]
?? .claude/
?? ai-logs/
```

</details>

**Next-step box**: Evaluation results and known limitations are documented and committed locally as 6655e38, one commit ahead of GitHub. Model, search logic and cutoff are unchanged; the backend is complete. AI logs and .claude remain uncommitted.
Question: *Should I push this commit to GitHub?*

---

## User (2026-10-20)

Yes, push the evaluation commit, then let's start the frontend design and UX review.

**Bash**: Push the evaluation commit and confirm sync

```
git push -q origin main 2>&1; git fetch -q && git status -sb | head -1 && git log --oneline -1
```

<details><summary>Output</summary>

```
## main...origin/main
6655e38 docs: add held-out evaluation results and document known limitations
```

</details>

**Browser**: preview list

<details><summary>Output</summary>

```
[
  {
    "serverId": "4030cc28-8c87-4fd0-bcb8-324bc8ca5fba",
    "name": "frontend",
    "port": 5173,
    "status": "running",
... (33 lines omitted) ...
    },
    {
      "tabId": "tab-3",
      "origin": "http://localhost:3001",
      "isActive": true
    }
  ]
}
Process entries above are for preview_stop / preview_logs only; address pages via tabId on the session preview.
```

</details>

**Browser**: tabs close

**Browser**: viewport: 1280x800

**Browser**: tabs select; open http://localhost:5173; wait; screenshot

<details><summary>Output</summary>

```
[tabs_select] Fronted tab tab-1.
[navigate] navigated to http://localhost:5173/
[computer:wait] waited 1s
[computer:screenshot] Screenshot size: 560x350 0.7-scale view; coordinate frame: 800x500.
[screenshot]
[Image: source: ~\.claude\projects\U--findwise-semantic-search\aa51f30c-0ca6-4821-84cf-762b18d0618c\tool-results\mcp-Claude_Browser-blob-1792503355829-hvw96m.jpg]
```

</details>

**Browser**: find

<details><summary>Output</summary>

```
[find] Found 1 match(es) for "gift for a coffee lover":
- button "gift for a coffee lover" [ref_15] type="button"
```

</details>

**Browser**: left_click: Runs the coffee gift example query; wait; find; screenshot

<details><summary>Output</summary>

```
[computer:left_click] left_click at (1100, 192) [ref_15]
[computer:wait] waited 1.5s
[find] Found 1 match(es) for "How does this search work":
- generic "How does this search work?" [ref_31]
[computer:screenshot] Screenshot size: 560x350 0.7-scale view; coordinate frame: 800x500.
[screenshot]
[Image: source: ~\.claude\projects\U--findwise-semantic-search\aa51f30c-0ca6-4821-84cf-762b18d0618c\tool-results\mcp-Claude_Browser-blob-1792503364901-kjx2xi.jpg]
```

</details>

**Browser**: left_click: Expands the How does this search work panel; screenshot; run JavaScript in the page

<details><summary>Output</summary>

```
[computer:left_click] left_click at (632, 325) [ref_31]
[computer:screenshot] Screenshot size: 560x350 0.7-scale view; coordinate frame: 800x500.
[screenshot]
[Image: source: ~\.claude\projects\U--findwise-semantic-search\aa51f30c-0ca6-4821-84cf-762b18d0618c\tool-results\mcp-Claude_Browser-blob-1792503371741-460p2p.jpg]
[javascript_tool:javascript_exec] {
  "cardCount": 6,
  "cardHeights": [
    303,
    303,
    303,
    303
  ],
  "firstCardTop": 584,
  "viewport": "1280x800"
}
```

</details>

**Browser**: viewport: mobile

**Browser**: wait; run JavaScript in the page; screenshot

<details><summary>Output</summary>

```
[computer:wait] waited 1s
[javascript_tool:javascript_exec] {
  "cardHeight": 240,
  "firstCardTop": 752,
  "pageHeight": 2385,
  "viewport": "375x812"
}
[computer:screenshot] Screenshot size: 281x608 0.6-scale view; coordinate frame: 469x1015.
[screenshot]
[Image: source: ~\.claude\projects\U--findwise-semantic-search\aa51f30c-0ca6-4821-84cf-762b18d0618c\tool-results\mcp-Claude_Browser-blob-1792503381058-z4o27f.jpg]
```

</details>

**Browser**: viewport: desktop

### Claude

The evaluation commit is pushed, and `main` matches GitHub at `6655e38`. Below is the frontend UX review. I haven't changed any frontend code yet.

First, the answer I owed you last time.

## Why a big score gap doesn't mean the top result is correct

You're right to be sceptical. The gap measures how much the model **prefers** the top product over the others, not whether that preference is **right**.

Similarity is the model's opinion of "how alike these texts look". A big gap only means one product looks *much more alike* than the rest, and a product can look alike for the wrong reason.

**Example from our own data:** "something to keep my drink hot on a camping trip" puts the hot water bottle at 0.526 and the thermos at 0.507, because the bottle's *name* contains "hot water". Now imagine a shop that sold no thermos or travel mug. The hot water bottle would still score 0.526, but the next product might score 0.40. That would be a big gap and a confident-looking winner, and it would still be wrong: you can't drink from a hot water bottle.

**The opposite happens too:** for "gift for a coffee lover" there are five correct answers (grinder, pour-over set, cold brew maker…) with scores close together. The gap is tiny, but the top result is perfectly right.

So the gap tells you *how distinctive* the top product is within this catalog, not whether it's *correct*. Only a human-labelled test (like our evaluation) can judge correctness. That's why your instinct to use neutral wording, instead of labels that claim confidence, is the safer design.

## Frontend UX review

I checked the first screen, a results page and the explanation panel, and measured the layout at desktop size (1280×800) and phone size (375×812).

### High priority

**1. Search results start below the visible screen.**

| Screen | Where the first product card starts | Visible screen height |
|---|---|---|
| Desktop 1280×800 (explanation panel open) | 584 px down | 800 px, so about one row of products |
| Phone 375×812 | **752 px down** | 812 px, so **no product is visible** after searching |

On a phone you search and then see nothing new until you scroll. Everything above the results takes space every time: the header, the full-width Search button, four rows of example chips, three filter fields and the explanation panel.

**Proposal:**
- a more compact header
- example queries shown only on the first screen and in empty states, not above every result list
- on phones, filters folded behind a "Filters" button
- the "How it works" panel moved out of the main flow, e.g. a link that opens it

The aim is for results to start within the first screen on both sizes.

**2. Relevance labels that overstate confidence.** This is the issue from the evaluation. The proposal follows your suggestion:
- remove the "Strong match" and "Good match" badges
- keep the order as the main signal, with a summary line like *"6 related products · most relevant first"*
- optionally a single "Top ranked" marker on the first result
- keep "similarity 0.62" as small secondary text, with the existing tooltip explaining it's not a percentage

The backend can stay as it is. The frontend would simply stop showing the `relevance` field.

### Medium priority

**3. The first screen is empty.** A first-time user sees a search box and a text box, but no products and no sense of what the shop sells. **Proposal:** show the six categories as clickable tiles with product counts, next to the example queries. Clicking a tile browses that category. That uses features we already have, with no backend change.

**4. Product cards are long:** about 300 px each on desktop, because the full description is shown. **Proposal:** limit the description to 3 lines and let the user expand it. The description is still worth showing, because it shows *why* a product matched.

**5. On phones, the Search button takes a full row.** **Proposal:** put a compact search button inside the input, and keep the search bar fixed at the top while scrolling, so you can refine the search without scrolling back up.

### Low priority / polish

**6. Active filters aren't summarised.** After scrolling, you can't see which filters apply. **Proposal:** a small row of removable chips above the results, e.g. "Kitchen & Drinkware ✕" and "≤ €20 ✕".

**7. General visual polish:** a clearer type scale, card hover states, more spacing between sections. This stays within the current clean, neutral style, with no new libraries.

### What's already fine

- The loading, error and empty states are clear. We tested all of them earlier.
- The dark theme and the keyboard focus styles work.
- Results are announced to screen readers through `role="status"`.

## Suggested order

Items 1 and 2 first: they fix real usability problems and the misleading labels. Then 3 to 5, then 6 and 7 if time allows. I'd do it as one frontend pass, with no new dependencies and no backend changes, and verify every state again in the browser on desktop and phone.

**Next-step box**: The evaluation commit is pushed and main is in sync with GitHub. The frontend UX review is done; the biggest problems are that results start below the visible screen (no product visible on a phone after searching) and the overstated relevance labels. No frontend code has changed yet.
Question: *Should I implement the high- and medium-priority proposals (items 1–5)?*

### Claude

No response requested.
