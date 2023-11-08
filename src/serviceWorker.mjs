import { ESIStreamStateWriter } from "../src/state.mjs"
import parseReadableStream from "../src/parseReadableStream.mjs"

self.addEventListener("fetch", (event) => {
  event.respondWith(fetchAndStream(event.request))
  // the following is implemented in Cloudflare workers
  if ("passThroughOnException" in event) {
    event.passThroughOnException()
  }
})

async function fetchAndStream(request) {
  let response = await fetch(request)
  let contentType = response.headers.get("content-type")

  if (!contentType || !contentType.startsWith("text/")) {
    return response
  }
  let { readable, writable } = new TransformStream()
  let newResponse = new Response(readable, response)
  newResponse.headers.set("cache-control", "max-age=0")
  streamTransformBody(response.body, writable)
  return newResponse
}

async function streamTransformBody(readable, writable) {
  const state = new ESIStreamStateWriter(writable)
  await parseReadableStream(readable, state)
}
