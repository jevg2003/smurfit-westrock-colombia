import { createContainer, type Container } from "@/app/composition";
import { createFetcher } from "@/infrastructure/http/fetcher";

let container: Container | undefined;

/**
 * Browser composition: adapters are wired once, with the browser `fetch` injected.
 * Tests replace this module, so no screen ever touches the network in tests.
 */
export function getContainer(): Container {
  container ??= createContainer({ fetcher: createFetcher({ fetchImpl: (...args) => window.fetch(...args) }) });
  return container;
}
