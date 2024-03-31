import throttle from "lodash.throttle"
import debounce from "lodash.debounce"
import { encode } from "@msgpack/msgpack"
import { LoggerOptions, BaseLogger } from "pino"
import { gzip } from 'pako'

interface Options extends LoggerOptions {
    throttle?: number,
    debounce?: number,
    url: string
 }

const defaultOptions: Options = {
    throttle: 500,
    url: "/log"
}

function exception2string(e: any) {
    if (typeof e === "string") {
        return e
    }
    if (e instanceof Error) {
        if (e.stack) {
            return e.stack
        }
        return e.message
    }
    if (typeof e.toString === "function") {
        return e.toString()
    }
    return "Unknown error"
}

export function transmitHttp(
    inOpts: Partial<Options>,
    _logger: BaseLogger,
): Required<Options>["browser"]["transmit"] {
    const opts: Options = { ...defaultOptions, ...inOpts }

    if (
        typeof window === "undefined" ||
        !window.navigator ||
        !window.navigator.sendBeacon
    ) {
        console.error(
            "pino-transmit-http: sendBeacon is not available.",
        )
        return undefined
    }

    let collection: any[] = []
    let isUnloading: boolean = false

    async function rawSend(): Promise<void> {
        if (collection.length === 0) {
            return
        }
        try {
            const data = encode(collection)
            collection = []
            const gzippedBody = gzip(data)
            fetch(opts.url, {
                method: 'POST',
                mode: 'same-origin',
                headers: {
                  'Content-Encoding': 'gzip',
                  'Content-Type': 'application/json'
                },
                body: gzippedBody
              })
        } catch (e) {
            console.error(`pino-transmit-http: failed to send logs: ${exception2string(e)}`)
        }
    }
    function flush() {
        if (collection.length === 0) {
            return
        }
        let data: string = JSON.stringify(collection)
        collection = []

        const success = window.navigator.sendBeacon(opts.url, data) 
        if (!success) {
            console.warn("pino-transmit-http: failed to flush logs using sendBeacon.")
        }
    }
    let send: () => void
    if (opts.debounce !== null && opts.debounce !== undefined) {
        send = debounce(rawSend, opts.debounce)
    } else if (opts.throttle !== null && opts.debounce !== undefined) {
        send = throttle(rawSend, opts.throttle, {
            trailing: true,
            leading: false,
        })
    } else {
        console.warn(
            "pino-transmit-http: Either throttle or debounce option must be passed to pino-transmit-http. Falling back to throttle by %dms",
            defaultOptions.throttle,
        )
        send = throttle(rawSend, defaultOptions.throttle, {
            trailing: true,
            leading: false,
        })
    }

    if (typeof window !== "undefined") {
        window.addEventListener("unload", function onUnload() {
            isUnloading = true // request the rawSend method to send logs synchroneously
            send = flush
            flush() // flush logs, no await as we are in an unload event
        })
    }

    return {
        level: opts.level,
        send: function (_level, logEvent) {
            try {
                collection.push(logEvent)
                send()
            } catch (e) {
                console.error(`pino-transmit-http: Failed to transmit logs: ${exception2string(e)}`)
            }
        },
    }
}
