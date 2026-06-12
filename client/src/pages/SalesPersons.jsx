import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Users, UserPlus, Phone, CreditCard, ChevronRight, Eye, Briefcase, Plus, X, Search, DollarSign, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function SalesPersons() {
  const [salesPersons, setSalesPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewProfileId, setViewProfileId] = useState(null);
  
  const fetchSalesPersons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales_persons', { params: { search } });
      setSalesPersons(res.data.data);
    } catch {
      toast.error('Failed to load sales staff');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchSalesPersons(); }, [fetchSalesPersons]);

  if (viewProfileId) {
    return <SalesPersonProfile id={viewProfileId} onBack={() => { setViewProfileId(null); fetchSalesPersons(); }} />;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title">Sales Representatives</div>
          <div className="page-header-sub">Manage staff and track performance</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <UserPlus size={15} /> Add Sales Rep
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-input-wrap" style={{ margin: 0, maxWidth: 300 }}>
            <Search size={14} />
            <input placeholder="Search name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table-pro">
            <thead>
              <tr>
                <th>SALES REP DETAILS</th>
                <th>CONTACT INFO</th>
                <th style={{ textAlign: 'center' }}>TOTAL INVOICES</th>
                <th className="text-right">TOTAL SALES (LKR)</th>
                <th style={{ textAlign: 'center', width: 90 }}>STATUS</th>
                <th style={{ width: 100, textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6}><div className="loading-wrap"><div className="spinner" /></div></td></tr>}
              {!loading && salesPersons.length === 0 && (
                <tr><td colSpan={6}><div className="empty-state"><Users size={40} /><h3>No sales representatives found</h3></div></td></tr>
              )}
              {salesPersons.map(sp => (
                <tr key={sp.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{sp.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>NIC: {sp.nic || 'N/A'}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{sp.phone || '-'}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{sp.total_invoices}</span>
                  </td>
                  <td className="text-right">
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#1a56db' }}>{formatCurrency(sp.total_sales)}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      background: sp.status === 'active' ? '#ecfdf5' : '#fef2f2',
                      color: sp.status === 'active' ? '#059669' : '#dc2626'
                    }}>
                      {sp.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-ghost btn-sm" title="View Profile" style={{ padding: '4px 8px' }} onClick={() => setViewProfileId(sp.id)}>
                      <Eye size={14} /> Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <SalesPersonForm onClose={() => { setShowModal(false); fetchSalesPersons(); }} />}
    </div>
  );
}

function SalesPersonForm({ onClose, editData = null }) {
  const [form, setForm] = useState({ name: '', phone: '', nic: '', status: 'active' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (editData) setForm(editData); }, [editData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error('Name is required');
    setSaving(true);
    try {
      if (editData) {
        await api.put(`/sales_persons/${editData.id}`, form);
        toast.success('Updated successfully');
      } else {
        await api.post('/sales_persons', form);
        toast.success('Added successfully');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{editData ? 'Edit Sales Rep' : 'Add New Sales Rep'}</h3>
          <button className="btn btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <form id="sp-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">NIC</label>
                <input className="form-control" value={form.nic} onChange={e => setForm({ ...form, nic: e.target.value })} />
              </div>
            </div>
            {editData && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" form="sp-form" disabled={saving}>
            {saving ? 'Saving...' : 'Save Sales Rep'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SalesPersonProfile({ id, onBack }) {
  const [data, setData] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const navigate = useNavigate();

  const loadData = useCallback(() => {
    api.get(`/sales_persons/${id}/profile`).then(res => setData(res.data.data)).catch(console.error);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!data) return <div className="loading-wrap"><div className="spinner" /></div>;
  const { salesPerson, stats, recentInvoices } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 8 }}><ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back</button>
          <div className="page-header-title">{salesPerson.name}</div>
          <div className="page-header-sub">Sales Rep Performance Profile</div>
        </div>
        <button className="btn btn-outline" onClick={() => setShowEdit(true)}>Edit Details</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon blue"><Briefcase size={22} /></div>
          <div className="stat-info">
            <div className="stat-label">Total Invoices</div>
            <div className="stat-value">{stats.total_invoices}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><DollarSign size={22} /></div>
          <div className="stat-info">
            <div className="stat-label">Total Sales Volume</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{formatCurrency(stats.total_sales)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><CreditCard size={22} /></div>
          <div className="stat-info">
            <div className="stat-label">Total Collections</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{formatCurrency(stats.total_collections)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><CreditCard size={22} /></div>
          <div className="stat-info">
            <div className="stat-label">Outstanding Balance</div>
            <div className="stat-value" style={{ fontSize: 18, color: '#d97706' }}>{formatCurrency(stats.outstanding_balance)}</div>
          </div>
        </div>
      </div>

      <TargetPerformance salesPersonId={id} />

      <div className="card">
        <div className="card-header"><span className="card-title">Recent Invoices Generated</span></div>
        <div className="table-wrapper">
          <table className="table-pro">
            <thead>
              <tr>
                <th style={{ width: 120 }}>INVOICE #</th>
                <th>DATE</th>
                <th>CUSTOMER</th>
                <th className="text-right">TOTAL (LKR)</th>
                <th className="text-right">COLLECTED (LKR)</th>
                <th style={{ textAlign: 'center' }}>STATUS</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.length === 0 && <tr><td colSpan={7} className="text-center text-muted" style={{ padding: 20 }}>No invoices generated yet</td></tr>}
              {recentInvoices.map(inv => (
                <tr key={inv.id}>
                  <td><span style={{ fontWeight: 700, color: '#1a56db', fontSize: 13 }}>{inv.invoice_number}</span></td>
                  <td>{formatDate(inv.invoice_date)}</td>
                  <td><span style={{ fontWeight: 600 }}>{inv.customer_name}</span></td>
                  <td className="text-right" style={{ fontWeight: 600, fontSize: 13 }}>{formatCurrency(inv.total_amount)}</td>
                  <td className="text-right" style={{ fontWeight: 700, color: '#15803d', fontSize: 13 }}>{formatCurrency(inv.paid_amount)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      background: inv.status === 'paid' ? '#ecfdf5' : '#f1f5f9',
                      color: inv.status === 'paid' ? '#059669' : 'var(--text-secondary)'
                    }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/invoices?id=${inv.id}`)}><ChevronRight size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showEdit && <SalesPersonForm editData={salesPerson} onClose={() => { setShowEdit(false); loadData(); }} />}
    </div>
  );
}

function TargetPerformance({ salesPersonId }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [performance, setPerformance] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchPerformance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/sales_persons/${salesPersonId}/performance`, { params: { month } });
      setPerformance(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [salesPersonId, month]);

  useEffect(() => { fetchPerformance(); }, [fetchPerformance]);

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="card-title"><Target size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: '#1a56db' }} /> Target Performance</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <input type="month" className="form-control" style={{ padding: '4px 10px', height: 32 }} value={month} onChange={e => setMonth(e.target.value)} />
          <button className="btn btn-outline btn-sm" onClick={() => setShowModal(true)}><Plus size={14} /> Set Target</button>
        </div>
      </div>
      <div className="table-wrapper">
        <table className="table-pro">
          <thead>
            <tr>
              <th>PRODUCT</th>
              <th style={{ textAlign: 'center', width: 100 }}>TARGET</th>
              <th style={{ textAlign: 'center', width: 100 }}>SOLD</th>
              <th>PROGRESS</th>
              <th style={{ textAlign: 'right', width: 60 }}>%</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="text-center"><div className="spinner" /></td></tr>}
            {!loading && performance.length === 0 && <tr><td colSpan={5} className="text-center text-muted" style={{ padding: 20 }}>No targets set for {month}</td></tr>}
            {performance.map(p => (
              <tr key={p.id}>
                <td><div className="fw-700">{p.product_name}</div><div className="fs-11 text-muted">{p.sku}</div></td>
                <td style={{ textAlign: 'center', fontWeight: 600 }}>{p.target_quantity}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: '#15803d' }}>{p.actual_quantity}</td>
                <td>
                  <div style={{ width: '100%', height: 10, background: '#e2e8f0', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: p.progress_percentage >= 100 ? '#10b981' : '#3b82f6', width: `${p.progress_percentage}%`, transition: 'width 0.5s ease' }} />
                  </div>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: p.progress_percentage >= 100 ? '#10b981' : 'var(--text)' }}>
                  {p.progress_percentage}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && <SetTargetModal salesPersonId={salesPersonId} currentMonth={month} onClose={() => { setShowModal(false); fetchPerformance(); }} />}
    </div>
  );
}

function SetTargetModal({ salesPersonId, currentMonth, onClose }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ product_id: '', target_month: currentMonth, target_quantity: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/products', { params: { limit: 1000 } }).then(r => setProducts(r.data.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/sales_persons/${salesPersonId}/targets`, form);
      toast.success('Target set successfully');
      onClose();
    } catch { toast.error('Failed to set target'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Set Monthly Target</span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Month</label>
              <input type="month" className="form-control" value={form.target_month} onChange={e => setForm({ ...form, target_month: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Product</label>
              <select className="form-control" value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} required>
                <option value="">-- Select Product --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Target Quantity</label>
              <input type="number" className="form-control" min="1" value={form.target_quantity} onChange={e => setForm({ ...form, target_quantity: e.target.value })} required />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Target'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
