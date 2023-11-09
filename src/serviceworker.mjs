//@ts-check
import fetchAndStream from "./index.mjs"

self.addEventListener("fetch", onFetch)

/**
 * @param {FetchEvent} event
 * @returns {void}
 */
function onFetch(event) {
  event.respondWith(fetchAndStream(event.request))
  // the following is implemented in Cloudflare workers
  if ("passThroughOnException" in event) {
    // @ts-ignore
    event.passThroughOnException()
  }
}
