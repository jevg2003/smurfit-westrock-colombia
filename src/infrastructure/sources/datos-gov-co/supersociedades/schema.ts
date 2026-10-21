import { z } from "zod";

/**
 * Fields of the Supersociedades "10.000 empresas más grandes" dataset (`6cat-2gcs`) that the app
 * reads. Names are exactly the ones returned by the API (confirmed against a recorded response;
 * note `raz_n_social`, `ganancia_p_rdida` and `a_o_de_corte`). The API returns number columns
 * (`nit`, `ciiu`, `a_o_de_corte`) as decimal strings such as "860026759.00", and amounts as text
 * with a "$" prefix whose spacing varies ("$ 1.91", "$0.57"). The adapter mapper converts them.
 */
export const supersociedadesRowSchema = z.object({
  nit: z.string().min(1),
  raz_n_social: z.string().min(1),
  ciudad_domicilio: z.string().optional(),
  ciiu: z.string().optional(),
  ingresos_operacionales: z.string().min(1),
  ganancia_p_rdida: z.string().min(1),
  total_activos: z.string().optional(),
  a_o_de_corte: z.string().min(1),
});

export const supersociedadesResponseSchema = z.array(supersociedadesRowSchema);

export type SupersociedadesRow = z.infer<typeof supersociedadesRowSchema>;
