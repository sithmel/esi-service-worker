import { bufferChunksToString, parseESITag } from "./utils.mjs"

export class Token {
  constructor(bufferChunks) {
    this.bufferChunks = bufferChunks
  }
}

export class Text extends Token {}
export class Tag extends Token {
  constructor(bufferChunks) {
    super(bufferChunks)
    this.str = bufferChunksToString(bufferChunks).slice(1, -1)
    const { ESITagName, ESITagType, ESIAttrs } = parseESITag(this.str)
    this.isESITag = ESITagName != null
    this.ESITagName = ESITagName
    this.ESITagType = ESITagType
    this.ESIAttrs = ESIAttrs
  }
}

export default async function* readableStreamToTokenIter(readable) {
  const startTag = "<".charCodeAt(0)
  const endTag = ">".charCodeAt(0)
  let reader = readable.getReader()

  let templateChunks = null
  while (true) {
    let { done, value } = await reader.read()
    if (done) break
    while (value.byteLength > 0) {
      if (templateChunks) {
        let end = value.indexOf(endTag)
        if (end === -1) {
          templateChunks.push(value)
          break
        } else {
          templateChunks.push(value.subarray(0, end + 1))
          yield new Tag(templateChunks)
          templateChunks = null
          value = value.subarray(end + 1)
        }
      }
      let start = value.indexOf(startTag)
      if (start === -1) {
        yield new Text(value)
        break
      } else {
        yield new Text(value.subarray(0, start))
        // value = value.subarray(start + 1)
        value = value.subarray(start)
        templateChunks = []
      }
    }
  }
}
