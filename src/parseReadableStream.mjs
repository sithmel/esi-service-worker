//@ts-check
import * as htmlparser2 from "htmlparser2"
import voidElements from "./voidElements.mjs"

/**
 * @param {ReadableStream} readable
 * @param {import("./state.mjs").TransparentStateWriter} state
 * @returns {Promise<void>}
 */
export default async function parseReadableStream(readable, state) {
  return new Promise(async (resolve, reject) => {
    let selfClosing = false
    const parser = new htmlparser2.Parser(
      {
        onopentag(tagname, attribs) {
          if (voidElements.has(tagname)) {
            selfClosing = true
          }
          state.openTag(tagname, attribs, selfClosing)
        },
        onprocessinginstruction(_name, data) {
          state.setOutput("<" + data + ">")
        },
        ontext(data) {
          state.setOutput(data)
        },
        oncomment(data) {
          state.setOutput("<!--" + data)
        },
        oncommentend() {
          state.setOutput("-->")
        },
        onclosetag(tagname) {
          if (!selfClosing) {
            state.closeTag(tagname)
          }
          selfClosing = false
        },
        async onend() {
          await state.end()
          resolve()
        },
        onerror(error) {
          reject(error)
        },
      },
      { recognizeSelfClosing: true },
    )
    const decoder = new TextDecoder()

    let reader = readable.getReader()

    while (true) {
      let { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value, { stream: true })
      parser.write(text)
    }
    parser.end()
  })
}
