# Database

PostgreSQL 15 with an e-commerce schema (10 tables) and a deterministic seeding system.

- `schema/`: tables and indexes.
- `seed-generator/`: generates CSV files with a fixed seed (42) for four presets.
- `seed-loader/`: validates SHA-256 checksums and loads the CSVs with `COPY`.
- `docker-entrypoint.sh`: runs the schema and the load when the container starts.

| Preset | Rows |
|---|---|
| small | 15,400 |
| medium | 81,500 |
| large | 172,000 |
| xlarge | 880,000 |

```bash
cd seed-generator && npm install && npm run generate -- --preset large
```
Generated CSVs are not versioned. Then run `docker-compose up -d` from the repository root; `SEED_PRESET` selects the preset.
