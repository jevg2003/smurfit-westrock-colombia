import { createContainer, type Container } from "@/app/composition";
import { createFetcher } from "@/infrastructure/http/fetcher";

let cache: { factory: typeof createContainer; container: Container } | undefined;

/**
 * Browser composition: adapters are wired once, with the browser `fetch` injected.
 * The cache is keyed by the factory so a hot-reloaded composition (new adapters) rebuilds
 * the container instead of serving a stale one without them.
 * Tests replace this module, so no screen ever touches the network in tests.
 */
export function getContainer(): Container {
  if (cache?.factory !== createContainer) {
    cache = {
      factory: createContainer,
      container: createContainer({ fetcher: createFetcher({ fetchImpl: (...args) => window.fetch(...args) }) }),
    };
  }
  return cache.container;
}
