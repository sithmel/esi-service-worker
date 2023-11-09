//@ts-check

import { ESIStreamStateWriter } from "./state.mjs"
import parseReadableStream from "./parseReadableStream.mjs"

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export default async function fetchAndStream(request) {
  let response = await fetch(request)
  let contentType = response.headers.get("content-type")

  if (
    !contentType ||
    !contentType.startsWith("text/") ||
    response.body == null
  ) {
    return response
  }
  let { readable, writable } = new TransformStream()
  let newResponse = new Response(readable, response)
  newResponse.headers.set("cache-control", "max-age=0")
  streamTransformBody(response.body, writable)
  return newResponse
}

/**
 * @param {ReadableStream} readable
 * @param {WritableStream} writable
 * @returns {Promise<void>}
 */
async function streamTransformBody(readable, writable) {
  const state = new ESIStreamStateWriter(writable)
  await parseReadableStream(readable, state)
}
