# NYT Pips API Research

## Endpoint

```
https://www.nytimes.com/svc/pips/v1/{YYYY-MM-DD}.json
```

- **No authentication required** — plain GET request, no cookies, no API keys, no special headers.
- Data available from `2025-08-18` (launch date) onward.
- The NYT publishes puzzle data ahead of the print date, so future dates may also return data.
- A new puzzle is released daily at midnight local time on the client, but the API serves by date regardless of timezone.

### Example

```
curl https://www.nytimes.com/svc/pips/v1/2025-08-24.json
```

## Response Format

```jsonc
{
  "printDate": "2025-08-24",       // Puzzle date (YYYY-MM-DD)
  "editor": "Ian Livengood",       // Editor name
  "easy":   { /* puzzle */ },      // Easy difficulty
  "medium": { /* puzzle */ },      // Medium difficulty
  "hard":   { /* puzzle */ }       // Hard difficulty
}
```

### Puzzle Object (per difficulty)

```jsonc
{
  "id": 19,                                    // Numeric puzzle ID
  "backendId": "875eaf36066b53c191a3c5be631add29",  // Backend hash ID
  "constructors": "Rodolfo Kurchan",           // Puzzle constructor(s)
  "dominoes": [[0,4], [6,5], [4,4], [1,1]],   // Array of domino tiles
  "regions": [ /* region constraints */ ],      // Array of region definitions
  "solution": [ /* domino placements */ ]       // Correct placement for each domino
}
```

### Dominoes

Each domino is a `[pip_a, pip_b]` pair where values range from **0 to 6** (standard double-six dominoes). The number of dominoes varies by difficulty:
- **Easy**: ~4 dominoes
- **Medium**: ~5–7 dominoes
- **Hard**: ~10+ dominoes (up to 16)

### Regions

Each region defines a constraint over a set of grid cells:

```jsonc
{
  "indices": [[row, col], ...],   // Grid positions in this region (0-indexed)
  "type": "sum",                  // Constraint type (see below)
  "target": 6                     // Target value (omitted for "empty" and "equals"/"unequal")
}
```

#### Constraint Types

| Type       | Meaning                                                | Has `target`? |
|------------|--------------------------------------------------------|---------------|
| `empty`    | No constraint — just place a domino half here          | No            |
| `equals`   | All cells in the region must show the **same** pip value | No            |
| `unequal`  | All cells in the region must show **different** pip values | No          |
| `sum`      | Sum of all cell values must **equal** `target`         | Yes           |
| `less`     | Sum of all cell values must be **less than** `target`  | Yes           |
| `greater`  | Sum of all cell values must be **greater than** `target` | Yes         |

### Grid Layout

- Coordinates are `[row, col]`, 0-indexed from top-left.
- The grid is **implicitly defined** by the union of all region indices — there is no explicit width/height field.
- Grids can be **irregular shapes** (not all cells in the bounding rectangle are necessarily part of the puzzle).

### Solution

The `solution` array maps 1:1 to the `dominoes` array (same index = same domino). Each entry is:

```jsonc
[[row1, col1], [row2, col2]]   // The two cells this domino covers
```

The first cell corresponds to the first pip value in the domino pair, and the second cell to the second pip value. Dominoes always cover exactly 2 **adjacent** cells (horizontally or vertically).

## Full Example (2025-08-24, Easy)

```json
{
  "printDate": "2025-08-24",
  "editor": "Ian Livengood",
  "easy": {
    "id": 19,
    "backendId": "875eaf36066b53c191a3c5be631add29",
    "constructors": "Rodolfo Kurchan",
    "dominoes": [[0,4], [6,5], [4,4], [1,1]],
    "regions": [
      {"indices": [[0,0]], "type": "empty"},
      {"indices": [[1,0]], "type": "sum", "target": 6},
      {"indices": [[1,1], [1,2]], "type": "equals"},
      {"indices": [[2,1]], "type": "empty"},
      {"indices": [[2,2], [2,3], [3,3]], "type": "equals"}
    ],
    "solution": [
      [[2,1], [2,2]],
      [[1,0], [0,0]],
      [[2,3], [3,3]],
      [[1,1], [1,2]]
    ]
  }
}
```

Interpreting the easy puzzle above:
- 4 dominoes to place on an irregular grid
- Grid cells: (0,0), (1,0), (1,1), (1,2), (2,1), (2,2), (2,3), (3,3)
- Domino `[0,4]` goes at cells (2,1)→0 and (2,2)→4
- Domino `[6,5]` goes at cells (1,0)→6 and (0,0)→5
- Domino `[4,4]` goes at cells (2,3)→4 and (3,3)→4
- Domino `[1,1]` goes at cells (1,1)→1 and (1,2)→1

## Other NYT Games API Endpoints (for reference)

The NYT uses the same `/svc/` pattern for other games:

| Game        | Endpoint                                                    | Auth Required? |
|-------------|-------------------------------------------------------------|----------------|
| Wordle      | `https://www.nytimes.com/svc/wordle/v2/{YYYY-MM-DD}.json`  | No             |
| Connections | `https://www.nytimes.com/svc/connections/v2/{YYYY-MM-DD}.json` | No          |
| Mini        | `https://www.nytimes.com/svc/crosswords/v6/puzzle/mini/{YYYY-MM-DD}.json` | `X-Games-Auth-Bypass: true` |
| Daily XW    | `https://www.nytimes.com/svc/crosswords/v6/puzzle/daily/{YYYY-MM-DD}.json` | `X-Games-Auth-Bypass: true` |
| **Pips**    | `https://www.nytimes.com/svc/pips/v1/{YYYY-MM-DD}.json`    | No             |

## Sources

- [kerrigan.dev — Solving NYT Pips with SMT](https://kerrigan.dev/blog/nyt-pips) — first documented the `/svc/pips/v1/` endpoint
- [healeycodes.com — Solving NYT's Pips Puzzle](https://healeycodes.com/solving-nyt-pips-puzzle) — solver referencing network tab discovery
- [ematth/pips](https://github.com/ematth/pips) — Python solver with `fetch_games.sh` script using the endpoint
- [brianberns/Pips](https://github.com/brianberns/Pips) — F# solver noting NYT publishes data ahead of time
- [NYT Games API endpoints gist](https://gist.github.com/telecter/02c753e074e4472e09455bb4b22ef2cb) — documents other NYT game endpoints
- [righto.com — Solving NYTimes Pips with constraints](http://www.righto.com/2025/10/solve-nyt-pips-with-constraints.html) — MiniZinc constraint solver
