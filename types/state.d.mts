export class TransparentStateWriter {
    output: string;
    /**
     * @param {string} tagname
     * @param {{[s: string]: string}} attribs
     * @param {boolean} selfClosing
     * @returns {void}
     */
    openTag(tagname: string, attribs: {
        [s: string]: string;
    }, selfClosing: boolean): void;
    /**
     * @param {string} tagname
     * @returns {void}
     */
    closeTag(tagname: string): void;
    /**
     * @param {string} text
     * @returns {void}
     */
    setOutput(text: string): void;
    /**
     * @returns {Promise<void>}
     */
    end(): Promise<void>;
}
export class TransparentStreamStateWriter extends TransparentStateWriter {
    /**
     * @param {WritableStream} writable
     */
    constructor(writable: WritableStream);
    encoder: TextEncoder;
    writer: WritableStreamDefaultWriter<any>;
    lastOperation: Promise<void>;
}
export class ESIStreamStateWriter extends TransparentStreamStateWriter {
    /**
     * @param {WritableStream} writable
     * @param {(arg0:string) => Promise<ReadableStream<Uint8Array>|null>} fetchFunction
     */
    constructor(writable: WritableStream, fetchFunction?: (arg0: string) => Promise<ReadableStream<Uint8Array> | null>);
    suppressOutput: boolean;
    fetchFunction: (arg0: string) => Promise<ReadableStream<Uint8Array> | null>;
    /**
     * @param {Promise<ReadableStream<Uint8Array>|null>} streamPromise
     * @returns {void}
     */
    setOutputWithStream(streamPromise: Promise<ReadableStream<Uint8Array> | null>): void;
}
//# sourceMappingURL=state.d.mts.map