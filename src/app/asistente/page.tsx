import { Suspense } from "react";
import { AssistantPage } from "@/features/asistente/assistant-page";

export default function AsistentePage() {
  // `useSearchParams` (the ?c= link from the side panel) needs a Suspense boundary on a static page.
  return (
    <Suspense>
      <AssistantPage />
    </Suspense>
  );
}
