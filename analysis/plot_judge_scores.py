"""
Script para gerar gráfico de scores do LLM Judge a partir dos resultados salvos
Não requer rodar o notebook novamente
"""

import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

# Configurações
BASE_PATH = Path(__file__).parent.parent
TABLES_PATH = BASE_PATH / 'analysis' / 'tables'
FIGS_PATH = BASE_PATH / 'analysis' / 'figs'

# Paleta de cores (mesma do notebook)
MODEL_COLORS = {
    'ollama-duckdb-nsql': '#2E86AB',
    'ollama-llama2': '#A23B72',
    'ollama-phi3': '#F18F01',
    'openrouter-gemini-2.5-flash': '#C73E1D',
    'openrouter-gpt-5-mini': '#6A994E',
    'openrouter-gpt-oss-120b': '#BC4B51',
    'openrouter-qwen3-32b': '#8B5A3C'
}

# Carregar dados salvos
print("📊 Carregando resultados do judge...")
judge_stats = pd.read_csv(TABLES_PATH / 'judge_overall_stats.csv', index_col=0)

# Extrair média do overall_score
overall_scores = judge_stats['overall_score_mean'].sort_values(ascending=True)

print(f"✓ Carregados {len(overall_scores)} modelos\n")

# Criar gráfico
fig, ax = plt.subplots(figsize=(10, 6))

colors = [MODEL_COLORS.get(model, '#333333') for model in overall_scores.index]

overall_scores.plot(kind='barh', ax=ax, color=colors)

ax.set_xlabel('Overall Score (0-10)', fontsize=12)
ax.set_ylabel('Model', fontsize=12)
ax.set_title('LLM Judge - Overall Score by Model', fontsize=14, fontweight='bold')
ax.set_xlim(0, 10.5)
ax.grid(axis='x', alpha=0.3)

# Adicionar valores nas barras
for i, (model, score) in enumerate(overall_scores.items()):
    ax.text(score + 0.15, i, f'{score:.2f}', va='center', fontsize=10)

plt.tight_layout()

# Salvar
output_file = FIGS_PATH / 'judge_overall_scores_quick.png'
plt.savefig(output_file, dpi=300, bbox_inches='tight')
print(f"✓ Gráfico salvo em: {output_file}")

# Mostrar
plt.show()

# Printar tabela resumo
print("\n" + "="*60)
print("RANKING DOS MODELOS (LLM JUDGE)")
print("="*60)
for idx, (model, score) in enumerate(overall_scores.sort_values(ascending=False).items(), 1):
    std = judge_stats.loc[model, 'overall_score_std']
    print(f"{idx}. {model:35s} {score:.2f}/10 (±{std:.2f})")
print("="*60)
