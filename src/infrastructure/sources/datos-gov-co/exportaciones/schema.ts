import { z } from "zod";

/**
 * Fields of the national exports dataset (`vwqt-xc3z`, MinCIT) that the app reads. Names are
 * exactly the ones returned by the API (confirmed against a recorded response). The dataset is
 * already one row per quarter, national, with no product or chapter column, so there is no
 * sector cut. Numbers arrive as strings.
 */
export const exportsRowSchema = z.object({
  /** Quarter end, floating timestamp. */
  fecha: z.string().min(10),
  fecha_de_corte: z.string().optional(),
  /** Non-mining-energy exports. Unit not declared by the dataset (apparently millions of USD). */
  valor_exportaciones_nme: z.string().min(1),
});

export const exportsResponseSchema = z.array(exportsRowSchema);

export type ExportsRow = z.infer<typeof exportsRowSchema>;
