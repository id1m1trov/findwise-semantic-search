# Search relevance evaluation

Run it with `npm run eval`. It works on an in-memory copy of the catalog, so it never touches
the app's database. Raw outputs from each run are kept in this folder:

- [`01-baseline.txt`](01-baseline.txt): the queries written together with the dataset.
- [`02-with-held-out.txt`](02-with-held-out.txt): the same run plus three held-out queries,
  written by the developer before seeing any results.

Nothing (model, product descriptions, cut-off, search code) was changed between the two runs.

## What is measured

The evaluation separates two questions, because they fail for different reasons:

| Question | Metric | What a failure would mean |
|---|---|---|
| Is the **search implementation** correct? | HNSW recall@10 against exact brute-force cosine similarity over the same filtered products | A bug in our code or index settings |
| Is the **embedding model** finding the right products? | hit@3 (a correct product in the top 3) and MRR (1 / rank of the first correct product) against hand-labelled expected SKUs | A limitation of the model or of the product text |

Query groups are kept apart so a failure points at its cause: semantic queries without
filters, query + filter combinations, no-result cases, and held-out queries. Pure filter
behaviour (categories, price bounds, empty results) is covered by deterministic unit tests
instead (`npm test`).

## Results

| Group | Cases | hit@3 | MRR | Traps in top 3 | HNSW vs exact |
|---|---|---|---|---|---|
| Semantic relevance (no filters) | 11 | 0.91 | 0.88 | 1 | 1.000 |
| Combined (query + filters) | 3 | 1.00 | 1.00 | 1 | 1.000 |
| **Held-out (written before seeing results)** | 3 | **0.67** | **0.75** | 0 | 1.000 |
| No-result cases | 4 | 4/4 passed | | | |

Held-out queries in detail:

| Query (abridged) | Filter | Expected | Rank | Similarity | Next best |
|---|---|---|---|---|---|
| "The sunlight keeps waking me up too early. I need something to make my bedroom darker." | – | Blackout curtains | **4** | 0.336 | headlamp 0.362, e-reader 0.347, lantern 0.338 |
| "I'm going straight to the gym after work and need something to carry my clothes, trainers and a towel." | Fitness | Gym duffel bag | 1 | 0.622 | cooling towel 0.413 |
| "I'm tired of cleaning dust and crumbs off the floor myself…" | max 250 EUR (excludes nothing) | Robot vacuum | 1 | 0.449 | cooling towel 0.211 |

The held-out score is lower than the baseline because those queries are longer, more
conversational and describe a *problem* rather than a product. That is the more realistic
measurement.

## Findings

**The search implementation is correct.** HNSW returned exactly the same neighbours as exact
search in every case, and on the two queries compared the quantised model (q8) ranked the
same as full precision (fp32).
The remaining failures come from the model's similarity judgements, not from our code.

**Embedding-model limitations observed:**

1. **Surface word overlap can beat meaning.** "Something to keep my drink hot on a camping
   trip" ranks the *Rubber Hot Water Bottle* (0.526) just above the thermos (0.507). On names
   alone the bottle scores 0.44 ("hot water" ≈ "drink hot") and the thermos only 0.16; on
   descriptions alone the thermos ranks first.
2. **Topic is understood better than direction.** The model knows a query is about *light*,
   but is weak at *making* light vs *blocking* it ("make the room brighter": curtains 0.33,
   headlamp 0.34). The same applies to negation: "charge my phone *without* a power outlet"
   still ranks the wall charger in the top 3.
3. **Long problem descriptions dilute the need.** The sentence vector is an average of all
   words: "The sunlight keeps waking me up too early" alone ranks the curtains 6th (the solar
   charger comes first), while "make my bedroom darker" alone ranks them 1st.
4. **English only.** A German query returns no relevant results.

A stronger small model (bge-small-en-v1.5, tested only as a diagnostic) fixes finding 1 but
also fails the bedroom query, so switching models is not a reliable fix for these cases.

**The 0.30 cut-off is a "nothing relevant" detector, not a quality filter.** Across 17
deliberately unrelated queries the best score was 0.29 (one exception, "children's picture
books" → e-reader at 0.33, is arguably related), and the weakest correct match scored 0.335.
But for real queries many loosely related products also pass 0.30: for the gym-bag query six
other fitness products would be shown, and for the camping query 16 products pass, including
a cooling towel and a candle. Absolute scores are also not comparable across queries (long
conversational queries score lower overall), so fixed "strong / good match" bands can
overstate weak results and understate clear ones (the robot vacuum, an obvious winner at
0.449, falls just under the 0.45 "strong" band).

## Decisions

- The model, product descriptions, cut-off and search logic are **kept unchanged**.
  Improving these particular scores by rewording descriptions or switching models would fit
  the tests rather than improve the system, and the diagnostics show no single change fixes
  all observed cases.
- How relevance is *presented* will be revisited in the frontend design stage: neutral
  wording (e.g. "Top ranked" / "Related results") instead of "Strong / Good match", with the
  similarity score as secondary information.
- With more time, the next steps would be: a larger, independently written held-out set;
  product text written like real shop pages; and evaluating a hybrid keyword + semantic
  ranking (SQLite FTS5) for queries where exact words matter.
