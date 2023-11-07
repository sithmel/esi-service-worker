//@ts-check
import assert from "assert"
import pkg from "zunit"

import {
  TransparentStateWriter,
  TransparentStreamStateWriter,
} from "../src/state.mjs"

const { describe, it, beforeEach, odescribe } = pkg

function getTestWritableStream(output) {
  output.text = ""
  const decoder = new TextDecoder()
  const queuingStrategy = new CountQueuingStrategy({ highWaterMark: 1 })

  return new WritableStream(
    {
      write(chunk) {
        return new Promise((resolve, reject) => {
          const decoded = decoder.decode(chunk, { stream: true })
          output.text += decoded
          resolve()
        })
      },
    },
    queuingStrategy,
  )
}
describe("state", () => {
  describe("TransparentStateWriter", () => {
    it("works", async () => {
      const state = new TransparentStateWriter()
      state.openTag("div", { class: "hello world" }, false)
      state.openTag("link", { type: "stylesheet" }, true)
      state.setOutput("Hello world!")
      state.openTag("br", {}, true)
      state.closeTag("div")
      assert.equal(
        state.output,
        '<div class="hello world"><link type="stylesheet" />Hello world!<br /></div>',
      )
    })
  })

  odescribe("TransparentStreamStateWriter", () => {
    it("works", async () => {
      const output = {}
      const writable = getTestWritableStream(output)
      const state = new TransparentStreamStateWriter(writable)
      state.openTag("div", { class: "hello world" }, false)
      state.openTag("link", { type: "stylesheet" }, true)
      state.setOutput("Hello world!")
      state.openTag("br", {}, true)
      state.closeTag("div")
      await state.end()
      assert.equal(
        output.text,
        '<div class="hello world"><link type="stylesheet" />Hello world!<br /></div>',
      )
    })
  })
})
