import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { HttpError } from './database.mjs'

const json = (res, status, value) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(value))
}
async function readBody(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415, 'Send the form as JSON.')
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 32_768) throw new HttpError(413, 'This payroll form is too large.')
    chunks.push(chunk)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new HttpError(400, 'The request contains invalid JSON.') }
}

export function createApp(store, { staticDir, allowedOrigins = [] } = {}) {
  return createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'same-origin')
    try {
      const url = new URL(req.url, 'http://localhost')
      if (url.pathname.startsWith('/api/')) {
        const localPort = req.socket.localPort
        const hosts = [`127.0.0.1:${localPort}`, `localhost:${localPort}`, `[::1]:${localPort}`,
          ...allowedOrigins.map(value => new URL(value.trim()).host)]
        if (!hosts.includes(req.headers.host)) throw new HttpError(403, 'This host is not configured for the payroll app.')
        const origin = req.headers.origin
        const ownOrigin = `http://${req.headers.host}`
        if (req.headers['sec-fetch-site'] === 'cross-site' || origin && origin !== ownOrigin && !allowedOrigins.includes(origin)) {
          throw new HttpError(403, 'This request must come from the payroll app.')
        }
        if (!['GET', 'HEAD'].includes(req.method) && req.headers['x-payroll-client'] !== '1') {
          throw new HttpError(403, 'This request must come from the payroll app.')
        }
        if (url.pathname === '/api/health' && req.method === 'GET') {
          store.db.prepare('SELECT 1').get()
          return json(res, 200, { status: 'ok' })
        }
        if (url.pathname === '/api/employees' && req.method === 'GET') return json(res, 200, store.employees((url.searchParams.get('q') || '').slice(0, 120)))
        if (url.pathname === '/api/drafts' && req.method === 'GET') {
          const offset = Number(url.searchParams.get('offset') || 0)
          if (!Number.isSafeInteger(offset) || offset < 0) throw new HttpError(400, 'Invalid page offset.')
          return json(res, 200, store.list((url.searchParams.get('q') || '').slice(0, 120), offset))
        }
        const match = url.pathname.match(/^\/api\/drafts\/([a-f0-9-]{36})(\/restore)?$/)
        if (match) {
          const id = match[1]
          if (req.method === 'GET' && !match[2]) return json(res, 200, store.get(id))
          if (req.method === 'PUT' && !match[2]) {
            const body = await readBody(req)
            if (!body || typeof body !== 'object') throw new HttpError(400, 'Enter a payroll form.')
            return json(res, 200, store.save(id, body.version, body.form))
          }
          if (req.method === 'DELETE' && !match[2]) return json(res, 200, store.remove(id, (await readBody(req))?.version))
          if (req.method === 'POST' && match[2]) return json(res, 200, store.restore(id, (await readBody(req))?.version))
          throw new HttpError(405, 'This action is not supported.')
        }
        throw new HttpError(404, 'This API endpoint does not exist.')
      }
      if (!staticDir || !['GET', 'HEAD'].includes(req.method)) throw new HttpError(404, 'Page not found.')
      const pathname = decodeURIComponent(url.pathname)
      const root = resolve(staticDir)
      const filename = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname))
      if (!filename.startsWith(root + sep)) throw new HttpError(404, 'Page not found.')
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' }
      if (!types[extname(filename)]) throw new HttpError(404, 'Page not found.')
      let content
      try { content = await readFile(filename) } catch { throw new HttpError(404, 'Page not found. Run npm run build before starting the app.') }
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'")
      res.writeHead(200, { 'Content-Type': types[extname(filename)], 'Cache-Control': extname(filename) === '.html' ? 'no-cache' : 'public, max-age=3600' })
      res.end(req.method === 'HEAD' ? undefined : content)
    } catch (error) {
      if (res.headersSent) { res.end(); return }
      if (error instanceof HttpError) return json(res, error.status, { error: error.message, fields: error.fields })
      console.error('Payroll request failed:', error.message)
      json(res, 500, { error: 'The database is temporarily unavailable. Your form has not been cleared. Please try again.' })
    }
  })
}
