import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { formatCurrency, formatDate, getStatusBadge, today, capitalize } from '../utils/helpers';
import { FilePlus, Search, Eye, X, Plus, Trash2, ChevronRight, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import InvoiceDetail from './InvoiceDetail';
import AdvancedFilterBar from '../components/common/AdvancedFilterBar';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [autoPrintId, setAutoPrintId] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const limit = 15;

  const [advFilters, setAdvFilters] = useState({ startDate: '', endDate: '', customer_id: '', sales_person_id: '' });

  const customerId = searchParams.get('customer_id') || '';
  const statusParam = searchParams.get('status') || '';
  const idParam = searchParams.get('id') || '';

  useEffect(() => { if (statusParam) setStatusFilter(statusParam); }, [statusParam]);
  useEffect(() => { if (idParam) setViewId(idParam); }, [idParam]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/invoices', { params: { search, status: statusFilter, customer_id: advFilters.customer_id || customerId, startDate: advFilters.startDate, endDate: advFilters.endDate, sales_person_id: advFilters.sales_person_id, page, limit } });
      setInvoices(res.data.data);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInvoices(); }, [search, statusFilter, page, customerId, advFilters]);

  if (viewId) return <InvoiceDetail id={viewId} onBack={() => setViewId(null)} autoPrint={viewId === autoPrintId} />;
  if (showCreate) return <CreateInvoice onClose={(newId) => {
    setShowCreate(false);
    fetchInvoices();
    if (newId) {
      setAutoPrintId(newId);
      setViewId(newId);
    }
  }} />;

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title">Invoices</div>
          <div className="page-header-sub">{total} total invoices</div>
        </div>
        <button id="create-invoice-btn" className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <FilePlus size={16} /> New Invoice
        </button>
      </div>

      <div className="card">
        <AdvancedFilterBar filters={advFilters} setFilters={setAdvFilters} onApply={() => setPage(1)} />
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="search-input-wrap" style={{ margin: 0, maxWidth: 300 }}>
            <Search size={15} />
            <input placeholder="Search invoice / customer..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-control" style={{ width: 160, padding: '8px 12px' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="table-wrapper">
          <table className="table-pro">
            <thead>
              <tr>
                <th style={{ width: 100 }}>INVOICE #</th>
                <th>CUSTOMER DETAILS</th>
                <th>DATE</th>
                <th className="text-right">AMOUNT (LKR)</th>
                <th className="text-right">PAID (LKR)</th>
                <th className="text-right">BALANCE (LKR)</th>
                <th style={{ textAlign: 'center' }}>PLAN</th>
                <th style={{ textAlign: 'center', width: 90 }}>STATUS</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9}><div className="loading-wrap"><div className="spinner" /></div></td></tr>}
              {!loading && invoices.length === 0 && (
                <tr><td colSpan={9}><div className="empty-state"><FilePlus size={40} /><h3>No invoices found</h3></div></td></tr>
              )}
              {invoices.map(inv => (
                <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => setViewId(inv.id)}>
                  <td><span style={{ fontWeight: 700, color: '#1a56db', fontSize: 13 }}>{inv.invoice_number}</span></td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{inv.customer_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{inv.customer_code}</div>
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 12.5 }}>{formatDate(inv.invoice_date)}</td>
                  <td className="text-right" style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{formatCurrency(inv.total_amount)}</td>
                  <td className="text-right" style={{ fontWeight: 600, fontSize: 13, color: '#15803d' }}>{formatCurrency(inv.paid_amount)}</td>
                  <td className="text-right">
                    <span style={{ fontWeight: 700, fontSize: 13, color: inv.balance_amount > 0 ? '#b91c1c' : '#15803d' }}>
                      {formatCurrency(inv.balance_amount)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {inv.payment_type === 'installment'
                      ? <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#e8edf5', color: '#0f1b3c', fontWeight: 700, textTransform: 'uppercase' }}>{inv.installment_months} MO.</span>
                      : <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>CASH</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      background: inv.status === 'completed' ? '#ecfdf5' : inv.status === 'overdue' ? '#fef2f2' : inv.status === 'cancelled' ? '#f1f5f9' : '#ecfeff',
                      color: inv.status === 'completed' ? '#10b981' : inv.status === 'overdue' ? '#ef4444' : inv.status === 'cancelled' ? 'var(--text-muted)' : '#0ea5e9',
                      border: `1px solid ${inv.status === 'completed' ? '#10b981' : inv.status === 'overdue' ? '#ef4444' : inv.status === 'cancelled' ? '#cbd5e1' : '#0ea5e9'}`
                    }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}><ChevronRight size={16} style={{ color: '#cbd5e1' }} /></td>
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
    </div>
  );
}

// ─── CREATE INVOICE WIZARD ────────────────────────────────────────────────────
function CreateInvoice({ onClose }) {
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);
  const [custSearch, setCustSearch] = useState('');
  const [prodSearch, setProdSearch] = useState('');
  const [form, setForm] = useState({
    customer_id: '', sales_person_id: '', invoice_date: today(), payment_type: 'installment',
    installment_frequency: 'monthly', installment_months: 6, down_payment: 0, discount: 0, notes: '',
  });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (custSearch.length >= 1) {
      api.get('/customers', { params: { search: custSearch, limit: 8 } }).then(r => setCustomers(r.data.data));
    }
  }, [custSearch]);

  useEffect(() => {
    api.get('/products', { params: { search: prodSearch, limit: 10 } }).then(r => setProducts(r.data.data));
  }, [prodSearch]);

  useEffect(() => {
    api.get('/sales_persons', { params: { status: 'active' } }).then(r => setSalesPersons(r.data.data));
  }, []);

  const addItem = (prod) => {
    const existing = items.find(i => i.product_id === prod.id);
    if (existing) {
      setItems(items.map(i => i.product_id === prod.id ? { ...i, quantity: i.quantity + 1, total_price: (i.quantity + 1) * i.unit_price } : i));
    } else {
      setItems([...items, { product_id: prod.id, name: prod.name, brand: prod.brand, sku: prod.sku, unit_price: prod.selling_price, quantity: 1, total_price: prod.selling_price, stock: prod.current_stock }]);
    }
  };

  const removeItem = (product_id) => setItems(items.filter(i => i.product_id !== product_id));
  const updateItemQty = (product_id, qty) => {
    if (qty < 1) return;
    setItems(items.map(i => i.product_id === product_id ? { ...i, quantity: qty, total_price: qty * i.unit_price } : i));
  };
  const updateItemPrice = (product_id, price) => {
    setItems(items.map(i => i.product_id === product_id ? { ...i, unit_price: price, total_price: i.quantity * price } : i));
  };

  const subtotal = items.reduce((s, i) => s + i.total_price, 0);
  const discountAmt = parseFloat(form.discount) || 0;
  const totalAmount = subtotal - discountAmt;
  const downPay = parseFloat(form.down_payment) || 0;
  const balance = totalAmount - downPay;
  const installmentAmt = form.payment_type === 'installment' && form.installment_months ? Math.ceil(balance / form.installment_months * 100) / 100 : 0;

  const handleSubmit = async () => {
    if (!form.customer_id) return toast.error('Please select a customer');
    if (items.length === 0) return toast.error('Please add at least one item');
    setSaving(true);
    try {
      const res = await api.post('/invoices', { ...form, items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price })) });
      toast.success(`Invoice ${res.data.data.invoice_number} created!`);
      if (onClose) onClose(res.data.data.id);
    } catch (err) { toast.error(err.response?.data?.message || 'Error creating invoice'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title">New Invoice</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {['Customer', 'Items', 'Payment', 'Review'].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: step > i + 1 ? 'var(--success)' : step === i + 1 ? 'var(--primary)' : 'var(--border)', color: step >= i + 1 ? 'white' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{i + 1}</div>
                <span style={{ fontSize: 12, fontWeight: step === i + 1 ? 700 : 400, color: step === i + 1 ? 'var(--primary)' : 'var(--text-muted)' }}>{s}</span>
                {i < 3 && <ChevronRight size={12} style={{ color: 'var(--border)' }} />}
              </div>
            ))}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={onClose}><X size={16} /> Cancel</button>
      </div>

      {/* Step 1: Customer */}
      {step === 1 && (
        <div className="card">
          <div className="card-header"><span className="card-title">Select Customer</span></div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Invoice Date</label>
                <input type="date" className="form-control" value={form.invoice_date} onChange={e => setForm({ ...form, invoice_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Sales Person (Optional)</label>
                <select className="form-control" value={form.sales_person_id} onChange={e => setForm({ ...form, sales_person_id: e.target.value })}>
                  <option value="">-- Select Sales Rep --</option>
                  {salesPersons.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Search Customer</label>
              <input className="form-control" placeholder="Type customer name, phone, NIC..." value={custSearch} onChange={e => setCustSearch(e.target.value)} />
            </div>
            {selectedCustomer && (
              <>
                <div style={{ background: selectedCustomer.risk_status === 1 ? 'var(--danger-bg)' : selectedCustomer.risk_status === 2 ? '#fffbeb' : 'var(--primary-50)', border: `1.5px solid ${selectedCustomer.risk_status === 1 ? 'var(--danger)' : selectedCustomer.risk_status === 2 ? '#fcd34d' : 'var(--primary-200)'}`, borderRadius: 'var(--radius)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div className="fw-700" style={{ color: selectedCustomer.risk_status === 1 ? 'var(--danger)' : selectedCustomer.risk_status === 2 ? '#b45309' : 'inherit' }}>
                      {selectedCustomer.name} 
                      <span className={`badge ${selectedCustomer.risk_status === 1 ? 'badge-danger' : selectedCustomer.risk_status === 2 ? 'badge-warning' : 'badge-primary'}`} style={{ marginLeft: 6 }}>{selectedCustomer.customer_code}</span>
                      {selectedCustomer.risk_status === 1 && <span className="badge badge-danger" style={{ marginLeft: 6 }}>BLACKLISTED</span>}
                      {selectedCustomer.risk_status === 2 && <span className="badge badge-warning" style={{ marginLeft: 6 }}>WARNING</span>}
                    </div>
                    <div className="text-muted fs-12">{selectedCustomer.phone} {selectedCustomer.address ? '· ' + selectedCustomer.address : ''}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedCustomer(null); setForm({ ...form, customer_id: '' }); }}>Change</button>
                </div>
                {selectedCustomer.risk_status === 1 && (
                  <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 700, textAlign: 'center', marginBottom: 16 }}>
                    ⚠️ This customer is blacklisted. New invoices cannot be created for them.
                  </div>
                )}
                {selectedCustomer.risk_status === 2 && (
                  <div style={{ color: '#d97706', fontSize: 13, fontWeight: 700, textAlign: 'center', marginBottom: 16 }}>
                    ⚠️ Warning: This customer has a warning flag. Proceed with caution.
                  </div>
                )}
              </>
            )}
            {!selectedCustomer && customers.length > 0 && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                {customers.map(c => (
                  <div key={c.id} onClick={() => { setSelectedCustomer(c); setForm({ ...form, customer_id: c.id }); setCustSearch(''); setCustomers([]); }}
                    style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-50)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <div>
                      <div className="fw-600" style={{ color: c.risk_status === 1 ? 'var(--danger)' : c.risk_status === 2 ? '#b45309' : 'inherit' }}>
                        {c.name}
                        {c.risk_status === 1 && <span className="badge badge-danger" style={{ marginLeft: 6, fontSize: 9 }}>BLACKLISTED</span>}
                        {c.risk_status === 2 && <span className="badge badge-warning" style={{ marginLeft: 6, fontSize: 9 }}>WARNING</span>}
                      </div>
                      <div className="text-muted fs-12">{c.phone} · {c.customer_code}</div>
                    </div>
                    {c.outstanding_balance > 0 && <span className="badge badge-warning">{formatCurrency(c.outstanding_balance)} due</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!form.customer_id || selectedCustomer?.risk_status === 1}>Next: Add Items <ChevronRight size={15} /></button>
          </div>
        </div>
      )}

      {/* Step 2: Items */}
      {step === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Product Catalog</span></div>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
              <div className="search-input-wrap" style={{ margin: 0, maxWidth: '100%' }}>
                <Search size={15} />
                <input placeholder="Search products..." value={prodSearch} onChange={e => setProdSearch(e.target.value)} />
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Product</th><th>Stock</th><th>Price</th><th></th></tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div className="fw-600">{p.name}</div>
                        <div className="text-muted fs-12">{p.brand} · {p.sku}</div>
                      </td>
                      <td><span className={`badge ${p.current_stock > 0 ? 'badge-success' : 'badge-danger'}`}>{p.current_stock}</span></td>
                      <td className="fw-700 text-primary">{formatCurrency(p.selling_price)}</td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => addItem(p)} disabled={p.current_stock === 0}>
                          <Plus size={13} /> Add
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ alignSelf: 'start', position: 'sticky', top: 84 }}>
            <div className="card-header"><span className="card-title">Invoice Items ({items.length})</span></div>
            <div style={{ padding: '0 16px' }}>
              {items.length === 0 && <div className="empty-state" style={{ padding: '30px 0' }}><Plus size={30} /><h3>No items added</h3></div>}
              {items.map(item => (
                <div key={item.product_id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div className="flex-between mb-12">
                    <div>
                      <div className="fw-600" style={{ fontSize: 13 }}>{item.name}</div>
                      <div className="text-muted fs-12">{item.brand}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => removeItem(item.product_id)} style={{ color: 'var(--danger)' }}><Trash2 size={13} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>QTY</div>
                      <input type="number" className="form-control" value={item.quantity} min="1" max={item.stock} onChange={e => updateItemQty(item.product_id, parseInt(e.target.value))} style={{ padding: '6px 10px' }} />
                    </div>
                    <div style={{ flex: 1.5 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>UNIT PRICE</div>
                      <input type="number" className="form-control" value={item.unit_price} onChange={e => updateItemPrice(item.product_id, parseFloat(e.target.value))} style={{ padding: '6px 10px' }} />
                    </div>
                    <div style={{ flex: 1.5, textAlign: 'right', paddingTop: 18 }}>
                      <span className="fw-700">{formatCurrency(item.total_price)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {items.length > 0 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-light)' }}>
                <div className="flex-between"><span className="text-secondary fs-13">Subtotal</span><span className="fw-700">{formatCurrency(subtotal)}</span></div>
              </div>
            )}
            <div className="modal-footer" style={{ flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(3)} disabled={items.length === 0}>Next: Payment <ChevronRight size={15} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Payment */}
      {step === 3 && (
        <div className="card" style={{ maxWidth: 640 }}>
          <div className="card-header"><span className="card-title">Payment Options</span></div>
          <div className="card-body">
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: 20 }}>
              <div className="flex-between mb-12"><span>Subtotal</span><span className="fw-600">{formatCurrency(subtotal)}</span></div>
              <div className="flex-between mb-12">
                <span>Discount</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Rs.</span>
                  <input type="number" className="form-control" style={{ width: 120, padding: '5px 8px' }} value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} min="0" />
                </div>
              </div>
              <div className="divider" />
              <div className="flex-between fw-800" style={{ fontSize: 16 }}><span>Total</span><span className="text-primary">{formatCurrency(totalAmount)}</span></div>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Type</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {['cash', 'installment'].map(t => (
                  <label key={t} style={{ flex: 1, padding: '14px', border: '2px solid', borderColor: form.payment_type === t ? 'var(--primary)' : 'var(--border)', borderRadius: 'var(--radius)', textAlign: 'center', cursor: 'pointer', background: form.payment_type === t ? 'var(--primary-50)' : 'white', fontWeight: 700, color: form.payment_type === t ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    <input type="radio" value={t} checked={form.payment_type === t} onChange={e => setForm({ ...form, payment_type: e.target.value })} style={{ display: 'none' }} />
                    {t === 'cash' ? '💵 Cash / Full' : '📅 Installments'}
                  </label>
                ))}
              </div>
            </div>

            {form.payment_type === 'installment' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Frequency</label>
                    <select className="form-control" value={form.installment_frequency || 'monthly'} onChange={e => setForm({ ...form, installment_frequency: e.target.value })}>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">No. of Installments</label>
                    <input type="number" className="form-control" value={form.installment_months} onChange={e => setForm({ ...form, installment_months: parseInt(e.target.value) || 1 })} min="1" max="100" />
                    {form.installment_frequency === 'monthly' && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        {[3, 6, 12].map(m => (
                          <button key={m} type="button" className={`btn btn-sm ${form.installment_months === m ? 'btn-primary' : 'btn-outline'}`} onClick={() => setForm({ ...form, installment_months: m })} style={{ flex: 1 }}>{m} Mo</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Down Payment (Rs.)</label>
                  <input type="number" className="form-control" value={form.down_payment} onChange={e => setForm({ ...form, down_payment: e.target.value })} min="0" max={totalAmount} placeholder="0" />
                </div>
                {installmentAmt > 0 && (
                  <div style={{ background: 'var(--primary-50)', border: '1.5px solid var(--primary-200)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
                    <div className="flex-between mb-12"><span className="text-secondary">Down Payment</span><span className="fw-700">{formatCurrency(downPay)}</span></div>
                    <div className="flex-between mb-12"><span className="text-secondary">Balance After Down</span><span className="fw-700">{formatCurrency(balance)}</span></div>
                    <div className="divider" style={{ margin: '10px 0' }} />
                    <div className="flex-between fw-800 text-primary" style={{ fontSize: 15 }}>
                      <span>{form.installment_frequency === 'daily' ? 'Daily' : form.installment_frequency === 'weekly' ? 'Weekly' : 'Monthly'} Installment × {form.installment_months}</span>
                      <span>{formatCurrency(installmentAmt)}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="form-group mt-16">
              <label className="form-label">Notes</label>
              <textarea className="form-control" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any notes..." />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setStep(2)}>Back</button>
            <button className="btn btn-primary" onClick={() => setStep(4)}>Review Invoice <ChevronRight size={15} /></button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="card" style={{ maxWidth: 850, margin: '0 auto', background: 'transparent', border: 'none', boxShadow: 'none' }}>
          <div style={{ padding: '40px 50px', background: 'white', color: '#111827', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f3f4f6', paddingBottom: 32, marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 32, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                  T
                </div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px', color: '#111827' }}>The Orient Life</div>
                  <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Consumer Products Division</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--primary)', letterSpacing: '-1px', lineHeight: 1 }}>INVOICE</div>
                <div style={{ fontSize: 14, color: '#6b7280', marginTop: 12 }}>Date: <span style={{ color: '#111827', fontWeight: 700 }}>{formatDate(form.invoice_date)}</span></div>
              </div>
            </div>

            {/* Customer & Plan Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 40 }}>
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 800, letterSpacing: '1px', marginBottom: 12 }}>Billed To</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{selectedCustomer?.name}</div>
                <div style={{ fontSize: 14, color: '#4b5563', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14} style={{ color: '#9ca3af' }} />{selectedCustomer?.phone}</div>
                {selectedCustomer?.address && <div style={{ fontSize: 14, color: '#4b5563', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} style={{ color: '#9ca3af' }} />{selectedCustomer?.address}</div>}
              </div>
              <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Payment Plan</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{form.payment_type === 'installment' ? 'Installments' : 'Cash / Full'}</span>
                </div>
                {form.payment_type === 'installment' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Term</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{form.installment_months} {capitalize(form.installment_frequency || 'monthly')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                      <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Installment Amount</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(installmentAmt)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 40 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }}>Description</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', width: 80 }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', width: 140 }}>Unit Price</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', width: 140, borderTopRightRadius: 8, borderBottomRightRadius: 8 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i, idx) => (
                  <tr key={i.product_id}>
                    <td style={{ padding: '20px 16px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{i.name}</div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{i.brand}</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '20px 16px', fontSize: 15, fontWeight: 500, color: '#374151', borderBottom: '1px solid #f3f4f6' }}>{i.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '20px 16px', fontSize: 15, color: '#4b5563', borderBottom: '1px solid #f3f4f6' }}>{formatCurrency(i.unit_price)}</td>
                    <td style={{ textAlign: 'right', padding: '20px 16px', fontSize: 15, fontWeight: 700, color: '#111827', borderBottom: '1px solid #f3f4f6' }}>{formatCurrency(i.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 280, padding: 20, background: '#f9fafb', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Terms & Notes</div>
                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                  {form.notes ? form.notes : 'Thank you for your business. Please ensure timely payments according to the agreed schedule.'}
                </div>
              </div>
              <div style={{ width: 320 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 15 }}>
                  <span style={{ color: '#4b5563' }}>Subtotal</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{formatCurrency(subtotal)}</span>
                </div>
                {discountAmt > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 15 }}>
                    <span style={{ color: '#4b5563' }}>Discount</span>
                    <span style={{ color: '#ef4444', fontWeight: 600 }}>-{formatCurrency(discountAmt)}</span>
                  </div>
                )}
                {downPay > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 15 }}>
                    <span style={{ color: '#4b5563' }}>Down Payment</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>-{formatCurrency(downPay)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 0', marginTop: 12, borderTop: '2px solid #e5e7eb', fontSize: 20, fontWeight: 900, color: '#111827' }}>
                  <span>Total Due</span>
                  <span style={{ color: 'var(--primary)' }}>{formatCurrency(totalAmount - downPay)}</span>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div style={{ marginTop: 80, display: 'flex', justifyContent: 'space-between', paddingBottom: 20 }}>
              <div style={{ width: 240 }}>
                <div style={{ borderTop: '2px solid #d1d5db', paddingTop: 12, textAlign: 'center', fontSize: 13, color: '#4b5563', fontWeight: 600 }}>Customer Signature</div>
              </div>
              <div style={{ width: 240 }}>
                <div style={{ borderTop: '2px solid #d1d5db', paddingTop: 12, textAlign: 'center', fontSize: 13, color: '#4b5563', fontWeight: 600 }}>Authorized Signatory</div>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, padding: '0 10px' }}>
            <button className="btn btn-ghost" onClick={() => setStep(3)} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>← Back</button>
            <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={saving} style={{ padding: '0 32px', fontSize: 16, boxShadow: '0 10px 25px -5px rgba(var(--primary-rgb), 0.5)' }}>
              {saving ? 'Processing...' : '✓ Confirm & Create Invoice'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
