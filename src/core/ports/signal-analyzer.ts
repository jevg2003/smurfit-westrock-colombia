import type { Result } from "../domain/result";
import type { Signal, SignalAnalysis } from "../domain/signal";

export interface AnalysisInput {
  signal: Signal;
}

export interface AnalyzerError {
  kind: "disabled" | "unavailable" | "unknown";
  message: string;
}

export interface SignalAnalyzer {
  analyze(input: AnalysisInput): Promise<Result<SignalAnalysis, AnalyzerError>>;
}
