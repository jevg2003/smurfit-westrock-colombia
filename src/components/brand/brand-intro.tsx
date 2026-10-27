import { IntroCloser } from "./intro-closer";
import { INTRO_SCRIPT } from "./intro-policy";

/**
 * Logo intro for the app. Server component, mounted once in the root layout: the inline script
 * decides before first paint whether to play (see intro-policy), and the overlay that follows is
 * shown by CSS. It always plays to the end while the destination loads and redirects underneath;
 * it never waits on data and can be skipped at any time.
 */
export function BrandIntro() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      <IntroCloser />
    </>
  );
}
