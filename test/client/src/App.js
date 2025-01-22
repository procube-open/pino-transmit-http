import logo from "./logo.svg"
import "./App.css"
import pino from "pino"
import pinoTransmitHttp from "@procube/pino-transmit-http"

const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
const logger = pino({
  browser: {
    asObject: false,
    transmit: pinoTransmitHttp({throttle: 30000, url: '/operations'})
  }
})
const logger_vector = pino({
  browser: {
    asObject: false,
    transmit: pinoTransmitHttp({throttle: 30000, url: '/operations/vector', asJson: true})
  }
})

async function log() {
  logger.info({msg: "Hello, World!", operation: "start"})
  logger_vector.info({msg: "Hello, World!", operation: "start"})
  await sleep(1000)
  logger.info({msg: "Working now. 1000", operation: "update"})
  logger_vector.info({msg: "Working now. 1000", operation: "update"})
  await sleep(1000)
  logger.info({msg: "Working now. 2000", operation: "update"})
  logger_vector.info({msg: "Working now. 2000", operation: "update"})
  await sleep(30000)
  logger.info({msg: "Working now. 33000", operation: "update"})
  logger_vector.info({msg: "Working now. 33000", operation: "update"})
  await sleep(1000)
  logger.info({msg: "Working now. 34000", operation: "update"})
  logger_vector.info({msg: "Working now. 34000", operation: "update"})
}

let started = false

function App() {
    if (!started) {
        started = true
        log()
    }
    return (
        <div className="App">
            <header className="App-header">
                <img src={logo} className="App-logo" alt="logo" />
                <p>
                    Edit <code>src/App.js</code> and save to reload.
                </p>
                <a
                    className="App-link"
                    href="https://reactjs.org"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Learn React
                </a>
            </header>
        </div>
    )
}

export default App
