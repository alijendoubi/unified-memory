const BUDGETS: Record<string, number> = {
  continuation: 220,
  tier1: 450,
  normal_with_search: 1500,
  deep_recall: 5000,
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function tokenBudgetWarning(cost: number, scenario: string): void {
  const budget = BUDGETS[scenario]
  if (budget !== undefined && cost > budget) {
    process.stderr.write(
      `[unified-memory] token warning: ${scenario} cost ${cost} exceeds budget ${budget}\n`
    )
  }
}

export { BUDGETS as TOKEN_BUDGETS }
