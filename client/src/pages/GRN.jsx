import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { formatCurrency, formatDate, capitalize, today } from '../utils/helpers';
import { Container, Search, Plus, Eye, X, Trash2, ChevronRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GRN() {
  const [grns, setGrns] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [viewId, setViewId] = useState(null);
  const limit = 15;

  const fetchGRNs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/grn', { params: { search, page, limit } });
      setGrns(res.data.data);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load GRNs'); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchGRNs(); }, [fetchGRNs]);

  if (viewId) return <GRNDetail id={viewId} onBack={() => { setViewId(null); fetchGRNs(); }} />;
  if (showCreate) return <CreateGRN onClose={() => { setShowCreate(false); fetchGRNs(); }} />;

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="page-header">
        <div><div className="page-header-title">Goods Received Note (GRN)</div><div className="page-header-sub">{total} GRNs recorded</div></div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={15} /> Create GRN</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-input-wrap" style={{ margin: 0, maxWidth: 300 }}>
            <Search size={14} />
            <input placeholder="Search GRN / supplier..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table-pro">
            <thead><tr><th style={{width: 120}}>GRN NO.</th><th>SUPPLIER DETAILS</th><th>DATE RECVD.</th><th>INV REFERENCE</th><th className="text-right">TOTAL AMOUNT (LKR)</th><th style={{textAlign: 'center', width: 100}}>STATUS</th><th style={{width: 40}}></th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7}><div className="loading-wrap"><div className="spinner" /></div></td></tr>}
              {!loading && grns.length === 0 && <tr><td colSpan={7}><div className="empty-state"><Container size={40} /><h3>No GRNs found</h3></div></td></tr>}
              {grns.map(g => (
                <tr key={g.id} style={{ cursor: 'pointer' }} onClick={() => setViewId(g.id)}>
                  <td><span style={{fontWeight: 700, color: '#1a56db', fontSize: 13}}>{g.grn_number}</span></td>
                  <td>
                    <div style={{fontWeight: 700, color: 'var(--text)', fontSize: 13}}>{g.supplier_name}</div>
                    <div style={{fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace'}}>{g.supplier_code}</div>
                  </td>
                  <td>
                    <div style={{fontWeight: 600}}>{formatDate(g.grn_date)}</div>
                  </td>
                  <td>
                    <div style={{fontFamily: 'monospace', fontSize: 12}}>{g.invoice_number || '-'}</div>
                  </td>
                  <td className="text-right">
                    <span style={{fontWeight: 700, fontSize: 13, color: 'var(--text)'}}>
                      {formatCurrency(g.total_amount)}
                    </span>
                  </td>
                  <td style={{textAlign: 'center'}}>
                    <span style={{
                      display: 'inline-block', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      background: g.status === 'paid' ? '#ecfdf5' : g.status === 'partial' ? '#fffbeb' : '#f8fafc',
                      color: g.status === 'paid' ? '#059669' : g.status === 'partial' ? '#d97706' : 'var(--text-secondary)',
                      border: `1px solid ${g.status === 'paid' ? '#10b981' : g.status === 'partial' ? '#fbbf24' : '#cbd5e1'}`
                    }}>
                      {g.status}
                    </span>
                  </td>
                  <td style={{textAlign: 'center'}}><ChevronRight size={16} style={{ color: '#cbd5e1' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && <div className="pagination">{Array.from({ length: totalPages }, (_, i) => i + 1).map(p => <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>)}</div>}
      </div>
    </div>
  );
}

// ─── CREATE GRN ────────────────────────────────────────────────────────────
function CreateGRN({ onClose }) {
  const [step, setStep] = useState(1);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [supSearch, setSupSearch] = useState('');
  const [prodSearch, setProdSearch] = useState('');
  
  const [form, setForm] = useState({ supplier_id: '', grn_date: today(), invoice_number: '', discount: 0, notes: '' });
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (supSearch.length >= 1) api.get('/suppliers', { params: { search: supSearch, limit: 8 } }).then(r => setSuppliers(r.data.data));
  }, [supSearch]);

  useEffect(() => {
    api.get('/products', { params: { search: prodSearch, limit: 10 } }).then(r => setProducts(r.data.data));
  }, [prodSearch]);

  const addItem = (prod) => {
    const existing = items.find(i => i.product_id === prod.id);
    if (existing) {
      setItems(items.map(i => i.product_id === prod.id ? { ...i, quantity: i.quantity + 1, total_cost: (i.quantity + 1) * i.unit_cost } : i));
    } else {
      setItems([...items, { product_id: prod.id, name: prod.name, brand: prod.brand, sku: prod.sku, unit_cost: prod.unit_cost, quantity: 1, total_cost: prod.unit_cost }]);
    }
  };

  const removeItem = (id) => setItems(items.filter(i => i.product_id !== id));
  const updateItem = (id, field, val) => {
    setItems(items.map(i => {
      if (i.product_id === id) {
        const updated = { ...i, [field]: val };
        updated.total_cost = updated.quantity * updated.unit_cost;
        return updated;
      }
      return i;
    }));
  };

  const subtotal = items.reduce((s, i) => s + i.total_cost, 0);
  const discountAmt = parseFloat(form.discount) || 0;
  const totalAmount = subtotal - discountAmt;

  const handleSubmit = async () => {
    if (!form.supplier_id) return toast.error('Select a supplier');
    if (items.length === 0) return toast.error('Add at least one item');
    setSaving(true);
    try {
      await api.post('/grn', { ...form, items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_cost: i.unit_cost })) });
      toast.success('GRN created & stock updated!');
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Error creating GRN'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-header-title">Create GRN</div></div>
        <button className="btn btn-ghost" onClick={onClose}><X size={16} /> Cancel</button>
      </div>

      {step === 1 && (
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="card-header"><span className="card-title">Select Supplier & Details</span></div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group"><label className="form-label">GRN Date</label><input type="date" className="form-control" value={form.grn_date} onChange={e => setForm({ ...form, grn_date: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Supplier Invoice No.</label><input className="form-control" value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })} placeholder="INV-..." /></div>
            </div>
            <div className="form-group"><label className="form-label">Search Supplier</label><input className="form-control" placeholder="Type supplier name..." value={supSearch} onChange={e => setSupSearch(e.target.value)} /></div>
            
            {selectedSupplier && (
              <div style={{ background: 'var(--primary-50)', border: '1.5px solid var(--primary-200)', borderRadius: 'var(--radius)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div className="fw-700">{selectedSupplier.name} <span className="badge badge-primary">{selectedSupplier.supplier_code}</span></div></div>
                <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedSupplier(null); setForm({ ...form, supplier_id: '' }); }}>Change</button>
              </div>
            )}
            {!selectedSupplier && suppliers.length > 0 && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                {suppliers.map(s => (
                  <div key={s.id} onClick={() => { setSelectedSupplier(s); setForm({ ...form, supplier_id: s.id }); setSupSearch(''); setSuppliers([]); }}
                    style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}>
                    <div className="fw-600">{s.name}</div><div className="text-muted fs-12">{s.supplier_code}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="modal-footer"><button className="btn btn-primary" onClick={() => setStep(2)} disabled={!form.supplier_id}>Next: Add Items <ChevronRight size={15} /></button></div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 20 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Select Products</span></div>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
              <div className="search-input-wrap" style={{ margin: 0, maxWidth: '100%' }}><Search size={15} /><input placeholder="Search products..." value={prodSearch} onChange={e => setProdSearch(e.target.value)} /></div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Product</th><th>Cost</th><th></th></tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td><div className="fw-600">{p.name}</div><div className="text-muted fs-12">{p.sku}</div></td>
                      <td className="fw-700">{formatCurrency(p.unit_cost)}</td>
                      <td><button className="btn btn-primary btn-sm" onClick={() => addItem(p)}><Plus size={13} /> Add</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="card" style={{ alignSelf: 'start' }}>
            <div className="card-header"><span className="card-title">GRN Items</span></div>
            <div style={{ padding: '0 16px' }}>
              {items.length === 0 && <div className="empty-state"><Plus size={30} /><h3>No items</h3></div>}
              {items.map(item => (
                <div key={item.product_id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div className="flex-between mb-12">
                    <div className="fw-600 fs-13">{item.name}</div>
                    <button className="btn btn-ghost btn-sm" onClick={() => removeItem(item.product_id)} style={{ color: 'var(--danger)' }}><Trash2 size={13} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 11 }}>QTY</div><input type="number" className="form-control" value={item.quantity} onChange={e => updateItem(item.product_id, 'quantity', parseInt(e.target.value) || 0)} min="1" /></div>
                    <div style={{ flex: 1.5 }}><div style={{ fontSize: 11 }}>COST</div><input type="number" className="form-control" value={item.unit_cost} onChange={e => updateItem(item.product_id, 'unit_cost', parseFloat(e.target.value) || 0)} /></div>
                    <div style={{ flex: 1.5, textAlign: 'right', paddingTop: 18 }} className="fw-700">{formatCurrency(item.total_cost)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px' }}>
              <div className="flex-between mb-8"><span>Subtotal</span><span className="fw-600">{formatCurrency(subtotal)}</span></div>
              <div className="flex-between mb-8"><span>Discount</span><input type="number" className="form-control" style={{ width: 100, padding: '4px 8px' }} value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} min="0" /></div>
              <div className="divider" />
              <div className="flex-between fw-800 fs-16 mt-8"><span>Total</span><span className="text-primary">{formatCurrency(totalAmount)}</span></div>
            </div>
            <div className="modal-footer" style={{ flexWrap: 'wrap', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-success" style={{ flex: 1 }} onClick={handleSubmit} disabled={items.length === 0 || saving}>
                <CheckCircle size={15} /> {saving ? 'Saving...' : 'Confirm GRN & Receive Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GRN DETAIL ────────────────────────────────────────────────────────────
function GRNDetail({ id, onBack }) {
  const [data, setData] = useState(null);
  useEffect(() => { api.get(`/grn/${id}`).then(res => setData(res.data.data)); }, [id]);
  
  if (!data) return <div className="loading-wrap"><div className="spinner" /></div>;
  const { items, payments, ...grn } = data;

  return (
    <div>
      <div className="page-header">
        <div><button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 8 }}>Back to GRNs</button>
        <div className="page-header-title">{grn.grn_number}</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">GRN Details</span></div>
          <div className="card-body">
            <div className="form-row mb-20">
              <div><div className="form-label">Supplier</div><div className="fw-700">{grn.supplier_name}</div></div>
              <div><div className="form-label">Date</div><div className="fw-700">{formatDate(grn.grn_date)}</div></div>
              <div><div className="form-label">Invoice Ref</div><div className="fw-700">{grn.invoice_number || '-'}</div></div>
            </div>
            <table>
              <thead><tr><th>Product</th><th className="text-right">Qty</th><th className="text-right">Unit Cost</th><th className="text-right">Total</th></tr></thead>
              <tbody>{items.map(i => <tr key={i.id}><td>{i.product_name}</td><td className="text-right">{i.quantity}</td><td className="text-right">{formatCurrency(i.unit_cost)}</td><td className="text-right fw-700">{formatCurrency(i.total_cost)}</td></tr>)}</tbody>
            </table>
            <div style={{ maxWidth: 300, marginLeft: 'auto', marginTop: 16 }}>
              <div className="flex-between mb-8"><span>Subtotal</span><span>{formatCurrency(grn.subtotal)}</span></div>
              {grn.discount > 0 && <div className="flex-between mb-8"><span>Discount</span><span className="text-danger">-{formatCurrency(grn.discount)}</span></div>}
              <div className="divider" />
              <div className="flex-between fw-800 fs-16 mt-8"><span>Total Amount</span><span className="text-primary">{formatCurrency(grn.total_amount)}</span></div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Payments</span></div>
          <div className="card-body">
            <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 'var(--radius)', marginBottom: 16 }}>
              <div className="flex-between mb-8"><span>Total Amount</span><span className="fw-600">{formatCurrency(grn.total_amount)}</span></div>
              <div className="flex-between mb-8"><span>Paid</span><span className="fw-700 text-success">{formatCurrency(grn.paid_amount)}</span></div>
              <div className="flex-between"><span>Balance</span><span className={`fw-800 ${grn.balance_amount > 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(grn.balance_amount)}</span></div>
            </div>
            {payments.map(p => (
              <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div className="flex-between fw-600"><span>{formatDate(p.payment_date)}</span><span className="text-success">{formatCurrency(p.amount)}</span></div>
                <div className="text-muted fs-12">{capitalize(p.payment_method)} {p.reference_number ? `· Ref: ${p.reference_number}` : ''}</div>
              </div>
            ))}
            {payments.length === 0 && <div className="text-muted text-center" style={{ padding: 20 }}>No payments recorded for this GRN.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
