import { openDatabase } from './database.mjs'
import { createApp } from './app.mjs'

const store = openDatabase()
const port = Number(process.env.API_PORT || process.env.PORT || 8787)
const host = process.env.HOST || '127.0.0.1'
const allowedOrigins = (process.env.APP_ORIGIN || `http://localhost:${port},http://127.0.0.1:${port}`).split(',')
const server = createApp(store, { staticDir: 'dist', allowedOrigins })
server.on('error', error => { console.error(`Could not start payroll server: ${error.message}`); store.close(); process.exit(1) })
server.listen(port, host, () => console.log(`Payroll app: http://${host}:${port}\nSQLite: ${process.env.DATABASE_PATH || 'data/payroll.sqlite'}`))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { store.close(); process.exit(0) }))

