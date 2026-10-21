import { z } from "zod";

/**
 * XM public API (`POST /hourly`) answers one item per day with a single entity whose `Values`
 * hold `Hour01`..`Hour24` as decimal strings (confirmed against a recorded response). Unknown
 * metric ids are answered with HTTP 400 and a plain-text body, which fails JSON parsing on purpose.
 */
export const xmHourlyResponseSchema = z.object({
  Items: z.array(
    z.object({
      Date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      HourlyEntities: z.array(z.object({ Id: z.string(), Values: z.record(z.string(), z.string()) })),
    }),
  ),
});

export type XmHourlyResponse = z.infer<typeof xmHourlyResponseSchema>;
