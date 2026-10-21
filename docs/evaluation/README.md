# Search relevance evaluation

**In short:** the search code works exactly as intended (HNSW returns the same results as an
exact search). The model puts a correct product in the top 3 for 91% of the original test
queries and for 2 of 3 new, unseen queries. Where it fails, it's because of how the model
judges similarity, for example favouring matching words over matching meaning.

Run it with `npm run eval`. It works on an in-memory copy of the catalog, so it never touches
the app's database. The raw output of each run is kept in this folder:

- [`01-baseline.txt`](01-baseline.txt): the queries I wrote together with the dataset.
- [`02-with-held-out.txt`](02-with-held-out.txt): the same run plus three held-out queries,
  which I wrote before seeing any results.

Nothing was changed between the two runs: not the model, the product descriptions, the
cut-off or the search code.

## What is measured

The evaluation asks two separate questions, because they fail for different reasons:

| Question | How it's measured | What a failure would mean |
|---|---|---|
| Is the **search code** correct? | HNSW's top 10 compared with an exact search over the same filtered products (recall@10) | A bug in my code or index settings |
| Does the **model** find the right products? | hit@3 and MRR against products I labelled by hand (explained below) | A limitation of the model or of the product text |

- **hit@3:** the share of queries with a correct product in the top 3. 0.91 means 91%.
- **MRR (mean reciprocal rank):** rewards putting the correct product *first*. A correct
  product at rank 1 scores 1, at rank 2 scores 0.5, at rank 4 scores 0.25; MRR is the average.
- **Traps:** products that share words with a query but are the wrong thing. They shouldn't
  appear in the top 3.

The queries are split into groups so a failure points at its cause: searches without filters,
searches with filters, cases that should find nothing, and held-out queries. Plain filter
behaviour (categories, price limits, empty results) is covered by the unit tests instead
(`npm test`).

## Results

| Group | Cases | hit@3 | MRR | Traps in top 3 | HNSW vs exact |
|---|---|---|---|---|---|
| Search without filters | 11 | 0.91 | 0.88 | 1 | 1.000 |
| Search with filters | 3 | 1.00 | 1.00 | 1 | 1.000 |
| **Held-out (written before seeing results)** | 3 | **0.67** | **0.75** | 0 | 1.000 |
| Should find nothing | 4 | 4/4 passed | | | |

The held-out queries in detail:

| Query (shortened) | Filter | Expected | Rank | Similarity | Next best |
|---|---|---|---|---|---|
| "The sunlight keeps waking me up too early. I need something to make my bedroom darker." | – | Blackout curtains | **4** | 0.336 | headlamp 0.362, e-reader 0.347, lantern 0.338 |
| "I'm going straight to the gym after work and need something to carry my clothes, trainers and a towel." | Fitness | Gym duffel bag | 1 | 0.622 | cooling towel 0.413 |
| "I'm tired of cleaning dust and crumbs off the floor myself…" | max €250 (excludes nothing) | Robot vacuum | 1 | 0.449 | cooling towel 0.211 |

The held-out score is lower than the baseline because these queries are longer, more
conversational, and describe a *problem* rather than a product. That makes them the more
realistic test.

## Findings

**The search code is correct.** HNSW returned exactly the same results as an exact search in
every case. On the two queries I compared, the smaller quantised model (q8) also ranked the
same as the full-precision one (fp32). So the remaining failures come from the model's
judgement, not from my code.

**What the model gets wrong:**

1. **Matching words can beat matching meaning.** "Something to keep my drink hot on a camping
   trip" ranks the *Rubber Hot Water Bottle* (0.526) just above the thermos (0.507). The
   product names explain it: "hot water" looks a lot like "drink hot". Comparing names only,
   the bottle scores 0.44 and the thermos 0.16; comparing descriptions only, the thermos wins.
2. **It understands the topic better than the direction.** It knows a query is about *light*,
   but can't really tell *making* light from *blocking* it ("make the room brighter" scores the
   curtains 0.33 and a headlamp 0.34). Negation has the same problem: "charge my phone
   *without* a power outlet" still puts the wall charger in the top 3.
3. **Long descriptions of a problem water down the actual need.** The query's vector is
   roughly an average of all its words. "The sunlight keeps waking me up too early" on its own
   ranks the curtains 6th (a solar charger comes first), while "make my bedroom darker" on its
   own ranks them 1st.
4. **English only.** A German query returns no relevant results.

I also tried a stronger small model (bge-small-en-v1.5), only to diagnose these failures. It
fixes the first problem but also fails the bedroom query, so switching models isn't a reliable
fix.

**The 0.30 cut-off detects "nothing relevant", but it isn't a quality filter.**

- For 17 deliberately unrelated queries, the best score was 0.29. The one exception was
  "children's picture books" → e-reader at 0.33, which is arguably related.
- The weakest correct match scored 0.335, so 0.30 sits neatly between the two.
- But for real queries, many loosely related products also pass 0.30. For the gym-bag query,
  six other fitness products would be shown. For the camping query, 16 products pass,
  including a cooling towel and a candle.
- Scores also can't be compared between queries: long, chatty queries score lower overall. So
  a fixed "strong match" label would sometimes overstate a weak result and understate a clear
  one. The robot vacuum, an obvious winner at 0.449, falls just under the 0.45 "strong" line.

## Decisions

- I **kept** the model, product descriptions, cut-off and search code unchanged. Rewording
  descriptions or switching models to improve these particular scores would just fit the
  tests, not improve the search, and the diagnostics show no single change fixes every case.
- I changed how relevance is *shown* in the frontend instead: results appear in order ("Most
  relevant first", "Top match") instead of with "Strong / Good match" labels, and the
  similarity score appears only in the product details, not as a percentage.
- With more time, my next steps would be:
  - a larger set of held-out queries written by someone else
  - product text written like real shop pages
  - trying a mix of keyword search (SQLite FTS5) and semantic ranking, for queries where exact
    words matter
