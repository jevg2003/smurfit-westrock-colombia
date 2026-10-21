/** Every threshold the signal rules read. Defaults live in `src/content/config/empresa.ts`. */
export interface RuleThresholds {
  trmDailyMovePct: number;
  trmDailyAlertPct: number;
  contractExpiryWatchDays: number;
  contractExpiryAlertDays: number;
  competitorContractWindowDays: number;
  /** Week-over-week move (percent) of the spot electricity price that goes on watch. */
  energySpotWeeklyMovePct: number;
  /** Week-over-week move (percent) of the spot electricity price that raises an alert. */
  energySpotWeeklyAlertPct: number;
}
