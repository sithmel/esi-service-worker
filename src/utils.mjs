import { decodeHTML } from "entities"

export function bufferChunksToString(chunks) {
  const decoder = new TextDecoder()

  let templateKey = chunks.reduce(
    (accumulator, chunk) =>
      accumulator + decoder.decode(chunk, { stream: true }),
    "",
  )
  templateKey += decoder.decode()

  return templateKey
}

export const ESI_TAG_TYPES = {
  OPEN: 0,
  CLOSE: 1,
  SELF_CLOSING: 2,
}

const attrRegexp = /([^\s]+)=(["'])(.*?)\2/g

export function parseAttrs(str) {
  const attrs = new Map()
  for (const match of str.matchAll(attrRegexp)) {
    attrs.set(match[1], decodeHTML(match[3]))
  }
  return attrs
}

export function parseESITag(string) {
  let ESITagName
  let ESITagType
  let ESIAttrs = new Map()

  const [tag] = string.split(" ", 1)
  const tagName = tag.toUpperCase()
  if (tagName.startsWith("ESI:")) {
    ESITagName = tagName.split(":")[1]
    ESITagType = string.endsWith("/")
      ? ESI_TAG_TYPES.SELF_CLOSING
      : ESI_TAG_TYPES.OPEN
    ESIAttrs = parseAttrs(string)
  } else if (tagName.startsWith("/ESI:")) {
    ESITagName = tagName.split(":")[1]
    ESITagType = ESI_TAG_TYPES.CLOSE
  }
  return { ESITagName, ESITagType, ESIAttrs }
}
