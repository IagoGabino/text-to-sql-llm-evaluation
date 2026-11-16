# Text-to-SQL LLM Evaluation

A framework to evaluate how well LLMs turn natural-language questions into SQL, built to compare hosted proprietary models with open-weight models on quality, cost and privacy.

Course project (Advanced Databases, UFMG). Group project.
<!-- Add one line here with your own contribution. -->

## Components

- `database/`: PostgreSQL 15 in Docker with an e-commerce schema (10 tables). Data is generated deterministically (fixed seed), checked with SHA-256 and loaded with `COPY`, in four sizes from `small` (15k rows) to `xlarge` (880k).
- `backend/`: Node.js, TypeScript and Express API. Loads the schema, builds prompts, calls the models (OpenRouter and Ollama), runs the generated and reference queries and records logs and metrics. Includes a batch runner and a 20-question test suite of increasing complexity.
- `front/`: React and Vite UI for interactive tests.
- `analysis/`: notebooks, figures and tables.

## Evaluation

Each generated query is scored on four dimensions: syntax and execution success, result quality against the reference result (F1, Jaccard), similarity to the reference query (embeddings vs. TF-IDF) and an LLM-as-a-judge score for correctness, completeness and efficiency.

## Results

7 models, 20 questions.

| Model | Execution success | Judge score (0–10) | Total cost (USD) |
|---|---|---|---|
| gpt-oss-120b | 100% | 9.21 | 0.0049 |
| qwen3-32b | 100% | 8.75 | 0.0094 |
| gemini-2.5-flash | 100% | 8.67 | 0.0132 |
| gpt-5-mini | 100% | 8.52 | 0.0244 |
| duckdb-nsql (Ollama) | 75% | 5.55 | local |
| phi3 (Ollama) | 25% | 2.84 | local |
| llama2 (Ollama) | 25% | 2.47 | local |

The open-weight gpt-oss-120b (served through OpenRouter in these runs) scored highest and cost about one fifth of gpt-5-mini. Small local models were clearly worse. Full tables and figures are in `analysis/`.

## Running

```bash
cp .env.example .env                      # set DB_PASSWORD (and SEED_PRESET)
cp backend/.env.example backend/.env      # set OPENROUTER_API_KEY, DB_PASSWORD

cd database/seed-generator && npm install && npm run generate -- --preset large && cd ../..
docker-compose up -d                      # PostgreSQL, schema and seed data

cd backend && npm install && npm run dev  # API
cd ../front && npm install && npm run dev # UI
npm run evaluate                          # (in backend/) batch evaluation of the test suite
```
