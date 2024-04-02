import throttle from "lodash.throttle"
import debounce from "lodash.debounce"
import { encode } from "@msgpack/msgpack"
import { LoggerOptions, BaseLogger } from "pino"
import { gzip } from "pako"

interface Options extends LoggerOptions {
    throttle?: number
    debounce?: number
    url: string
}

const defaultOptions: Options = {
    throttle: 500,
    url: "/log",
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

function concatenateUint8Arrays(arrayOfArrays: Uint8Array[]): Uint8Array {
    const totalLength = arrayOfArrays.reduce(
        (total, arr) => total + arr.length,
        0,
    )

    const result = new Uint8Array(totalLength)

    let offset = 0
    for (const arr of arrayOfArrays) {
        result.set(arr, offset)
        offset += arr.length
    }

    return result
}

export default function transmitHttp(
    inOpts: Partial<Options>,
    _logger: BaseLogger,
): Required<Options>["browser"]["transmit"] {
    const opts: Options = { ...defaultOptions, ...inOpts }

    if (
        typeof window === "undefined" ||
        !window.navigator ||
        !window.navigator.sendBeacon
    ) {
        console.error("pino-transmit-http: sendBeacon is not available.")
        return undefined
    }

    let collection: any[] = []

    async function rawSend(): Promise<void> {
        if (collection.length === 0) {
            return
        }
        try {
            console.log(`sending logs: ${JSON.stringify(collection)}`)
            // const collectionData = concatenateUint8Arrays(
            //     collection.map((item) => encode(item)),
            // )
            // const gzippedBody = gzip(encode(collectionData))
            const gzippedBody = gzip(encode(collection))
            collection = []
            await fetch(opts.url, {
                method: "POST",
                mode: "same-origin",
                headers: {
                    "Content-Encoding": "gzip",
                    "Content-Type": "application/msgpack",
                },
                body: gzippedBody,
            })
        } catch (e) {
            console.error(
                `pino-transmit-http: failed to send logs: ${exception2string(
                    e,
                )}`,
            )
        }
    }
    function flush() {
        if (collection.length === 0) {
            return
        }
        console.log(`sending logs as flush: ${JSON.stringify(collection)}`)
        const collectionData = concatenateUint8Arrays(
            collection.map((item) => encode(item)),
        )
        collection = []
        const gzippedBody = gzip(collectionData)
        window.navigator.sendBeacon(opts.url, gzippedBody)
    }
    let send: () => void
    if (opts.debounce !== null && opts.debounce !== undefined) {
        send = debounce(rawSend, opts.debounce)
    } else if (opts.throttle !== null && opts.throttle !== undefined) {
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
            send = flush
            flush() // flush logs, no await as we are in an unload event
        })
        window.addEventListener("resize", function onResize() {
            flush()
        })
    }

    return {
        level: opts.level,
        send: function (_level, logEvent) {
            try {
                collection.push({
                    time: logEvent.ts / 1000,
                    level: logEvent.level.label,
                    ...logEvent.messages[0],
                })
                send()
            } catch (e) {
                console.error(
                    `pino-transmit-http: Failed to transmit logs: ${exception2string(
                        e,
                    )}`,
                )
            }
        },
    }
}
