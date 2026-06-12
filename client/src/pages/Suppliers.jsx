import { useEffect, useState, useCallback, Fragment } from 'react';
import api from '../api/axios';
import { formatCurrency, formatDate, getStatusBadge, capitalize, today } from '../utils/helpers';
import { Building2, Search, Plus, Eye, Edit, CreditCard, X, Phone, Mail, MapPin, ChevronDown, ChevronRight, ChevronsUpDown } from 'lucide-react';
import toast from 'react-hot-toast';

const emptyForm = { name: '', contact_person: '', phone: '', phone2: '', email: '', address: '', city: '', bank_name: '', bank_account: '', notes: '' };
const emptyPayForm = { supplier_id: '', grn_id: '', payment_date: today(), amount: '', payment_method: 'bank_transfer', reference_number: '', notes: '' };

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [viewSupplier, setViewSupplier] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showPayModal, setShowPayModal] = useState(null);
  const [payForm, setPayForm] = useState(emptyPayForm);
  const [supplierGRNs, setSupplierGRNs] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const limit = 15;

  const toggleExpand = (id) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/suppliers', { params: { search, page, limit } });
      setSuppliers(res.data.data);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load suppliers'); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const loadSupplierProfile = async (id) => {
    try {
      const res = await api.get(`/suppliers/${id}`);
      setViewSupplier(res.data.data);
    } catch {
      toast.error('Failed to load supplier details');
    }
  };


  const openCreate = () => { setEditSupplier(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (s) => {
    setEditSupplier(s);
    setForm({ name: s.name, contact_person: s.contact_person || '', phone: s.phone || '', phone2: s.phone2 || '', email: s.email || '', address: s.address || '', city: s.city || '', bank_name: s.bank_name || '', bank_account: s.bank_account || '', notes: s.notes || '' });
    setShowModal(true);
  };

  const openPayModal = async (sup) => {
    setShowPayModal(sup);
    setPayForm({ ...emptyPayForm, supplier_id: sup.id });
    // Load unpaid GRNs for this supplier
    try {
      const res = await api.get('/grn', { params: { supplier_id: sup.id, status: 'partial', limit: 50 } });
      const res2 = await api.get('/grn', { params: { supplier_id: sup.id, status: 'received', limit: 50 } });
      setSupplierGRNs([...res.data.data, ...res2.data.data]);
    } catch { setSupplierGRNs([]); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editSupplier) { await api.put(`/suppliers/${editSupplier.id}`, form); toast.success('Supplier updated!'); }
      else { await api.post('/suppliers', form); toast.success('Supplier added!'); }
      setShowModal(false); fetchSuppliers();
    } catch (err) { toast.error(err.response?.data?.message || 'Error saving'); }
    finally { setSaving(false); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/suppliers/payments', payForm);
      toast.success('Payment recorded!');
      setShowPayModal(null); fetchSuppliers();
    } catch (err) { toast.error(err.response?.data?.message || 'Payment error'); }
    finally { setSaving(false); }
  };

  const totalPages = Math.ceil(total / limit);

  const allExpandable = suppliers.filter(s => s.unpaidGrns && s.unpaidGrns.length > 0);
  const isAllExpanded = allExpandable.length > 0 && allExpandable.every(s => expandedRows[s.id]);

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedRows({});
    } else {
      const newExpanded = {};
      allExpandable.forEach(s => newExpanded[s.id] = true);
      setExpandedRows(newExpanded);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-header-title">Suppliers</div><div className="page-header-sub">{total} registered suppliers</div></div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Add Supplier</button>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="search-input-wrap" style={{ margin: 0, maxWidth: 300 }}>
            <Search size={14} />
            <input placeholder="Search suppliers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          {allExpandable.length > 0 && (
            <button className="btn btn-outline btn-sm" onClick={toggleExpandAll}>
              <ChevronsUpDown size={14} style={{ marginRight: 6 }} />
              {isAllExpanded ? 'Collapse All' : 'Expand All'}
            </button>
          )}
        </div>
        <div className="table-wrapper">
          <table className="table-pro">
            <thead><tr><th style={{width: 90}}>SUPPLIER NO</th><th>SUPPLIER NAME & CONTACT</th><th>CONTACT NUMBERS</th><th>EMAIL & ADDRESS</th><th className="text-right">OUTSTANDING (LKR)</th><th style={{textAlign: 'center', width: 120}}>ACTIONS</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={6}><div className="loading-wrap"><div className="spinner" /></div></td></tr>}
              {!loading && suppliers.length === 0 && <tr><td colSpan={6}><div className="empty-state"><Building2 size={40} /><h3>No suppliers yet</h3></div></td></tr>}
              {suppliers.map(s => (
                <Fragment key={s.id}>
                  <tr style={{ background: expandedRows[s.id] ? 'var(--table-row-hover)' : 'transparent' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {s.unpaidGrns && s.unpaidGrns.length > 0 ? (
                          <button type="button" className="btn btn-ghost" style={{ padding: 2, height: 24, width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => toggleExpand(s.id)}>
                            {expandedRows[s.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        ) : <div style={{ width: 24 }} />}
                        <span style={{fontWeight: 700, color: 'var(--text-secondary)', fontSize: 12}}>{s.supplier_code}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{fontWeight: 700, color: 'var(--text)', fontSize: 13}}>{s.name}</div>
                      {s.contact_person && <div style={{fontSize: 11, color: 'var(--text-muted)'}}><span style={{textTransform: 'uppercase', fontSize: 10, marginRight: 4}}>ATTN:</span> {s.contact_person}</div>}
                    </td>
                    <td>
                      <div style={{fontFamily: 'monospace', fontSize: 12.5}}>{s.phone || '-'}</div>
                      {s.phone2 && <div style={{fontFamily: 'monospace', fontSize: 12.5, color: 'var(--text-muted)'}}>{s.phone2}</div>}
                    </td>
                    <td>
                      {s.email && <div style={{fontSize: 12}}><Mail size={10} style={{marginRight: 4}}/>{s.email}</div>}
                      {s.city && <div style={{fontSize: 12, color: 'var(--text-muted)'}}><MapPin size={10} style={{marginRight: 4}}/>{s.city}</div>}
                    </td>
                    <td className="text-right">
                      <span style={{fontWeight: 700, fontSize: 13, color: parseFloat(s.outstanding_balance) > 0 ? '#b91c1c' : '#15803d'}}>
                        {formatCurrency(s.outstanding_balance)}
                      </span>
                    </td>
                    <td>
                      <div style={{display: 'flex', gap: 4, justifyContent: 'center'}}>
                        <button className="btn btn-ghost btn-sm" title="View Detail" style={{padding: '4px 8px'}} onClick={(e) => { e.stopPropagation(); loadSupplierProfile(s.id); }}><Eye size={13} /></button>
                        <button className="btn btn-ghost btn-sm" title="Edit Supplier" style={{padding: '4px 8px'}} onClick={(e) => { e.stopPropagation(); openEdit(s); }}><Edit size={13} /></button>
                        <button className="btn btn-primary btn-sm" title="Record Payment" style={{padding: '4px 8px'}} onClick={(e) => { e.stopPropagation(); openPayModal(s); }}><CreditCard size={13} /></button>
                      </div>
                    </td>
                  </tr>
                  {expandedRows[s.id] && s.unpaidGrns && s.unpaidGrns.length > 0 && s.unpaidGrns.map(g => (
                    <tr key={`grn-${g.id}`} style={{ background: 'var(--table-row-even)' }}>
                      <td colSpan={2} style={{ paddingLeft: 40 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 12, height: 16, borderLeft: '2px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', marginTop: -16 }} />
                          <span className="fw-700 text-primary fs-12">{g.grn_number}</span>
                          {g.supplier_invoice && <span className="text-muted fs-11" style={{marginLeft: 8}}>INV: {g.supplier_invoice}</span>}
                        </div>
                      </td>
                      <td colSpan={2} className="fs-12 text-muted">
                        <span style={{marginRight: 16}}>Date: <span className="fw-600">{formatDate(g.grn_date)}</span></span>
                        <span>Age: <span className={`badge ${g.days_overdue > 60 ? 'badge-danger' : g.days_overdue > 30 ? 'badge-warning' : 'badge-primary'}`} style={{fontSize: 10, padding: '2px 6px'}}>{g.days_overdue} days</span></span>
                      </td>
                      <td className="text-right fw-700 text-danger fs-12">{formatCurrency(g.balance_amount)}</td>
                      <td></td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && <div className="pagination">{Array.from({ length: totalPages }, (_, i) => i + 1).map(p => <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>)}</div>}
      </div>

      {/* Supplier Form Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">{editSupplier ? 'Edit Supplier' : 'Add Supplier'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Company Name *</label><input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Samsung Lanka (Pvt) Ltd" /></div>
                  <div className="form-group"><label className="form-label">Contact Person</label><input className="form-control" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} placeholder="Manager name" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Phone</label><input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0112345678" /></div>
                  <div className="form-group"><label className="form-label">Phone 2</label><input className="form-control" value={form.phone2} onChange={e => setForm({ ...form, phone2: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Address</label><input className="form-control" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">City</label><input className="form-control" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Bank Name</label><input className="form-control" value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} placeholder="Commercial Bank" /></div>
                  <div className="form-group"><label className="form-label">Account Number</label><input className="form-control" value={form.bank_account} onChange={e => setForm({ ...form, bank_account: e.target.value })} /></div>
                </div>
                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editSupplier ? 'Update' : 'Add Supplier'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Supplier Modal */}
      {viewSupplier && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewSupplier(null)}>
          <div className="modal" style={{ width: 850, maxWidth: '95%' }}>
            <div className="modal-header">
              <span className="modal-title">Supplier Profile</span>
              <button className="modal-close" onClick={() => setViewSupplier(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[['Code', viewSupplier.supplier_code], ['Name', viewSupplier.name], ['Contact', viewSupplier.contact_person || '-'], ['Phone', viewSupplier.phone || '-'], ['Email', viewSupplier.email || '-'], ['City', viewSupplier.city || '-'], ['Bank', viewSupplier.bank_name || '-'], ['Account', viewSupplier.bank_account || '-']].map(([l, v]) => (
                  <div key={l}><div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{l}</div><div style={{ fontSize: 14, fontWeight: 500 }}>{v}</div></div>
                ))}
              </div>
              <div className="divider" />
              <div className="flex-between">
                <span className="fw-600">Total Outstanding Balance</span>
                <span className={`amount fw-800 ${viewSupplier.outstanding_balance > 0 ? 'text-danger' : 'text-success'}`} style={{ fontSize: 20 }}>{formatCurrency(viewSupplier.outstanding_balance)}</span>
              </div>

              {viewSupplier.aging && viewSupplier.outstanding_balance > 0 && (
                <>
                  <div className="divider" />
                  <div style={{ fontWeight: 600, marginBottom: 12 }}>Aging Report</div>
                  <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Current (0-30 Days)</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: viewSupplier.aging.current > 0 ? 'var(--text)' : '#94a3b8' }}>{formatCurrency(viewSupplier.aging.current)}</div>
                    </div>
                    <div style={{ background: '#fffbeb', padding: 10, borderRadius: 6, border: '1px solid #fde68a' }}>
                      <div style={{ fontSize: 11, color: '#b45309', fontWeight: 600 }}>31-60 Days</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: viewSupplier.aging.days30 > 0 ? '#b45309' : '#d97706' }}>{formatCurrency(viewSupplier.aging.days30)}</div>
                    </div>
                    <div style={{ background: '#fef2f2', padding: 10, borderRadius: 6, border: '1px solid #fecaca' }}>
                      <div style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>61-90 Days</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: viewSupplier.aging.days60 > 0 ? '#b91c1c' : '#ef4444' }}>{formatCurrency(viewSupplier.aging.days60)}</div>
                    </div>
                    <div style={{ background: '#fef2f2', padding: 10, borderRadius: 6, border: '1px solid #fca5a5' }}>
                      <div style={{ fontSize: 11, color: '#991b1b', fontWeight: 600 }}>Over 90 Days</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: viewSupplier.aging.over90 > 0 ? '#991b1b' : '#ef4444' }}>{formatCurrency(viewSupplier.aging.over90)}</div>
                    </div>
                  </div>
                </>
              )}

              {viewSupplier.unpaidGrns && viewSupplier.unpaidGrns.length > 0 && (
                <>
                  <div className="divider" />
                  <div style={{ fontWeight: 600, marginBottom: 12 }}>Unpaid Invoices (GRNs)</div>
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    <table className="table-pro" style={{ fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th>GRN / INVOICE #</th>
                          <th>DATE</th>
                          <th className="text-right">TOTAL (LKR)</th>
                          <th className="text-right">BALANCE (LKR)</th>
                          <th className="text-right">AGE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewSupplier.unpaidGrns.map(g => (
                          <tr key={g.id}>
                            <td>
                              <div className="fw-700 text-primary">{g.grn_number}</div>
                              {g.supplier_invoice && <div className="text-muted fs-11">INV: {g.supplier_invoice}</div>}
                            </td>
                            <td>{formatDate(g.grn_date)}</td>
                            <td className="text-right fw-600">{formatCurrency(g.total_amount)}</td>
                            <td className="text-right fw-700 text-danger">{formatCurrency(g.balance_amount)}</td>
                            <td className="text-right">
                              <span className={`badge ${g.days_overdue > 60 ? 'badge-danger' : g.days_overdue > 30 ? 'badge-warning' : ''}`}>{g.days_overdue} days</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setViewSupplier(null)}>Close</button>
              <button className="btn btn-outline" onClick={() => { setViewSupplier(null); openEdit(viewSupplier); }}>Edit</button>
              <button className="btn btn-primary" onClick={() => { setViewSupplier(null); openPayModal(viewSupplier); }}><CreditCard size={14} /> Record Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPayModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Supplier Payment — {showPayModal.name}</span>
              <button className="modal-close" onClick={() => setShowPayModal(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handlePayment}>
              <div className="modal-body">
                <div style={{ background: 'var(--danger-bg)', border: '1.5px solid var(--danger)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                  <span className="fw-600 fs-13">Outstanding Balance</span>
                  <span className="fw-800 text-danger" style={{ fontSize: 18 }}>{formatCurrency(showPayModal.outstanding_balance)}</span>
                </div>
                {supplierGRNs.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Apply to GRN (Optional)</label>
                    <select className="form-control" value={payForm.grn_id} onChange={e => setPayForm({ ...payForm, grn_id: e.target.value })}>
                      <option value="">— General payment —</option>
                      {supplierGRNs.map(g => <option key={g.id} value={g.id}>{g.grn_number} — Balance: {formatCurrency(g.balance_amount)}</option>)}
                    </select>
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Payment Date *</label><input type="date" className="form-control" value={payForm.payment_date} onChange={e => setPayForm({ ...payForm, payment_date: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Amount (Rs.) *</label><input type="number" className="form-control" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} required min="1" step="0.01" /></div>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select className="form-control" value={payForm.payment_method} onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })}>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Reference / Cheque No.</label><input className="form-control" value={payForm.reference_number} onChange={e => setPayForm({ ...payForm, reference_number: e.target.value })} placeholder="TXN / Cheque number" /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowPayModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={saving}>{saving ? 'Saving...' : 'Record Payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
