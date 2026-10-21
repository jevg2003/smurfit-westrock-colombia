import type { SignalRule } from "../usecases/detect-signals";
import { detectCompetitorNewContracts } from "./secop-competitor-new-contract";
import { detectNewsKeywordMentions } from "./news-keyword-mention";
import { detectExpiringContracts } from "./secop-expiring-contract";
import { detectTrmDailyMoveSignals } from "./trm-daily-move";

/** The rules of the MVP, adapted to the shared `SignalInputs`. */
export const DEFAULT_SIGNAL_RULES: readonly SignalRule[] = [
  (inputs, _clock, thresholds) =>
    detectTrmDailyMoveSignals({
      records: inputs.trmRecords,
      thresholds,
      fetchedAt: inputs.trmFetchedAt,
    }),
  (inputs, clock, thresholds) =>
    detectExpiringContracts({
      contracts: inputs.contracts,
      companyNit: inputs.companyNit,
      clock,
      thresholds: {
        watchDays: thresholds.contractExpiryWatchDays,
        alertDays: thresholds.contractExpiryAlertDays,
      },
    }),
  (inputs, clock, thresholds) =>
    detectCompetitorNewContracts({
      contracts: inputs.contracts,
      competitors: inputs.competitors,
      clock,
      windowDays: thresholds.competitorContractWindowDays,
    }),
  (inputs, clock) =>
    detectNewsKeywordMentions({ news: inputs.news ?? [], groups: inputs.newsTermGroups ?? [], clock }),
];
