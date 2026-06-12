import { useEffect, useState, Fragment } from 'react';
import api from '../api/axios';
import { formatCurrency, formatDate, getStatusBadge, capitalize } from '../utils/helpers';
import { UserPlus, Search, Eye, Edit, Phone, MapPin, X, ChevronDown, ChevronRight, ChevronsUpDown, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const emptyForm = { name: '', nic: '', phone: '', phone2: '', email: '', address: '', city: '', notes: '' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [hoveredInvoice, setHoveredInvoice] = useState(null);
  const navigate = useNavigate();
  const limit = 15;

  const toggleExpand = (id) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers', { params: { search, risk_status: riskFilter, page, limit } });
      setCustomers(res.data.data);
      setTotal(res.data.total);
    } catch (e) { toast.error('Failed to load customers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, [search, riskFilter, page]);

  const openCreate = () => { setEditCustomer(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (c) => { setEditCustomer(c); setForm({ name: c.name, nic: c.nic || '', phone: c.phone, phone2: c.phone2 || '', email: c.email || '', address: c.address || '', city: c.city || '', notes: c.notes || '' }); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editCustomer) {
        await api.put(`/customers/${editCustomer.id}`, form);
        toast.success('Customer updated!');
      } else {
        await api.post('/customers', form);
        toast.success('Customer added!');
      }
      setShowModal(false);
      fetchCustomers();
    } catch (err) { toast.error(err.response?.data?.message || 'Error saving customer'); }
    finally { setSaving(false); }
  };

  const updateRiskStatus = async (c, newStatus) => {
    try {
      await api.put(`/customers/${c.id}`, { risk_status: newStatus });
      toast.success(newStatus === 1 ? 'Customer blacklisted' : newStatus === 2 ? 'Customer marked with warning' : 'Customer risk cleared');
      if (viewCustomer && viewCustomer.id === c.id) {
        setViewCustomer({ ...viewCustomer, risk_status: newStatus });
      }
      fetchCustomers();
    } catch (err) {
      toast.error('Failed to update risk status');
    }
  };

  const totalPages = Math.ceil(total / limit);

  const allExpandable = customers.filter(c => c.activeInstallments && c.activeInstallments.length > 0);
  const isAllExpanded = allExpandable.length > 0 && allExpandable.every(c => expandedRows[c.id]);

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedRows({});
    } else {
      const newExpanded = {};
      allExpandable.forEach(c => newExpanded[c.id] = true);
      setExpandedRows(newExpanded);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title">Customers</div>
          <div className="page-header-sub">{total} total customers</div>
        </div>
        <button id="add-customer-btn" className="btn btn-primary" onClick={openCreate}>
          <UserPlus size={16} /> Add Customer
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="search-input-wrap" style={{ margin: 0, maxWidth: 300 }}>
              <Search size={14} />
              <input placeholder="Search customers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="form-control" style={{ width: 160, padding: '8px 12px', fontSize: 13 }} value={riskFilter} onChange={e => { setRiskFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="0">Normal</option>
              <option value="2">Warning</option>
              <option value="1">Blacklisted</option>
            </select>
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
            <thead>
              <tr>
                <th style={{ width: 90 }}>CUSTOMER NO</th>
                <th>CUSTOMER NAME & NIC</th>
                <th>CONTACT DETAILS</th>
                <th>CITY</th>
                <th style={{ textAlign: 'center' }}>INVOICES</th>
                <th className="text-right">OUTSTANDING (LKR)</th>
                <th style={{ textAlign: 'center', width: 120 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7}><div className="loading-wrap"><div className="spinner" /></div></td></tr>}
              {!loading && customers.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state"><UserPlus size={40} /><h3>No customers found</h3><p>Add your first customer to get started</p></div></td></tr>
              )}
              {customers.map(c => (
                <Fragment key={c.id}>
                  <tr style={{ background: expandedRows[c.id] ? 'var(--table-row-hover)' : 'transparent' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {c.activeInstallments && c.activeInstallments.length > 0 ? (
                          <button type="button" className="btn btn-ghost" style={{ padding: 2, height: 24, width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => toggleExpand(c.id)}>
                            {expandedRows[c.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        ) : <div style={{ width: 24 }} />}
                        <span style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: 12 }}>{c.customer_code}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: c.risk_status === 1 ? 'var(--danger)' : c.risk_status === 2 ? '#b45309' : 'var(--text)', fontSize: 13 }}>
                        {c.name}
                        {c.risk_status === 1 && <span className="badge badge-danger" style={{ marginLeft: 6, fontSize: 9 }}>BLACKLISTED</span>}
                        {c.risk_status === 2 && <span className="badge badge-warning" style={{ marginLeft: 6, fontSize: 9 }}>WARNING</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}><span style={{ textTransform: 'uppercase', fontSize: 10, marginRight: 4 }}>NIC:</span>{c.nic || '-'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5, fontFamily: 'monospace' }}><Phone size={10} style={{ color: 'var(--text-muted)', marginRight: 4 }} />{c.phone}</div>
                      {c.email && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email}</div>}
                    </td>
                    <td style={{ fontSize: 12.5 }}>{c.city || '-'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{c.total_invoices || 0}</td>
                    <td className="text-right">
                      <span style={{ fontWeight: 700, fontSize: 13, color: c.outstanding_balance > 0 ? '#b91c1c' : '#15803d' }}>
                        {formatCurrency(c.outstanding_balance)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button className="btn btn-ghost btn-sm" title="View Detail" style={{ padding: '4px 8px' }} onClick={(e) => { e.stopPropagation(); setViewCustomer(c); }}><Eye size={13} /></button>
                        <button className="btn btn-ghost btn-sm" title="Edit Customer" style={{ padding: '4px 8px' }} onClick={(e) => { e.stopPropagation(); openEdit(c); }}><Edit size={13} /></button>
                        <button className="btn btn-outline btn-sm" title="View Invoices" style={{ padding: '4px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); navigate(`/invoices?customer_id=${c.id}`); }}>Invoices</button>
                      </div>
                    </td>
                  </tr>
                  {expandedRows[c.id] && c.activeInstallments && c.activeInstallments.length > 0 && c.activeInstallments.map(inst => (
                    <tr key={`inst-${inst.id}`} style={{ background: 'var(--table-row-even)' }}>
                      <td colSpan={2} style={{ paddingLeft: 40 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 12, height: 16, borderLeft: '2px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', marginTop: -16 }} />
                          <div style={{ position: 'relative' }} onMouseEnter={() => setHoveredInvoice(inst.id)} onMouseLeave={() => setHoveredInvoice(null)}>
                            <span className="fw-700 text-primary fs-12" style={{ borderBottom: '1px dashed var(--primary)', cursor: 'help' }}>{inst.invoice_number}</span>
                            {hoveredInvoice === inst.id && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px', width: 250, boxShadow: '0 8px 30px rgba(0,0,0,0.2)', marginTop: 6, color: 'var(--text)' }}>
                                <div className="fw-800 mb-8" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invoice Summary</div>
                                <div className="flex-between mb-4"><span className="text-muted fs-11">Date:</span> <span className="fw-600 fs-11">{formatDate(inst.invoice_date)}</span></div>
                                <div className="flex-between mb-8"><span className="text-muted fs-11">Total:</span> <span className="fw-600 fs-11 text-primary">{formatCurrency(inst.total_amount)}</span></div>
                                
                                {inst.items && inst.items.length > 0 && (
                                  <div style={{ background: 'var(--table-row-even)', padding: '6px 8px', borderRadius: '4px', marginBottom: 8 }}>
                                    <div className="text-muted fs-10 mb-4" style={{textTransform: 'uppercase', fontWeight: 600}}>Items</div>
                                    {inst.items.map(item => (
                                      <div key={item.id} className="flex-between fs-11 mb-2">
                                        <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160}} title={item.product_name}>{item.product_name}</span>
                                        <span className="fw-600 text-muted">x{item.quantity}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="flex-between mb-4"><span className="text-muted fs-11">Discount:</span> <span className="fw-600 fs-11 text-success">{formatCurrency(inst.discount)}</span></div>
                                <div className="flex-between"><span className="text-muted fs-11">Down Pay:</span> <span className="fw-600 fs-11">{formatCurrency(inst.down_payment)}</span></div>
                              </div>
                            )}
                          </div>
                          <span className="badge badge-primary" style={{marginLeft: 8}}>Inst #{inst.installment_number}</span>
                        </div>
                      </td>
                      <td colSpan={2} className="fs-12 text-muted">
                        <span style={{marginRight: 16}}>Due: <span className="fw-600 text-danger">{formatDate(inst.due_date)}</span></span>
                        <span><span className={`badge ${inst.status === 'overdue' ? 'badge-danger' : inst.status === 'partial' ? 'badge-warning' : 'badge-primary'}`} style={{fontSize: 10, padding: '2px 6px'}}>{capitalize(inst.status)}</span></span>
                      </td>
                      <td colSpan={2} className="text-right fs-12">
                        <span style={{marginRight: 16}}>Amount: <span className="fw-700">{formatCurrency(inst.amount_due)}</span></span>
                        {inst.amount_paid > 0 && <span className="text-success">Paid: <span className="fw-700">{formatCurrency(inst.amount_paid)}</span></span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {inst.status !== 'paid' && (
                          <button className="btn btn-primary btn-sm" style={{ padding: '2px 10px', fontSize: 11, borderRadius: 'var(--radius)' }} onClick={(e) => { e.stopPropagation(); navigate(`/invoices?id=${inst.invoice_id}`); }}>
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </Fragment>
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

      {/* Customer Form Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editCustomer ? 'Edit Customer' : 'Add New Customer'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Customer full name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">NIC Number</label>
                    <input className="form-control" value={form.nic} onChange={e => setForm({ ...form, nic: e.target.value })} placeholder="198812345678" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone *</label>
                    <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required placeholder="0771234567" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone 2</label>
                    <input className="form-control" value={form.phone2} onChange={e => setForm({ ...form, phone2: e.target.value })} placeholder="Alternative number" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="customer@email.com" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <input className="form-control" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street address" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-control" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Colombo" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-control" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editCustomer ? 'Update Customer' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Customer Modal */}
      {viewCustomer && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewCustomer(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Customer Profile</span>
              <button className="modal-close" onClick={() => setViewCustomer(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Info label="Code" value={viewCustomer.customer_code} />
                <Info label="Name" value={viewCustomer.name} />
                <Info label="NIC" value={viewCustomer.nic || '-'} />
                <Info label="Phone" value={viewCustomer.phone} />
                <Info label="Phone 2" value={viewCustomer.phone2 || '-'} />
                <Info label="Email" value={viewCustomer.email || '-'} />
                <Info label="City" value={viewCustomer.city || '-'} />
                <Info label="Total Invoices" value={viewCustomer.total_invoices || 0} />
              </div>
              {viewCustomer.address && <div className="mt-12"><Info label="Address" value={viewCustomer.address} /></div>}
              <div className="divider" />
              <div className="flex-between">
                <span className="fw-600">Outstanding Balance</span>
                <span className={`amount fw-800 ${viewCustomer.outstanding_balance > 0 ? 'text-danger' : 'text-success'}`} style={{ fontSize: 18 }}>
                  {formatCurrency(viewCustomer.outstanding_balance)}
                </span>
              </div>
              {viewCustomer.risk_status === 1 && (
                <div style={{ marginTop: 16, background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: '12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <X size={20} className="text-danger" />
                  <div className="text-danger fw-700">This customer is currently blacklisted.</div>
                </div>
              )}
              {viewCustomer.risk_status === 2 && (
                <div style={{ marginTop: 16, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 'var(--radius)', padding: '12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertTriangle size={20} style={{ color: '#d97706' }} />
                  <div style={{ color: '#d97706' }} className="fw-700">This customer has a warning flag.</div>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {viewCustomer.risk_status !== 0 && (
                  <button className="btn btn-outline" onClick={() => updateRiskStatus(viewCustomer, 0)}>Clear Risk</button>
                )}
                {viewCustomer.risk_status !== 2 && (
                  <button className="btn" style={{ background: '#f59e0b', color: 'white', borderColor: '#f59e0b' }} onClick={() => updateRiskStatus(viewCustomer, 2)}>Mark Warning</button>
                )}
                {viewCustomer.risk_status !== 1 && (
                  <button className="btn btn-danger" onClick={() => updateRiskStatus(viewCustomer, 1)}>Blacklist</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setViewCustomer(null)}>Close</button>
                <button className="btn btn-outline" onClick={() => { setViewCustomer(null); openEdit(viewCustomer); }}>Edit</button>
                <button className="btn btn-primary" onClick={() => { setViewCustomer(null); navigate(`/invoices?customer_id=${viewCustomer.id}`); }}>View Invoices</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
    </div>
  );
}
