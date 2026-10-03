import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { get as httpGet } from 'node:http'
import { openDatabase } from '../server/database.mjs'
import { createApp } from '../server/app.mjs'
import { emptyForm } from '../src/records.ts'

async function setup(t) {
  const store = openDatabase(':memory:')
  const server = createApp(store)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); store.close() })
  const url = `http://127.0.0.1:${server.address().port}`
  const request = (path, method = 'GET', body, headers = {}) => fetch(url + path, { method,
    headers: { 'Content-Type': 'application/json', 'X-Payroll-Client': '1', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body) })
  return { request, url }
}

test('API supports save, search, reopen, edit, delete and undo', async t => {
  const { request } = await setup(t)
  assert.equal((await request('/api/health')).status, 200)
  const id = randomUUID()
  const form = { ...emptyForm(), employeeId: 'TEST-1', employeeName: 'API Test', monthlySalary: '30000' }
  const created = await request(`/api/drafts/${id}`, 'PUT', { version: null, form })
  assert.equal(created.status, 200)
  assert.equal((await created.json()).calculation.totals.netPay, 13775)
  const search = await (await request('/api/drafts?q=API')).json()
  assert.equal(search.total, 1)
  assert.equal((await (await request(`/api/drafts/${id}`)).json()).form.employeeName, 'API Test')
  assert.equal((await (await request('/api/employees?q=TEST')).json()).length, 1)
  const changed = await request(`/api/drafts/${id}`, 'PUT', { version: 1, form: { ...form, bonuses: '100' } })
  assert.equal((await changed.json()).version, 2)
  assert.equal((await request(`/api/drafts/${id}`, 'DELETE', { version: 2 })).status, 200)
  assert.equal((await request(`/api/drafts/${id}`)).status, 404)
  assert.equal((await request(`/api/drafts/${id}/restore`, 'POST', { version: 3 })).status, 200)
})

test('API reports field errors, missing resources and invalid request data', async t => {
  const { request, url } = await setup(t)
  const response = await request(`/api/drafts/${randomUUID()}`, 'PUT', { version: null, form: emptyForm() })
  assert.equal(response.status, 422)
  assert.ok((await response.json()).fields.employeeName)
  assert.equal((await request('/api/drafts?offset=-1')).status, 400)
  assert.equal((await request(`/api/drafts/${randomUUID()}`)).status, 404)
  const malformed = await fetch(`${url}/api/drafts/${randomUUID()}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Payroll-Client': '1' }, body: '{broken' })
  assert.equal(malformed.status, 400)
  assert.equal((await request(`/api/drafts/${randomUUID()}`, 'PUT', null)).status, 400)
})

test('cross-origin requests and unmarked mutations are rejected', async t => {
  const { request, url } = await setup(t)
  assert.equal((await request('/api/drafts', 'GET', undefined, { Origin: 'https://untrusted.example' })).status, 403)
  assert.equal((await request('/api/drafts', 'GET', undefined, { 'Sec-Fetch-Site': 'cross-site' })).status, 403)
  const invalidHostStatus = await new Promise((resolve, reject) => {
    httpGet(`${url}/api/drafts`, { headers: { Host: 'untrusted.example' } }, response => {
      response.resume(); resolve(response.statusCode)
    }).on('error', reject)
  })
  assert.equal(invalidHostStatus, 403)
  const response = await fetch(`${url}/api/drafts/${randomUUID()}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  assert.equal(response.status, 403)
})
