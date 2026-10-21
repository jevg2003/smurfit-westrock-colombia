/** Every threshold the signal rules read. Defaults live in `src/content/config/empresa.ts`. */
export interface RuleThresholds {
  trmDailyMovePct: number;
  trmDailyAlertPct: number;
  contractExpiryWatchDays: number;
  contractExpiryAlertDays: number;
  competitorContractWindowDays: number;
}
