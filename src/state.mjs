//@ts-check
export class TransparentStateWriter {
  constructor() {
    this.output = ""
  }
  /**
   * @param {string} tagname
   * @param {{[s: string]: string}} attribs
   * @param {boolean} selfClosing
   * @returns {void}
   */
  openTag(tagname, attribs, selfClosing) {
    const attributes = Object.entries(attribs).reduce((acc, [attr, value]) => {
      return acc + ` ${attr}="${value}"`
    }, "")
    this.setOutput(`<${tagname}${attributes}${selfClosing ? " />" : ">"}`)
  }
  /**
   * @param {string} tagname
   * @returns {void}
   */
  closeTag(tagname) {
    this.setOutput(`</${tagname}>`)
  }
  /**
   * @param {string} text
   * @returns {void}
   */
  setOutput(text) {
    this.output += text
  }
  /**
   * @returns {Promise<void>}
   */
  end() {
    return Promise.resolve()
  }
}

export class TransparentStreamStateWriter extends TransparentStateWriter {
  /**
   * @param {WritableStream} writable
   */
  constructor(writable) {
    super()
    this.encoder = new TextEncoder()
    this.writer = writable.getWriter()
    this.lastOperation = Promise.resolve()
  }
  /**
   * @param {string} text
   * @returns {void}
   */
  setOutput(text) {
    this.lastOperation = this.lastOperation.then(() =>
      this.writer.write(this.encoder.encode(text)),
    )
  }
  /**
   * @returns {Promise<void>}
   */
  async end() {
    return this.lastOperation.then(() => this.writer.close())
  }
}

/**
 * @param {string} request
 * @returns {Promise<ReadableStream<Uint8Array>|null>}
 */
async function fetchAndStream(request) {
  let response = await fetch(request, {
    credentials: "include",
  })
  if (!response.ok) {
    throw new Error("Network response was not OK")
  }
  return response.body
}

export class ESIStreamStateWriter extends TransparentStreamStateWriter {
  /**
   * @param {WritableStream} writable
   * @param {(arg0:string) => Promise<ReadableStream<Uint8Array>|null>} fetchFunction
   */
  constructor(writable, fetchFunction = fetchAndStream) {
    super(writable)
    this.suppressOutput = false
    this.fetchFunction = fetchFunction
  }
  /**
   * @param {string} tagname
   * @param {{[s: string]: string}} attribs
   * @param {boolean} selfClosing
   * @returns {void}
   */
  openTag(tagname, attribs, selfClosing) {
    if (tagname === "esi:include" && selfClosing) {
      const streamPromise = this.fetchFunction(attribs.src)
      this.setOutputWithStream(streamPromise)
    } else if (tagname === "esi:remove") {
      this.suppressOutput = true
    } else {
      return super.openTag(tagname, attribs, selfClosing)
    }
  }
  /**
   * @param {string} tagname
   * @returns {void}
   */
  closeTag(tagname) {
    if (tagname === "esi:remove") {
      this.suppressOutput = false
    } else {
      return super.closeTag(tagname)
    }
  }
  /**
   * @param {string} text
   * @returns {void}
   */
  setOutput(text) {
    if (this.suppressOutput) return
    super.setOutput(text)
  }
  /**
   * @param {Promise<ReadableStream<Uint8Array>|null>} streamPromise
   * @returns {void}
   */
  setOutputWithStream(streamPromise) {
    this.lastOperation = this.lastOperation.then(async () => {
      let stream
      try {
        stream = await streamPromise
        if (stream == null) {
          throw new Error("Fetch returned null")
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        this.writer.write(this.encoder.encode(`<!--ESI Error: ${message}-->`))
        return
      }
      let reader = stream.getReader()
      while (true) {
        let { done, value } = await reader.read()
        if (done) break
        this.writer.write(value)
      }
    })
  }
}
