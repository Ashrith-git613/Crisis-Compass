# USAII Hackathon — Crisis Helpline Classifier

## Project Overview

A crisis query classification pipeline that takes a user's natural-language crisis description, classifies it into one of 23 helpline topics using an LLM (via OpenRouter), extracts structured metadata, and fetches relevant resources — both national helplines and nearby places from Google Maps.

## Codebase Structure

```
.
├── .env                    # API keys (OPENROUTER_API_KEY, SERP_API_KEY)
├── .venv/                  # Python virtual environment (3.12)
├── main.py                 # Placeholder entry point
├── pyproject.toml          # Dependencies (crawl4ai, langchain, serpapi, etc.)
├── uv.lock                 # Lockfile
├── test.ipynb              # Test notebook
├── opencode.md             # This file
└── Query identifier/
    └── queryagent.py       # Main pipeline script
```

## Pipeline Flow (`queryagent.py`)

### 1. User Input
Prompts `"what crisis are you facing?"` and captures raw text.

### 2. LLM Classification
- **Model**: `nvidia/nemotron-3-nano-30b-a3b:free` via OpenRouter
- **Prompt template** instructs the model to output strict JSON matching the `JsonClass` Pydantic schema
- **Template variables**: schema, topics list, helplines dict, user input
- **Output parsed** via `json.loads()` into 7 variables

### 3. Pydantic Schema (`JsonClass`)
| Field | Type | Description |
|---|---|---|
| `Topic` | `str` | Classified crisis topic from the helpline list |
| `location` | `str` | City/location mentioned in the query |
| `Locationquery` | `str` | Google Maps search query (topic + location, `+` separated) |
| `need_for_nationalhelpline` | `bool` | Whether national helpline assistance is needed |
| `national_assistance_which` | `str` | Name of the national helpline |
| `national_assistance_helpline_number` | `int` | Phone number of the national helpline |
| `confidence_threshold` | `float` | Classification confidence (0–1) |

### 4. Data Fetching (`get_help_forquery`)
Two parallel data sources, called after classification:

**a. findahelpline.com** (via `crawl4ai`)
- URL: `https://findahelpline.com/countries/in/ka/topics/{topic}`
- Returns markdown list of crisis helpline organizations in Karnataka, India

**b. Google Maps Places** (via `serpapi` Google Maps engine)
- Query: the `Locationquery` field (e.g. `depression+Bangalore`)
- Returns top 10 places with: **name**, **phone**, **website**

## Session Changes

| File | Change |
|---|---|
| `Query identifier/queryagent.py:10` | Added `load_dotenv()` call |
| `Query identifier/queryagent.py:42` | Fixed missing comma in `from_messages` list (syntax error) |
| `Query identifier/queryagent.py:45-47` | Fixed chain order: `template \| model` (was `model \| template`) |
| `Query identifier/queryagent.py:47-48` | Fixed `invoke({})` — template had no variables (fully f-string-ed) |
| `Query identifier/queryagent.py:18-26` | Expanded `JsonClass` from 3 fields to 7 (added `location`, `need_for_nationalhelpline`, `national_assistance_which`, `national_assistance_helpline_number`) |
| `Query identifier/queryagent.py:23` | Added JSON schema to prompt via `{schema}` template variable — was incorrectly using `{topics_helpline}` |
| `Query identifier/queryagent.py:114-115` | Added helplines dict to prompt for national helpline lookups |
| `Query identifier/queryagent.py:132-140` | Stored all parsed fields as named variables |
| `Query identifier/queryagent.py:150-171` | Replaced Google Maps `crawl4ai` crawl with SerpAPI `google_maps` engine — returns clean JSON (name, phone, website) instead of broken JS-rendered HTML |
| `Query identifier/queryagent.py:150-151` | Simplified `get_help_forquery` signature to only `(topic, location_query)` |
| `pyproject.toml:16` | Added `serpapi>=1.0.2` dependency |

## Environment Variables (`.env`)

```
OPENROUTER_API_KEY=<key>
SERP_API_KEY=<key>
```

## Running

```bash
echo "I feel depressed and need help in Bangalore" | \
  .venv/bin/python "Query identifier/queryagent.py"
```
