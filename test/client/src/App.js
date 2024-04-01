import logo from "./logo.svg"
import "./App.css"
import pino from "pino"
import pinoTransmitHttp from "@procube/pino-transmit-http"

const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
const logger = pino({
  browser: {
    transmit: pinoTransmitHttp({throttle: 30000, url: '/logs'})
  }
})

async function log() {
  logger.info({msg: "Hello, World!", operation: "start"})
  await sleep(1000)
  logger.info({msg: "Working now. 1000", operation: "update"})
  await sleep(30000)
  logger.info({msg: "Working now. 31000", operation: "update"})
  await sleep(1000)
  logger.info({msg: "Working now. 32000", operation: "update"})
} 

function App() {
    log()
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
