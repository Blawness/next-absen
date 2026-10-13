/** Green from 90%, amber from 75%, red below — shared by the overall and per-employee rates. */
export const getRateColor = (rate: number) => {
  if (rate >= 90) return "text-emerald-300"
  if (rate >= 75) return "text-amber-300"
  return "text-rose-300"
}
