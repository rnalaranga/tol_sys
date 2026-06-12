import { useEffect, useState } from 'react';
import api from '../api/axios';
import { formatDate, getStatusBadge, capitalize, today } from '../utils/helpers';
import { Shield, AlertTriangle, Clock, CheckCircle, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Warranty() {
  const [warranties, setWarranties] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [claimModal, setClaimModal] = useState(null);
  const [claimForm, setClaimForm] = useState({ claim_date: today(), description: '' });
  const [saving, setSaving] = useState(false);
  const limit = 15;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [w, e] = await Promise.all([
        api.get('/warranties', { params: { search, status: statusFilter, page, limit } }),
        api.get('/analytics/warranty/expiring?days=60'),
      ]);
      setWarranties(w.data.data);
      setTotal(w.data.total);
      setExpiring(e.data.data);
    } catch { toast.error('Failed to load warranty data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, statusFilter, page]);

  const handleClaim = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/warranties/claims', { warranty_id: claimModal.id, ...claimForm });
      toast.success('Warranty claim submitted!');
      setClaimModal(null);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Error submitting claim'); }
    finally { setSaving(false); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">Warranty Management</div>
      </div>

      {/* Expiring Soon Alert */}
      {expiring.length > 0 && (
        <div className="card mb-20" style={{ border: '1.5px solid var(--warning)' }}>
          <div className="card-header" style={{ background: 'var(--warning-bg)' }}>
            <span className="card-title" style={{ color: '#b45309' }}>
              <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Warranties Expiring in 60 Days ({expiring.length})
            </span>
          </div>
          <div className="table-wrapper">
            <table className="table-pro">
              <thead>
                <tr>
                  <th>CUSTOMER DETAILS</th>
                  <th>PRODUCT DETAILS</th>
                  <th style={{ width: 120 }}>INVOICE #</th>
                  <th style={{ width: 100 }}>EXPIRY DATE</th>
                  <th style={{ textAlign: 'center', width: 100 }}>DAYS LEFT</th>
                </tr>
              </thead>
              <tbody>
                {expiring.map(w => (
                  <tr key={w.id} style={{ background: w.days_remaining <= 30 ? '#fff8f0' : '#fff' }}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{w.customer_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{w.customer_phone}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{w.product_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.brand}</div>
                    </td>
                    <td><span style={{ fontWeight: 700, color: '#1a56db', fontSize: 13 }}>{w.invoice_number}</span></td>
                    <td style={{ fontWeight: 600, fontSize: 12.5 }}>{formatDate(w.end_date)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                        background: w.days_remaining <= 30 ? '#fef2f2' : '#fffbeb',
                        color: w.days_remaining <= 30 ? '#ef4444' : '#f59e0b',
                        border: `1px solid ${w.days_remaining <= 30 ? '#ef4444' : '#fbbf24'}`
                      }}>
                        {w.days_remaining} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Warranties */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="search-input-wrap" style={{ margin: 0, maxWidth: 300 }}>
            <Search size={15} />
            <input placeholder="Search customer, product, invoice..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-control" style={{ width: 160, padding: '8px 12px' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="claimed">Claimed</option>
          </select>
        </div>
        <div className="table-wrapper">
          <table className="table-pro">
            <thead>
              <tr>
                <th>CUSTOMER DETAILS</th>
                <th>PRODUCT DETAILS</th>
                <th style={{ width: 110 }}>INVOICE #</th>
                <th style={{ textAlign: 'center', width: 90 }}>PERIOD</th>
                <th style={{ width: 100 }}>START DATE</th>
                <th style={{ width: 100 }}>EXPIRY DATE</th>
                <th style={{ textAlign: 'center', width: 90 }}>DAYS LEFT</th>
                <th style={{ textAlign: 'center', width: 90 }}>STATUS</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9}><div className="loading-wrap"><div className="spinner" /></div></td></tr>}
              {!loading && warranties.length === 0 && (
                <tr><td colSpan={9}><div className="empty-state"><Shield size={40} /><h3>No warranties found</h3><p>Warranties are automatically created when invoices are issued</p></div></td></tr>
              )}
              {warranties.map(w => (
                <tr key={w.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{w.customer_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{w.customer_phone}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{w.product_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.brand} · {w.sku}</div>
                  </td>
                  <td><span style={{ fontWeight: 700, color: '#1a56db', fontSize: 13 }}>{w.invoice_number}</span></td>
                  <td style={{ textAlign: 'center', fontWeight: 600, fontSize: 12 }}>{w.warranty_months} mo.</td>
                  <td style={{ fontWeight: 500, fontSize: 12.5, color: 'var(--text-secondary)' }}>{formatDate(w.start_date)}</td>
                  <td style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text)' }}>{formatDate(w.end_date)}</td>
                  <td style={{ textAlign: 'center' }}>
                    {w.status === 'active'
                      ? <span style={{
                          display: 'inline-block', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                          background: w.days_remaining <= 30 ? '#fef2f2' : w.days_remaining <= 60 ? '#fffbeb' : '#ecfdf5',
                          color: w.days_remaining <= 30 ? '#ef4444' : w.days_remaining <= 60 ? '#f59e0b' : '#10b981',
                          border: `1px solid ${w.days_remaining <= 30 ? '#ef4444' : w.days_remaining <= 60 ? '#fbbf24' : '#10b981'}`
                        }}>{w.days_remaining}d</span>
                      : '-'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      background: w.status === 'active' ? '#ecfdf5' : w.status === 'expired' ? '#f1f5f9' : '#fffbeb',
                      color: w.status === 'active' ? '#10b981' : w.status === 'expired' ? 'var(--text-muted)' : '#f59e0b',
                      border: `1px solid ${w.status === 'active' ? '#10b981' : w.status === 'expired' ? '#cbd5e1' : '#fbbf24'}`
                    }}>
                      {w.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {w.status === 'active' && (
                      <button className="btn btn-outline btn-sm" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => { setClaimModal(w); setClaimForm({ claim_date: today(), description: '' }); }}>
                        Claim
                      </button>
                    )}
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

      {/* Claim Modal */}
      {claimModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setClaimModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Submit Warranty Claim</span>
              <button className="modal-close" onClick={() => setClaimModal(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleClaim}>
              <div className="modal-body">
                <div style={{ background: 'var(--primary-50)', border: '1.5px solid var(--primary-200)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16 }}>
                  <div className="fw-700">{claimModal.product_name}</div>
                  <div className="text-muted fs-12">Customer: {claimModal.customer_name} · Invoice: {claimModal.invoice_number}</div>
                  <div className="text-muted fs-12">Expires: {formatDate(claimModal.end_date)} ({claimModal.days_remaining} days remaining)</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Claim Date</label>
                  <input type="date" className="form-control" value={claimForm.claim_date} onChange={e => setClaimForm({ ...claimForm, claim_date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Issue Description *</label>
                  <textarea className="form-control" value={claimForm.description} onChange={e => setClaimForm({ ...claimForm, description: e.target.value })} required placeholder="Describe the issue / defect..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setClaimModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Submitting...' : 'Submit Claim'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
