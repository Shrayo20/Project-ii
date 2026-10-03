import { useDeferredValue, useEffect, useState, type FormEvent } from 'react'
import {
  Activity,
  ArrowUpRight,
  Boxes,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  LayoutDashboard,
  LoaderCircle,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'
import './App.css'

type Product = {
  id: string
  name: string
  sku: string
  category: string
  quantity: number
  minStock: number
  price: number
  updatedAt: string
}

type ProductDraft = Omit<Product, 'id' | 'updatedAt'>
type View = 'Overview' | 'Inventory' | 'Low stock'

const emptyDraft: ProductDraft = {
  name: '',
  sku: '',
  category: 'Accessories',
  quantity: 0,
  minStock: 5,
  price: 0,
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

function stockStatus(product: Product) {
  if (product.quantity === 0) return 'Out of stock'
  if (product.quantity <= product.minStock) return 'Low stock'
  return 'In stock'
}

function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [view, setView] = useState<View>('Overview')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [sortNewest, setSortNewest] = useState(true)
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft)
  const [saving, setSaving] = useState(false)

  async function loadProducts() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/products')
      if (!response.ok) throw new Error('Could not reach the inventory API.')
      setProducts((await response.json()) as Product[])
    } catch {
      setError('Inventory data could not be loaded. Check that the API server is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProducts()
  }, [])

  const lowStockCount = products.filter((product) => product.quantity <= product.minStock).length
  const totalUnits = products.reduce((total, product) => total + product.quantity, 0)
  const inventoryValue = products.reduce((total, product) => total + product.quantity * product.price, 0)
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date()).toUpperCase()
  const filteredProducts = products.filter((product) => {
    const matchesSearch = `${product.name} ${product.sku} ${product.category}`
      .toLowerCase()
      .includes(deferredSearch.toLowerCase())
    const matchesView = view !== 'Low stock' || product.quantity <= product.minStock
    return matchesSearch && matchesView
  }).sort((first, second) => {
    const difference = Date.parse(first.updatedAt) - Date.parse(second.updatedAt)
    return sortNewest ? -difference : difference
  })

  function openNewProduct() {
    setEditing(null)
    setDraft(emptyDraft)
    setOpenMenuId(null)
    setModalOpen(true)
  }

  function openEditProduct(product: Product) {
    setEditing(product)
    setOpenMenuId(null)
    setModalOpen(true)
    setDraft({
      name: product.name,
      sku: product.sku,
      category: product.category,
      quantity: product.quantity,
      minStock: product.minStock,
      price: product.price,
    })
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await fetch(editing ? `/api/products/${editing.id}` : '/api/products', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const result = (await response.json()) as Product | { error: string }
      if (!response.ok) throw new Error('error' in result ? result.error : 'Could not save product.')
      const savedProduct = result as Product
      setProducts((current) => editing
        ? current.map((product) => product.id === savedProduct.id ? savedProduct : product)
        : [savedProduct, ...current])
      setEditing(null)
      setModalOpen(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save product.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Remove ${product.name} from inventory?`)) return
    try {
      const response = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Could not remove product.')
      setProducts((current) => current.filter((item) => item.id !== product.id))
      setError('')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not remove product.')
    }
  }

  function exportInventory() {
    const rows = [
      ['Name', 'SKU', 'Category', 'Quantity', 'Minimum stock', 'Unit price'],
      ...filteredProducts.map((product) => [
        product.name,
        product.sku,
        product.category,
        String(product.quantity),
        String(product.minStock),
        product.price.toFixed(2),
      ]),
    ]
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = 'stockroom-inventory.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={() => setView('Overview')}>
          <span className="brand-mark"><Boxes size={19} strokeWidth={2.3} /></span>
          <span>stockroom<span className="brand-period">.</span></span>
        </a>

        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-switcher">
          <span className="workspace-avatar">N</span>
          <span className="workspace-name">Northstar Goods<small>Free workspace</small></span>
          <ChevronDown size={15} />
        </div>

        <div className="nav-label">MENU</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button className={view === 'Overview' ? 'nav-item active' : 'nav-item'} onClick={() => setView('Overview')}>
            <LayoutDashboard size={17} /> Overview
          </button>
          <button className={view === 'Inventory' ? 'nav-item active' : 'nav-item'} onClick={() => setView('Inventory')}>
            <Package size={17} /> Inventory <span className="nav-count">{products.length}</span>
          </button>
          <button className={view === 'Low stock' ? 'nav-item active' : 'nav-item'} onClick={() => setView('Low stock')}>
            <TriangleAlert size={17} /> Low stock {lowStockCount > 0 && <span className="nav-alert">{lowStockCount}</span>}
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-callout">
            <span className="callout-icon"><Sparkles size={15} /></span>
            <strong>Stay ahead of stockouts</strong>
            <p>Review low-stock items before your next reorder.</p>
            <button onClick={() => setView('Low stock')}>View alerts <ArrowUpRight size={13} /></button>
          </div>
          <button className="help-link"><CircleHelp size={16} /> Help & support</button>
          <button className="profile-row">
            <span className="profile-avatar">JD</span>
            <span>Jordan Davis<small>Store owner</small></span>
            <MoreHorizontal size={17} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{view}</strong></div>
          <div className="topbar-actions">
            <span className={`api-status ${error ? 'api-offline' : ''}`}><span /> {error ? 'API offline' : 'Live inventory'}</span>
            <button className="icon-button top-help" title="Help" aria-label="Help"><CircleHelp size={17} /></button>
            <button className="profile-avatar top-avatar" aria-label="Jordan Davis profile">JD</button>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="date-label"><span className="date-dot" /> {dateLabel}</div>
              <h1>{view === 'Low stock' ? 'Low stock' : 'Good morning, Jordan'}<span className="heading-period">.</span></h1>
              <p className="page-subtitle">{view === 'Low stock' ? 'Items that need a reorder soon.' : 'Here’s what’s happening with your inventory today.'}</p>
            </div>
            <div className="heading-actions">
              <button className="button button-secondary" onClick={exportInventory}><Download size={15} /> Export</button>
              <button className="button button-primary" onClick={openNewProduct}><Plus size={16} /> Add product</button>
            </div>
          </section>

          {error && <div className="error-banner" role="alert"><TriangleAlert size={16} /> {error}<button onClick={() => void loadProducts()}>Try again</button></div>}

          <section className="stats-grid" aria-label="Inventory summary">
            <article className="stat-card">
              <div className="stat-top"><span className="stat-icon icon-green"><Package size={17} /></span><span className="stat-trend trend-green">Catalog</span></div>
              <p className="stat-label">Total products</p><div className="stat-value">{products.length}<span className="stat-unit"> items</span></div><p className="stat-foot">Across your catalog</p>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span className="stat-icon icon-blue"><Boxes size={17} /></span><span className="stat-trend trend-green">On hand</span></div>
              <p className="stat-label">Units in stock</p><div className="stat-value">{totalUnits.toLocaleString()}</div><p className="stat-foot">Ready to fulfill</p>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span className="stat-icon icon-amber"><TriangleAlert size={17} /></span><span className="stat-trend trend-muted">Needs attention</span></div>
              <p className="stat-label">Low stock items</p><div className="stat-value">{lowStockCount}<span className="stat-unit"> items</span></div><p className="stat-foot">At or below minimum level</p>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span className="stat-icon icon-coral"><Activity size={17} /></span><span className="stat-trend trend-green">Retail value</span></div>
              <p className="stat-label">Stock value</p><div className="stat-value">{currency.format(inventoryValue)}</div><p className="stat-foot">At current unit prices</p>
            </article>
          </section>

          <section className="inventory-panel">
            <div className="panel-heading">
              <div><div className="panel-title-row"><h2>{view === 'Low stock' ? 'Reorder attention' : 'Your inventory'}</h2><span className="item-count">{filteredProducts.length}</span></div><p>Keep your catalog organized and up to date.</p></div>
              <button className="icon-button more-button" title="More inventory options" aria-label="More inventory options"><MoreHorizontal size={19} /></button>
            </div>
            <div className="table-toolbar">
              <label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, SKU..." /></label>
              <div className="table-controls"><button className="filter-button" onClick={() => setView(view === 'Low stock' ? 'Inventory' : 'Low stock')}><SlidersHorizontal size={15} /> Filter <span className="filter-indicator" /></button><button className="sort-button" onClick={() => setSortNewest(!sortNewest)}>{sortNewest ? 'Recently updated' : 'Oldest updated'} <ChevronDown size={14} /></button></div>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th className="product-column">PRODUCT</th><th>SKU</th><th>CATEGORY</th><th>STOCK LEVEL</th><th>UNIT PRICE</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={7} className="loading-cell"><LoaderCircle size={19} className="spin" /> Loading inventory...</td></tr> : filteredProducts.map((product, index) => {
                    const status = stockStatus(product)
                    const stockPercent = Math.min(100, Math.round(product.quantity / Math.max(product.minStock * 3, 1) * 100))
                    return <tr key={product.id} className="product-row" style={{ animationDelay: `${index * 35}ms` }}>
                      <td><div className="product-cell"><span className={`product-thumb thumb-${product.category.toLowerCase().replace(/[^a-z]/g, '-')}`}><Package size={18} /></span><span className="product-info"><strong>{product.name}</strong><small>Updated {new Date(product.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small></span></div></td>
                      <td><span className="sku-text">{product.sku}</span></td>
                      <td><span className="category-label"><Tag size={12} />{product.category}</span></td>
                      <td><div className="stock-cell"><div className="stock-number"><strong>{product.quantity}</strong><span> / {product.minStock} min</span></div><span className={`stock-meter ${status === 'In stock' ? 'meter-good' : 'meter-low'}`}><span style={{ width: `${stockPercent}%` }} /></span></div></td>
                      <td><span className="price-text">{currency.format(product.price)}</span></td>
                      <td><span className={`status-pill ${status === 'In stock' ? 'status-good' : status === 'Low stock' ? 'status-low' : 'status-out'}`}><span />{status}</span></td>
                      <td><div className={`row-actions ${openMenuId === product.id ? 'menu-open' : ''}`}><button className="icon-button row-action" title={`Actions for ${product.name}`} aria-label={`Actions for ${product.name}`} aria-expanded={openMenuId === product.id} onClick={() => setOpenMenuId(openMenuId === product.id ? null : product.id)}><MoreHorizontal size={17} /></button><div className="action-menu"><button onClick={() => openEditProduct(product)}><Package size={14} /> Edit product</button><button className="delete-action" onClick={() => { setOpenMenuId(null); void deleteProduct(product) }}><Trash2 size={14} /> Remove</button></div></div></td>
                    </tr>
                  })}
                  {!loading && filteredProducts.length === 0 && <tr><td colSpan={7} className="empty-cell"><span className="empty-icon"><Package size={21} /></span><strong>{search ? 'No matching products' : 'Nothing to show here'}</strong><span>{search ? 'Try a different name, SKU, or category.' : 'Add a product to start building your inventory.'}</span>{!search && <button className="button button-primary" onClick={openNewProduct}><Plus size={15} /> Add product</button>}</td></tr>}
                </tbody>
              </table>
            </div>
            <footer className="table-footer"><span>Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> products</span></footer>
          </section>

          <footer className="page-footer"><span>Last synced just now</span><span><span className="sync-dot" /> All changes saved</span></footer>
        </div>
      </main>

      {modalOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setEditing(null); setModalOpen(false) } }}>
        <section className="product-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal-heading"><div><span className="modal-kicker">CATALOG</span><h2 id="modal-title">{editing ? 'Edit product' : 'Add a product'}</h2></div><button className="icon-button" onClick={() => { setEditing(null); setModalOpen(false) }} aria-label="Close dialog"><X size={18} /></button></div>
          <form onSubmit={(event) => { void saveProduct(event) }}>
            <label className="form-field">Product name<input required maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Canvas Weekender" /></label>
            <div className="form-row"><label className="form-field">SKU<input required maxLength={40} value={draft.sku} onChange={(event) => setDraft({ ...draft, sku: event.target.value })} placeholder="e.g. BAG-014" /></label><label className="form-field">Category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option>Accessories</option><option>Apparel</option><option>Home goods</option><option>Electronics</option><option>Stationery</option></select></label></div>
            <div className="form-row"><label className="form-field">Quantity<input required type="number" min="0" step="1" value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: Number(event.target.value) })} /></label><label className="form-field">Minimum stock<input required type="number" min="0" step="1" value={draft.minStock} onChange={(event) => setDraft({ ...draft, minStock: Number(event.target.value) })} /></label></div>
            <label className="form-field">Unit price<input required type="number" min="0" step="0.01" value={draft.price} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} /></label>
            <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => { setEditing(null); setModalOpen(false) }}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}{editing ? 'Save changes' : 'Add product'}</button></div>
          </form>
        </section>
      </div>}
    </div>
  )
}

export default App