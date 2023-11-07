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
