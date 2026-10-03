import { createServer } from 'vite'
import { openDatabase } from '../server/database.mjs'
import { createApp } from '../server/app.mjs'

const store = openDatabase()
const apiPort = Number(process.env.API_PORT || 8787)
const webPort = Number(process.env.PORT || 8443)
const api = createApp(store, { allowedOrigins: [`http://localhost:${webPort}`, `http://127.0.0.1:${webPort}`] })
let vite
try {
  await new Promise((resolve, reject) => { api.once('error', reject); api.listen(apiPort, '127.0.0.1', resolve) })
  vite = await createServer()
  await vite.listen()
  vite.printUrls()
  console.log(`SQLite ready: ${process.env.DATABASE_PATH || 'data/payroll.sqlite'}`)
} catch (error) {
  console.error(`Could not start payroll app: ${error.message}`)
  api.close(); store.close(); await vite?.close(); process.exit(1)
}
let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  await vite.close()
  api.close(() => { store.close(); process.exit(0) })
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, stop)

