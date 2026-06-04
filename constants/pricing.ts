/** Format an integer amount of yen as e.g. `¥3,500`. */
export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}
