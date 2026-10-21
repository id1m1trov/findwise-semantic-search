# Search API

| Endpoint | Description |
|---|---|
| `GET /api/search` | Search and filter products (parameters below) |
| `GET /api/categories` | Category names for the filter |
| `GET /api/health` | Status and product count |

## `GET /api/search` parameters

| Parameter | Meaning |
|---|---|
| `q` | Free text, up to 200 characters. Empty means "browse": products are listed by name. |
| `category` | Exact category name from `/api/categories` |
| `minPrice`, `maxPrice` | Price range in euros, inclusive |
| `limit` | 1–50, default 10 |

```bash
curl "http://localhost:3001/api/search?q=keep+my+drink+hot&category=Kitchen+%26+Drinkware&maxPrice=40&limit=5"
```

## Response

Each result has:

- `sku`, `name`, `description`, `category`
- `price` in euros
- `similarity`: cosine similarity between query and product (not a percentage)
- `relevance`: `strong` or `good`

`meta.outcome` says why a list is empty, so the UI can show the right message:

- `results`: products were found
- `no_filter_matches`: the filters exclude every product
- `no_relevant_matches`: no product is similar enough to the query

Invalid parameters return `400` with the field and the reason.
