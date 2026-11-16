# Backend

Node.js + TypeScript + Express API. It builds prompts from the database schema, calls the LLM providers (OpenRouter, Ollama), runs the generated and reference SQL on PostgreSQL, and writes evaluation logs.

Configuration is in `.env.example`. Setup is described in the root README.

| Command | What it does |
|---|---|
| `npm run dev` | API with auto-reload |
| `npm run build` / `npm start` | Compile and run |
| `npm run evaluate` | Batch evaluation of `tests/test-suite.json` |
| `npm run generate:expected-results` | Executes the reference queries and stores their results |
| `npm run preview:prompt` | Prints the prompt that would be sent to a model |
| `npm test` | Unit tests |
