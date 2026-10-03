import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'

const app = express()
const port = Number(process.env.PORT) || 3001
const dataPath = join(dirname(fileURLToPath(import.meta.url)), 'data', 'products.json')

app.use(express.json({ limit: '32kb' }))

async function readProducts() {
  return JSON.parse(await readFile(dataPath, 'utf8'))
}

async function writeProducts(products) {
  await writeFile(dataPath, `${JSON.stringify(products, null, 2)}\n`)
}

function validateProduct(body) {
  const input = body && typeof body === 'object' ? body : {}
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const sku = typeof input.sku === 'string' ? input.sku.trim().toUpperCase() : ''
  const category = typeof input.category === 'string' ? input.category.trim() : ''
  const quantity = Number(input.quantity)
  const minStock = Number(input.minStock)
  const price = Number(input.price)

  if (!name || !sku || !category) return { error: 'Name, SKU, and category are required.' }
  if (!Number.isInteger(quantity) || quantity < 0) return { error: 'Quantity must be a non-negative whole number.' }
  if (!Number.isInteger(minStock) || minStock < 0) return { error: 'Minimum stock must be a non-negative whole number.' }
  if (!Number.isFinite(price) || price < 0) return { error: 'Price must be a non-negative number.' }

  return { product: { name, sku, category, quantity, minStock, price } }
}

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.get('/api/products', async (_request, response, next) => {
  try {
    response.json(await readProducts())
  } catch (error) {
    next(error)
  }
})

app.post('/api/products', async (request, response, next) => {
  try {
    const { product, error } = validateProduct(request.body)
    if (error) return response.status(400).json({ error })

    const products = await readProducts()
    if (products.some((item) => item.sku.toLowerCase() === product.sku.toLowerCase())) {
      return response.status(409).json({ error: 'That SKU is already in use.' })
    }

    const created = { id: randomUUID(), ...product, updatedAt: new Date().toISOString() }
    products.unshift(created)
    await writeProducts(products)
    response.status(201).json(created)
  } catch (error) {
    next(error)
  }
})

app.put('/api/products/:id', async (request, response, next) => {
  try {
    const { product, error } = validateProduct(request.body)
    if (error) return response.status(400).json({ error })

    const products = await readProducts()
    const index = products.findIndex((item) => item.id === request.params.id)
    if (index === -1) return response.status(404).json({ error: 'Product not found.' })
    if (products.some((item) => item.id !== request.params.id && item.sku.toLowerCase() === product.sku.toLowerCase())) {
      return response.status(409).json({ error: 'That SKU is already in use.' })
    }

    const updated = { id: request.params.id, ...product, updatedAt: new Date().toISOString() }
    products[index] = updated
    await writeProducts(products)
    response.json(updated)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/products/:id', async (request, response, next) => {
  try {
    const products = await readProducts()
    const remaining = products.filter((item) => item.id !== request.params.id)
    if (remaining.length === products.length) return response.status(404).json({ error: 'Product not found.' })
    await writeProducts(remaining)
    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ error: 'An unexpected server error occurred.' })
})

app.listen(port, () => {
  console.log(`Stockroom API listening on http://localhost:${port}`)
})