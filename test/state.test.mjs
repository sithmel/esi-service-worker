//@ts-check
import assert from "assert"
import pkg from "zunit"

import {
  TransparentStateWriter,
  TransparentStreamStateWriter,
  ESIStreamStateWriter,
} from "../src/state.mjs"

const { describe, it, before } = pkg

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

  describe("TransparentStreamStateWriter", () => {
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

  describe("ESIStreamStateWriter", () => {
    let fetchFunction
    before(() => {
      fetchFunction = (url) => {
        return new Blob([`<div class="test">${url}</div>`], {
          type: "text/plain",
        }).stream()
      }
    })
    it("works as transparent", async () => {
      const output = {}
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
      const output = {}
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
      const output = {}
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
      const output = {}
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
  })
})
