import { NewspaperIcon } from "lucide-react";
import { GoogleNewsLogo } from "@/components/brand/google-news-logo";
import { Badge } from "@/components/reui/badge";
import type { NewsItem } from "@/core/domain/news";

/** Outlet of a headline as a badge: the Google News mark when it came through Google News, a newspaper icon otherwise. */
export function NewsSourceBadge({ outlet, via }: Pick<NewsItem, "outlet" | "via">) {
  return (
    <Badge variant="outline" className="max-w-full">
      {via === "google-news" ? <GoogleNewsLogo className="size-3.5" /> : <NewspaperIcon aria-hidden="true" className="size-3.5" />}
      <span className="truncate">{outlet}</span>
      {via === "google-news" && <span className="sr-only">vía Google News</span>}
    </Badge>
  );
}
