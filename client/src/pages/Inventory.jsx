import { useEffect, useState } from 'react';
import api from '../api/axios';
import { formatCurrency, getStatusBadge, capitalize } from '../utils/helpers';
import { PackagePlus, Search, Edit, TrendingUp, TrendingDown, AlertTriangle, X, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';

const emptyForm = { sku: '', name: '', category_id: '', supplier_id: '', brand: '', model: '', description: '', unit_cost: '', selling_price: '', current_stock: '', min_stock_alert: 5, warranty_months: 12 };

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [stockModal, setStockModal] = useState(null);
  const [stockForm, setStockForm] = useState({ movement_type: 'in', quantity: '', reference: '', notes: '' });
  const limit = 15;

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products', { params: { search, category_id: catFilter, low_stock: lowStock, page, limit } });
      setProducts(res.data.data);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  };

  useEffect(() => { 
    api.get('/products/categories').then(r => setCategories(r.data.data)); 
    api.get('/suppliers', { params: { limit: 100 } }).then(r => setSuppliers(r.data.data));
  }, []);
  useEffect(() => { fetchProducts(); }, [search, catFilter, lowStock, page]);

  const openCreate = () => { setEditProduct(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (p) => {
    setEditProduct(p);
    setForm({ sku: p.sku || '', name: p.name, category_id: p.category_id || '', supplier_id: p.supplier_id || '', brand: p.brand || '', model: p.model || '', description: p.description || '', unit_cost: p.unit_cost, selling_price: p.selling_price, current_stock: p.current_stock, min_stock_alert: p.min_stock_alert, warranty_months: p.warranty_months });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editProduct) {
        await api.put(`/products/${editProduct.id}`, form);
        toast.success('Product updated!');
      } else {
        await api.post('/products', form);
        toast.success('Product added!');
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) { toast.error(err.response?.data?.message || 'Error saving product'); }
    finally { setSaving(false); }
  };

  const handleStockAdjust = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/products/${stockModal.id}/stock`, stockForm);
      toast.success('Stock updated!');
      setStockModal(null);
      fetchProducts();
    } catch (err) { toast.error(err.response?.data?.message || 'Error updating stock'); }
    finally { setSaving(false); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title">Inventory</div>
          <div className="page-header-sub">{total} products</div>
        </div>
        <button id="add-product-btn" className="btn btn-primary" onClick={openCreate}>
          <PackagePlus size={16} /> Add Product
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="search-input-wrap" style={{ margin: 0, maxWidth: 300 }}>
            <Search size={15} />
            <input id="product-search" placeholder="Search products..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="form-control" style={{ width: 160, padding: '8px 12px' }} value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', padding: '0 12px', background: lowStock ? 'var(--danger-bg)' : 'var(--bg)', border: '1.5px solid', borderColor: lowStock ? 'var(--danger)' : 'var(--border)', borderRadius: 'var(--radius-sm)', color: lowStock ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: 600 }}>
              <input type="checkbox" checked={lowStock} onChange={e => { setLowStock(e.target.checked); setPage(1); }} />
              <AlertTriangle size={13} /> Low Stock Only
            </label>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table-pro">
            <thead>
              <tr>
                <th style={{ width: 100 }}>SKU</th>
                <th>PRODUCT DETAILS</th>
                <th>CATEGORY & SUPPLIER</th>
                <th className="text-right">COST (LKR)</th>
                <th className="text-right">PRICE (LKR)</th>
                <th style={{ textAlign: 'center' }}>STOCK</th>
                <th style={{ textAlign: 'center', width: 90 }}>WARRANTY</th>
                <th style={{ textAlign: 'center', width: 100 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8}><div className="loading-wrap"><div className="spinner" /></div></td></tr>}
              {!loading && products.length === 0 && (
                <tr><td colSpan={8}><div className="empty-state"><PackagePlus size={40} /><h3>No products found</h3></div></td></tr>
              )}
              {products.map(p => (
                <tr key={p.id}>
                  <td><span style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: 12 }}>{p.sku || '-'}</span></td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{p.name}</div>
                    {p.model && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}><span style={{ textTransform: 'uppercase', fontSize: 10, marginRight: 4 }}>MDL:</span>{p.model}</div>}
                  </td>
                  <td>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.category_name || '-'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.supplier_name || 'No Supplier'}</div>
                  </td>
                  <td className="text-right" style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{formatCurrency(p.unit_cost)}</td>
                  <td className="text-right" style={{ fontSize: 13, color: '#1a56db', fontWeight: 700 }}>{formatCurrency(p.selling_price)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                      background: p.current_stock <= p.min_stock_alert ? '#fef2f2' : p.current_stock <= p.min_stock_alert * 2 ? '#fffbeb' : '#ecfdf5',
                      color: p.current_stock <= p.min_stock_alert ? '#ef4444' : p.current_stock <= p.min_stock_alert * 2 ? '#f59e0b' : '#10b981',
                      border: `1px solid ${p.current_stock <= p.min_stock_alert ? '#ef4444' : p.current_stock <= p.min_stock_alert * 2 ? '#fbbf24' : '#10b981'}`
                    }}>
                      {p.current_stock} units
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontSize: 12 }}>{p.warranty_months} mo.</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button className="btn btn-ghost btn-sm" title="Stock Adjustment" style={{ padding: '4px 8px' }} onClick={() => { setStockModal(p); setStockForm({ movement_type: 'in', quantity: '', reference: '', notes: '' }); }}>
                        <TrendingUp size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm" title="Edit Product" style={{ padding: '4px 8px' }} onClick={() => openEdit(p)}><Edit size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pagination">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">{editProduct ? 'Edit Product' : 'Add New Product'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">SKU</label>
                    <input className="form-control" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="TV-SAM-43" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Product Name *</label>
                    <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Samsung 43inch TV" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-control" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                      <option value="">Select Category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Supplier</label>
                    <select className="form-control" value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}>
                      <option value="">Select Supplier</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Brand</label>
                    <input className="form-control" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="Samsung" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Model</label>
                    <input className="form-control" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="UA43AU7000" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Cost Price (Rs.)</label>
                    <input type="number" className="form-control" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: e.target.value })} placeholder="0.00" step="0.01" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Selling Price (Rs.)</label>
                    <input type="number" className="form-control" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: e.target.value })} placeholder="0.00" step="0.01" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Opening Stock</label>
                    <input type="number" className="form-control" value={form.current_stock} onChange={e => setForm({ ...form, current_stock: e.target.value })} placeholder="0" disabled={!!editProduct} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Low Stock Alert</label>
                    <input type="number" className="form-control" value={form.min_stock_alert} onChange={e => setForm({ ...form, min_stock_alert: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Warranty (Months)</label>
                    <select className="form-control" value={form.warranty_months} onChange={e => setForm({ ...form, warranty_months: e.target.value })}>
                      {[6, 12, 18, 24, 36, 60].map(m => <option key={m} value={m}>{m} months</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Product description..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editProduct ? 'Update' : 'Add Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {stockModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setStockModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Stock Adjustment — {stockModal.name}</span>
              <button className="modal-close" onClick={() => setStockModal(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleStockAdjust}>
              <div className="modal-body">
                <div style={{ background: 'var(--primary-50)', border: '1.5px solid var(--primary-200)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 18, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Current Stock</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>{stockModal.current_stock} units</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Movement Type</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {['in', 'out', 'adjustment'].map(t => (
                      <label key={t} style={{ flex: 1, padding: '10px', border: '1.5px solid', borderColor: stockForm.movement_type === t ? 'var(--primary)' : 'var(--border)', borderRadius: 'var(--radius-sm)', textAlign: 'center', cursor: 'pointer', background: stockForm.movement_type === t ? 'var(--primary-50)' : 'white', fontWeight: 600, fontSize: 13, color: stockForm.movement_type === t ? 'var(--primary)' : 'var(--text-secondary)' }}>
                        <input type="radio" value={t} checked={stockForm.movement_type === t} onChange={e => setStockForm({ ...stockForm, movement_type: e.target.value })} style={{ display: 'none' }} />
                        {t === 'in' ? <Plus size={14} style={{ verticalAlign: 'middle' }} /> : t === 'out' ? <Minus size={14} style={{ verticalAlign: 'middle' }} /> : null} {capitalize(t)}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input type="number" className="form-control" value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })} required min="1" placeholder={stockForm.movement_type === 'adjustment' ? 'New total quantity' : 'Quantity to add/remove'} />
                </div>
                <div className="form-group">
                  <label className="form-label">Reference</label>
                  <input className="form-control" value={stockForm.reference} onChange={e => setStockForm({ ...stockForm, reference: e.target.value })} placeholder="GRN number, PO number, etc." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setStockModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Updating...' : 'Update Stock'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
