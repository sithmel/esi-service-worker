class AsyncStreamWriter {
  constructor(writable) {
    this.writer = writable.getWriter()
    this.open = true
  }
  close() {
    this.open = false
  }
}
