import type { Result } from "@/core/domain/result";
import type { SignalAnalysis } from "@/core/domain/signal";
import type { AnalysisInput, AnalyzerError, SignalAnalyzer } from "@/core/ports/signal-analyzer";

/** The MVP has no AI: this analyzer is always disabled and never produces an analysis. */
export class NoopSignalAnalyzer implements SignalAnalyzer {
  async analyze(_input: AnalysisInput): Promise<Result<SignalAnalysis, AnalyzerError>> {
    return { ok: false, error: { kind: "disabled", message: "El análisis con IA no está activado." } };
  }
}
