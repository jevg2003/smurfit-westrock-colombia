import { z } from "zod";

/**
 * Fields of the SECOP II contracts dataset (`jbjy-vk9h`) that the app reads. Names are exactly
 * the ones returned by the API (confirmed against a recorded response). Other fields are ignored.
 * Floating timestamps and numeric strings are converted by the adapter mapper, not here.
 */
export const secopContractRowSchema = z.object({
  id_contrato: z.string().min(1),
  nombre_entidad: z.string().min(1),
  departamento: z.string().optional(),
  documento_proveedor: z.string().min(1),
  proveedor_adjudicado: z.string().min(1),
  valor_del_contrato: z.string().min(1),
  fecha_de_firma: z.string().min(1),
  /** End date. Confirmed name: `fecha_de_fin_del_contrato` (not `fecha_de_fin`). Optional in the source. */
  fecha_de_fin_del_contrato: z.string().optional(),
  estado_contrato: z.string().min(1),
  urlproceso: z.object({ url: z.string() }).optional(),
});

export const secopContractsResponseSchema = z.array(secopContractRowSchema);

export type SecopContractRow = z.infer<typeof secopContractRowSchema>;
