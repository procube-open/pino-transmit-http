# pino-transmit-http 

This project is fork from https://github.com/sventschui/pino-transmit-http.
Thanks for [sventschui](https://github.com/sventschui).

This is a browser transmit for the [Pino](https://github.com/pinojs/pino) logger
that sends log statements created in a browser environment to a remote server using
HTTP calls (fetch or sendBeacon depending on timing).

You can use it like so:

```sh
$ npm install pino @procube/pino-transmit-http
```

```ts
import pino from "pino"
import pinoTransmitHttp from "@procube/pino-transmit-http"

const logger = pino({
  browser: {
    asObject: false,
    transmit: pinoTransmitHttp({throttle: 30000, url: '/operations'})
  }
})

logger.warn({operation: "extends", args: {target: "map", layer: "road"}})
```

A HTTP request will by default look like this, but acutuary format is gzipped msgpack.

```json
POST /operation
Content-Type: application/json

[{"ts":1531919330334, operation: "extends", args: {target: "map", layer: "road"}, "level": "warn"}]
```

Options that can be passed to `pinoTransmitHttp({ ... })`:

key | default | description
--- | --- | ---
throttle | `500` | Amount of milliseconds to throttle the transmission of the log messages. Note that `trailing = true, leading = false` is used. See [lodash.throttle](https://lodash.com/docs#throttle)
debounce | `null` | Amount of milliseconds to debounce the transmission of the log messages. See [lodash.debounce](https://lodash.com/docs#debounce). If null then throttling is used
asJson | false | If set to true, requests will be sent in gzipped JSON format instead of msgpack
url | `'/log'` | location where to send logs
