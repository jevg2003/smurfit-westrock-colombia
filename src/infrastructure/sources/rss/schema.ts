import { z } from "zod";

/** What `/api/news` answers. The browser validates it again: the route is ours, but a stale deploy could differ. */
export const newsApiItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().min(1),
  outlet: z.string().min(1),
  publishedAt: z.iso.datetime(),
  via: z.enum(["rss", "google-news"]),
  feedId: z.string().min(1),
});

export const feedHealthSchema = z.object({
  id: z.string(),
  outlet: z.string(),
  status: z.enum(["ok", "error", "disabled"]),
  count: z.number().int().nonnegative(),
  httpStatus: z.number().int().optional(),
  message: z.string().optional(),
});

export const newsResponseSchema = z.object({
  items: z.array(newsApiItemSchema),
  feeds: z.array(feedHealthSchema),
  fetchedAt: z.iso.datetime(),
});
