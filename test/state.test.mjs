//@ts-check
import assert from "assert"
import pkg from "zunit"

import {
  TransparentStateWriter,
  TransparentStreamStateWriter,
  ESIStreamStateWriter,
} from "../src/state.mjs"

import parseReadableStream from "../src/parseReadableStream.mjs"

const { describe, it, before } = pkg

/**
 * @param {{text:string}} output
 * @returns {WritableStream}
 */
function getTestWritableStream(output) {
  output.text = ""
  const decoder = new TextDecoder()
  const queuingStrategy = new CountQueuingStrategy({ highWaterMark: 1 })

  return new WritableStream(
    {
      /**
       * @param {AllowSharedBufferSource} chunk
       * @returns {Promise<void>}
       */
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

  describe("TransparentStreamStateWriter", () => {
    it("works", async () => {
      const output = { text: "" }
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

  describe("ESIStreamStateWriter", () => {
    /** @type {(arg0: string) => Promise<ReadableStream<Uint8Array>|null>} */
    let fetchFunction
    before(() => {
      fetchFunction = async (url) => {
        return new Blob([`<div class="test">${url}</div>`], {
          type: "text/plain",
        }).stream()
      }
    })
    it("works as transparent", async () => {
      const output = { text: "" }
      const writable = getTestWritableStream(output)
      const state = new ESIStreamStateWriter(writable, fetchFunction)
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
    it("works with esi:remove", async () => {
      const output = { text: "" }
      const writable = getTestWritableStream(output)
      const state = new ESIStreamStateWriter(writable, fetchFunction)
      state.openTag("div", { class: "hello world" }, false)
      state.openTag("link", { type: "stylesheet" }, true)

      state.openTag("esi:remove", {}, false)
      state.openTag("div", { class: "invisible" }, false)
      state.setOutput("should not be visible")
      state.closeTag("div")
      state.closeTag("esi:remove")

      state.setOutput("Hello world!")
      state.openTag("br", {}, true)
      state.closeTag("div")
      await state.end()
      assert.equal(
        output.text,
        '<div class="hello world"><link type="stylesheet" />Hello world!<br /></div>',
      )
    })

    it("works with esi:include", async () => {
      const output = { text: "" }
      const writable = getTestWritableStream(output)
      const state = new ESIStreamStateWriter(writable, fetchFunction)
      state.openTag("div", { class: "hello world" }, false)
      state.openTag("link", { type: "stylesheet" }, true)

      state.openTag("esi:include", { src: "hello fragment" }, true)

      state.setOutput("Hello world!")
      state.openTag("br", {}, true)
      state.closeTag("div")
      await state.end()
      assert.equal(
        output.text,
        '<div class="hello world"><link type="stylesheet" /><div class="test">hello fragment</div>Hello world!<br /></div>',
      )
    })
    it("works with esi:include, fetch error", async () => {
      const output = { text: "" }
      const writable = getTestWritableStream(output)
      const state = new ESIStreamStateWriter(writable, () => {
        return Promise.reject(new Error("ops"))
      })
      state.openTag("div", { class: "hello world" }, false)
      state.openTag("link", { type: "stylesheet" }, true)

      state.openTag("esi:include", { src: "hello fragment" }, true)

      state.setOutput("Hello world!")
      state.openTag("br", {}, true)
      state.closeTag("div")
      await state.end()
      assert.equal(
        output.text,
        '<div class="hello world"><link type="stylesheet" /><!--ESI Error: ops-->Hello world!<br /></div>',
      )
    })

    it("works end to end", async () => {
      const output = { text: "" }
      const writable = getTestWritableStream(output)
      const state = new ESIStreamStateWriter(writable, fetchFunction)
      const testString =
        '<div class="hello world"><link type="stylesheet" /><esi:include src="hello fragment" />Hello world!<br /></div>'
      const readable = new Blob([testString], { type: "text/plain" }).stream()

      await parseReadableStream(readable, state)
      assert.equal(
        output.text,
        '<div class="hello world"><link type="stylesheet" /><div class="test">hello fragment</div>Hello world!<br /></div>',
      )
    })
  })
})
