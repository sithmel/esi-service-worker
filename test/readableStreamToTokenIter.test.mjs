//@ts-check
import assert from "assert"
import pkg from "zunit"

import readableStreamToTokenIter from "../src/readableStreamToTokenIter.mjs"
import { Tag } from "../src/readableStreamToTokenIter.mjs"
import { bufferChunksToString, ESI_TAG_TYPES } from "../src/utils.mjs"

const { describe, it, beforeEach, odescribe } = pkg

const testString = '<b>abc<esi:include src="123">XXX</esi:include><b>'

describe("readableStreamToTokenIter", () => {
  let testStream
  beforeEach(() => {
    testStream = new Blob([testString], { type: "text/plain" }).stream()
  })
  it("tokenize", async () => {
    let output = []
    for await (const item of readableStreamToTokenIter(testStream)) {
      output = output.concat(item.bufferChunks)
    }
    assert.equal(bufferChunksToString(output), testString)
  })
  it("extract ESI tags", async () => {
    const tags = []
    for await (const item of readableStreamToTokenIter(testStream)) {
      if (item instanceof Tag) {
        tags.push(item)
      }
    }
    assert.equal(tags.length, 4)

    assert.equal(tags[0].isESITag, false)
    assert.equal(tags[1].isESITag, true)
    assert.equal(tags[1].ESITagName, "INCLUDE")
    assert.equal(tags[1].ESITagType, ESI_TAG_TYPES.OPEN)
    assert.equal(tags[1].ESIAttrs.size, 1)
    assert.equal(tags[1].ESIAttrs.get("src"), "123")

    assert.equal(tags[2].isESITag, true)
    assert.equal(tags[2].ESITagName, "INCLUDE")
    assert.equal(tags[2].ESITagType, ESI_TAG_TYPES.CLOSE)

    assert.equal(tags[3].isESITag, false)
  })
})
