import { backup } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { openDatabase } from '../server/database.mjs'

const store = openDatabase()
const folder = resolve(process.env.BACKUP_DIR || 'backups')
mkdirSync(folder, { recursive: true })
const destination = resolve(folder, `payroll-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`)
try { await backup(store.db, destination); console.log(`Backup saved: ${destination}`) } finally { store.close() }

