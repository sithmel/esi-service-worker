# esi-service-worker

This package contains a minimal implementation of [Edge Side Includes](https://en.wikipedia.org/wiki/Edge_Side_Includes) that run on both [serviceworkers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) and [cloudflare workers](https://blog.cloudflare.com/edge-side-includes-with-cloudflare-workers/).

## ESI compatibility

See full specs [here](https://www.w3.org/TR/esi-lang/)

This package only implements esi:include and esi:remove.

```html
<esi:include src="/cgi-bin/date.cgi" />
<esi:remove> This is removed</esi:remove>
```

It doesn't implement:

- attributes on esi:includes
- Variable sostitutions
- recursion

## Implementation details

Most of the basic code infrastructure is in place. It can be easily extended with the part of the specs we want to implement.

## How to use

The package includes a prebundled version `serviceworker.js`
A serviceworker can also be implemented with:

```js
import fetchAndStream from "esi-stream-parser"

self.addEventListener("fetch", onFetch)

function onFetch(event) {
  event.respondWith(fetchAndStream(event.request))
  // the following is implemented in Cloudflare workers
  if ("passThroughOnException" in event) {
    event.passThroughOnException()
  }
}
```
