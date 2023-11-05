//@ts-check
import assert from "assert"
import pkg from "zunit"

import {
  bufferChunksToString,
  parseESITag,
  ESI_TAG_TYPES,
} from "../src/utils.mjs"

const { describe, it, beforeEach, odescribe, oit } = pkg

describe("utils", () => {
  describe("translate", () => {
    it("works", () => {
      var enc = new TextEncoder() // always utf-8
      const chunks = "I am a chunked string"
        .split(" ")
        .map((str) => enc.encode(str).buffer)

      assert.equal(bufferChunksToString(chunks), "Iamachunkedstring")
    })
  })
  describe("parseESITag", () => {
    it("parses ESI open tag", () => {
      const { ESITagName, ESITagType, ESIAttrs } = parseESITag("esi:include")
      assert.equal(ESITagName, "INCLUDE")
      assert.equal(ESITagType, ESI_TAG_TYPES.OPEN)
      assert.equal(ESIAttrs.size, 0)
    })

    it("parses ESI open tag with attrs", () => {
      const { ESITagName, ESITagType, ESIAttrs } = parseESITag(
        "esi:include test='1' string=\"hello world\"",
      )
      assert.equal(ESITagName, "INCLUDE")
      assert.equal(ESITagType, ESI_TAG_TYPES.OPEN)
      assert.equal(ESIAttrs.size, 2)
      assert.equal(ESIAttrs.get("test"), "1")
      assert.equal(ESIAttrs.get("string"), "hello world")
    })

    it("parses ESI closed tag", () => {
      const { ESITagName, ESITagType, ESIAttrs } = parseESITag("/esi:include")
      assert.equal(ESITagName, "INCLUDE")
      assert.equal(ESITagType, ESI_TAG_TYPES.CLOSE)
      assert.equal(ESIAttrs.size, 0)
    })

    it("parses ESI self closing tag with attrs", () => {
      const { ESITagName, ESITagType, ESIAttrs } = parseESITag(
        'esi:include string="hello world"/',
      )
      assert.equal(ESITagName, "INCLUDE")
      assert.equal(ESITagType, ESI_TAG_TYPES.SELF_CLOSING)
      assert.equal(ESIAttrs.size, 1)
      assert.equal(ESIAttrs.get("string"), "hello world")
    })
  })
})
