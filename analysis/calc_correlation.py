import pandas as pd
import numpy as np
from scipy.stats import pearsonr

# Dados do Judge (overall_score_mean)
judge_data = {
    'openrouter-gpt-oss-120b': 9.21,
    'openrouter-qwen3-32b': 8.75,
    'openrouter-gemini-2.5-flash': 8.67,
    'openrouter-gpt-5-mini': 8.52,
    'ollama-duckdb-nsql': 5.55,
    'ollama-phi3': 2.84,
    'ollama-llama2': 2.47
}

# Dados do F1 (Row F1)
f1_data = {
    'openrouter-gpt-oss-120b': 0.7911,
    'openrouter-qwen3-32b': 0.7364,
    'openrouter-gemini-2.5-flash': 0.6853,
    'openrouter-gpt-5-mini': 0.7064,
    'ollama-duckdb-nsql': 0.5411,
    'ollama-phi3': 0.2000,
    'ollama-llama2': 0.1865
}

# Ordenar por modelo para garantir alinhamento
models = sorted(judge_data.keys())
judge_scores = [judge_data[m] for m in models]
f1_scores = [f1_data[m] for m in models]

# Calcular correlação de Pearson
correlation, p_value = pearsonr(judge_scores, f1_scores)

print(f"Correlação de Pearson entre Judge Score e F1: {correlation:.4f}")
print(f"P-value: {p_value:.4f}")
print(f"\nDados:")
print("Modelo | Judge Score | F1 Score")
print("-" * 50)
for m in models:
    print(f"{m:40} | {judge_data[m]:.2f} | {f1_data[m]:.4f}")
