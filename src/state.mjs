export class TransparentStateWriter {
  constructor() {
    this.output = ""
  }
  openTag(tagname, attribs, selfClosing) {
    const attributes = Object.entries(attribs).reduce((acc, [attr, value]) => {
      return acc + ` ${attr}="${value}"`
    }, "")
    this.setOutput(`<${tagname}${attributes}${selfClosing ? " />" : ">"}`)
  }
  closeTag(tagname) {
    this.setOutput(`</${tagname}>`)
  }
  setOutput(text) {
    this.output += text
  }
  end() {
    return Promise.resolve()
  }
}

export class TransparentStreamStateWriter extends TransparentStateWriter {
  constructor(writable) {
    super()
    this.encoder = new TextEncoder()
    this.writer = writable.getWriter()
    this.lastOperation = Promise.resolve()
  }
  setOutput(text) {
    this.lastOperation = this.lastOperation.then(() =>
      this.writer.write(this.encoder.encode(text)),
    )
  }
  async end() {
    return this.lastOperation.then(() => this.writer.close())
  }
}

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
  constructor(writable, fetchFunction = fetchAndStream) {
    super(writable)
    this.suppressOutput = false
    this.fetchFunction = fetchFunction
  }
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
  closeTag(tagname) {
    if (tagname === "esi:remove") {
      this.suppressOutput = false
    } else {
      return super.closeTag(tagname)
    }
  }
  setOutput(text) {
    if (this.suppressOutput) return Promise.resolve()
    return super.setOutput(text)
  }
  setOutputWithStream(streamPromise) {
    this.lastOperation = this.lastOperation.then(async () => {
      let stream
      try {
        stream = await streamPromise
      } catch (err) {
        this.writer.write(
          this.encoder.encode(`<!--ESI Error: ${err.message}-->`),
        )
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
