/** Compact ARR/MRR money label, e.g. 142000 -> "$142k", 1200000 -> "$1.2M". */
export function fmtArr(n: number): string {
  if (n >= 1e6) {
    const m = n / 1e6;
    return '$' + (m >= 10 ? Math.round(m) : Math.round(m * 10) / 10) + 'M';
  }
  return '$' + Math.round(n / 1000) + 'k';
}

/** A renewal countdown's RAG tone: red within 14 days, amber within 45. */
export function renewalTone(days: number): 'red' | 'amber' | 'none' {
  if (days <= 14) return 'red';
  if (days <= 45) return 'amber';
  return 'none';
}

export function renewalColor(days: number): string {
  const tone = renewalTone(days);
  return tone === 'red'
    ? 'var(--rag-red-text)'
    : tone === 'amber'
      ? 'var(--rag-amber-text)'
      : 'var(--text-secondary)';
}

/** Format an absolute renewal date `days` from `from`, e.g. "Jul 6, 2026". */
export function renewalDateLabel(days: number, from: Date): string {
  const d = new Date(from.getTime() + days * 86_400_000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
