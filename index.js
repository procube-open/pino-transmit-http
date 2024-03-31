"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transmitHttp = void 0;
const lodash_throttle_1 = __importDefault(require("lodash.throttle"));
const lodash_debounce_1 = __importDefault(require("lodash.debounce"));
const msgpack_1 = require("@msgpack/msgpack");
const pako_1 = require("pako");
const defaultOptions = {
    throttle: 500,
    url: "/log"
};
function exception2string(e) {
    if (typeof e === "string") {
        return e;
    }
    if (e instanceof Error) {
        if (e.stack) {
            return e.stack;
        }
        return e.message;
    }
    if (typeof e.toString === "function") {
        return e.toString();
    }
    return "Unknown error";
}
function transmitHttp(inOpts, _logger) {
    const opts = Object.assign(Object.assign({}, defaultOptions), inOpts);
    if (typeof window === "undefined" ||
        !window.navigator ||
        !window.navigator.sendBeacon) {
        console.error("pino-transmit-http: sendBeacon is not available.");
        return undefined;
    }
    let collection = [];
    let isUnloading = false;
    function rawSend() {
        return __awaiter(this, void 0, void 0, function* () {
            if (collection.length === 0) {
                return;
            }
            try {
                const data = (0, msgpack_1.encode)(collection);
                collection = [];
                const gzippedBody = (0, pako_1.gzip)(data);
                fetch(opts.url, {
                    method: 'POST',
                    mode: 'same-origin',
                    headers: {
                        'Content-Encoding': 'gzip',
                        'Content-Type': 'application/json'
                    },
                    body: gzippedBody
                });
            }
            catch (e) {
                console.error(`pino-transmit-http: failed to send logs: ${exception2string(e)}`);
            }
        });
    }
    function flush() {
        if (collection.length === 0) {
            return;
        }
        let data = JSON.stringify(collection);
        collection = [];
        const success = window.navigator.sendBeacon(opts.url, data);
        if (!success) {
            console.warn("pino-transmit-http: failed to flush logs using sendBeacon.");
        }
    }
    let send;
    if (opts.debounce !== null && opts.debounce !== undefined) {
        send = (0, lodash_debounce_1.default)(rawSend, opts.debounce);
    }
    else if (opts.throttle !== null && opts.debounce !== undefined) {
        send = (0, lodash_throttle_1.default)(rawSend, opts.throttle, {
            trailing: true,
            leading: false,
        });
    }
    else {
        console.warn("pino-transmit-http: Either throttle or debounce option must be passed to pino-transmit-http. Falling back to throttle by %dms", defaultOptions.throttle);
        send = (0, lodash_throttle_1.default)(rawSend, defaultOptions.throttle, {
            trailing: true,
            leading: false,
        });
    }
    if (typeof window !== "undefined") {
        window.addEventListener("unload", function onUnload() {
            isUnloading = true; // request the rawSend method to send logs synchroneously
            send = flush;
            flush(); // flush logs, no await as we are in an unload event
        });
    }
    return {
        level: opts.level,
        send: function (_level, logEvent) {
            try {
                collection.push(logEvent);
                send();
            }
            catch (e) {
                console.error(`pino-transmit-http: Failed to transmit logs: ${exception2string(e)}`);
            }
        },
    };
}
exports.transmitHttp = transmitHttp;
