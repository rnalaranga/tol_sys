import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { formatCurrency, formatDate, getStatusBadge, capitalize } from '../utils/helpers';
import { CreditCard, AlertTriangle, Clock, Search, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdvancedFilterBar from '../components/common/AdvancedFilterBar';

export default function Payments() {
  const [overdue, setOverdue] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [supplierPayments, setSupplierPayments] = useState([]);
  const [activeTab, setActiveTab] = useState('customers');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [advFilters, setAdvFilters] = useState({ startDate: '', endDate: '', customer_id: '', sales_person_id: '' });

  const fetchPayments = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/invoices/overdue', { params: advFilters }),
      api.get('/invoices', { params: { status: 'active', payment_type: 'installment', limit: 30, ...advFilters } }),
      api.get('/suppliers/payments/all', { params: advFilters })
    ]).then(([od, up, sp]) => {
      setOverdue(od.data.data);
      setUpcoming(up.data.data.filter(i => i.status === 'active'));
      setSupplierPayments(sp.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [advFilters]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  if (loading) return <div className="loading-wrap"><div className="spinner" /><span>Loading payments...</span></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title">Payment Tracking</div>
          <div className="page-header-sub">Monitor installment collections</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button className={`btn ${activeTab === 'customers' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('customers')}>
          Customer Collections
        </button>
        <button className={`btn ${activeTab === 'suppliers' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('suppliers')}>
          Supplier Payments
        </button>
      </div>

      <AdvancedFilterBar filters={advFilters} setFilters={setAdvFilters} onApply={fetchPayments} />

      {activeTab === 'customers' ? (
        <>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-icon red"><AlertTriangle size={22} /></div>
              <div className="stat-info">
                <div className="stat-label">Overdue Accounts</div>
                <div className="stat-value">{overdue.length}</div>
                <div className="stat-sub">Needs immediate attention</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon amber"><Clock size={22} /></div>
              <div className="stat-info">
                <div className="stat-label">Active Installments</div>
                <div className="stat-value">{upcoming.length}</div>
                <div className="stat-sub">Ongoing payment plans</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue"><CreditCard size={22} /></div>
              <div className="stat-info">
                <div className="stat-label">Total Outstanding</div>
                <div className="stat-value">{formatCurrency(upcoming.reduce((s, i) => s + parseFloat(i.balance_amount), 0))}</div>
                <div className="stat-sub">Receivable balance</div>
              </div>
            </div>
          </div>

          {/* Overdue */}
          {overdue.length > 0 && (
        <div className="card mb-20">
          <div className="card-header">
            <span className="card-title" style={{ color: 'var(--danger)' }}>
              <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Overdue Payments ({overdue.length})
            </span>
          </div>
          <div className="table-wrapper">
            <table className="table-pro">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>INVOICE #</th>
                  <th>CUSTOMER DETAILS</th>
                  <th>SALES REP</th>
                  <th className="text-right">TOTAL AMOUNT (LKR)</th>
                  <th className="text-right">BALANCE (LKR)</th>
                  <th>EARLIEST OVERDUE</th>
                  <th style={{ width: 100, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map(inv => (
                  <tr key={inv.id} style={{ background: '#fff8f8' }}>
                    <td><span style={{ fontWeight: 700, color: '#b91c1c', fontSize: 13 }}>{inv.invoice_number}</span></td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{inv.customer_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{inv.customer_phone}</div>
                    </td>
                    <td><div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>{inv.sales_person_name || '-'}</div></td>
                    <td className="text-right" style={{ fontWeight: 600, fontSize: 13 }}>{formatCurrency(inv.total_amount)}</td>
                    <td className="text-right" style={{ fontWeight: 800, color: '#b91c1c', fontSize: 13 }}>{formatCurrency(inv.balance_amount)}</td>
                    <td style={{ fontWeight: 600, fontSize: 12.5, color: '#b91c1c' }}>{formatDate(inv.earliest_overdue)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-danger btn-sm" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => navigate(`/invoices?id=${inv.id}`)}>
                        Collect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active Installments */}
      <div className="card">
        <div className="card-header"><span className="card-title">Active Installment Accounts</span></div>
        <div className="table-wrapper">
          <table className="table-pro">
            <thead>
              <tr>
                <th style={{ width: 100 }}>INVOICE #</th>
                <th>CUSTOMER DETAILS</th>
                <th>SALES REP</th>
                <th style={{ textAlign: 'center' }}>PLAN</th>
                <th className="text-right">MONTHLY (LKR)</th>
                <th className="text-right">TOTAL (LKR)</th>
                <th className="text-right">BALANCE (LKR)</th>
                <th style={{ textAlign: 'center', width: 90 }}>STATUS</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {upcoming.length === 0 && (
                <tr><td colSpan={8}><div className="empty-state"><CreditCard size={40} /><h3>No active installment plans</h3></div></td></tr>
              )}
              {upcoming.map(inv => (
                <tr key={inv.id}>
                  <td><span style={{ fontWeight: 700, color: '#1a56db', fontSize: 13 }}>{inv.invoice_number}</span></td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{inv.customer_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{inv.customer_phone}</div>
                  </td>
                  <td><div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>{inv.sales_person_name || '-'}</div></td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#e8edf5', color: '#0f1b3c', fontWeight: 700, textTransform: 'uppercase' }}>
                      {inv.installment_months} MO.
                    </span>
                  </td>
                  <td className="text-right" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>{formatCurrency(inv.installment_amount)}</td>
                  <td className="text-right" style={{ fontWeight: 600, fontSize: 12.5 }}>{formatCurrency(inv.total_amount)}</td>
                  <td className="text-right" style={{ fontWeight: 700, fontSize: 13, color: '#b91c1c' }}>{formatCurrency(inv.balance_amount)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      background: '#ecfeff', color: '#0ea5e9', border: '1px solid #0ea5e9'
                    }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '2px' }} onClick={() => navigate('/invoices')}>
                      <ChevronRight size={14} style={{ color: '#cbd5e1' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      ) : (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">Recent Supplier Payments</span>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/suppliers')}>
              <CreditCard size={14} style={{ marginRight: 6 }} /> Record New Payment
            </button>
          </div>
          <div className="table-wrapper">
            <table className="table-pro">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>DATE</th>
                  <th>SUPPLIER DETAILS</th>
                  <th>REFERENCE</th>
                  <th>METHOD</th>
                  <th className="text-right">AMOUNT (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {supplierPayments.length === 0 && (
                  <tr><td colSpan={5}><div className="empty-state"><CreditCard size={40} /><h3>No supplier payments found</h3></div></td></tr>
                )}
                {supplierPayments.map(p => (
                  <tr key={p.id}>
                    <td><span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13 }}>{formatDate(p.payment_date)}</span></td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{p.supplier_name}</div>
                      {p.grn_number && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>For GRN: {p.grn_number}</div>}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 600 }}>{p.reference_number || '-'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                        {p.payment_method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-right" style={{ fontWeight: 800, color: '#b91c1c', fontSize: 13 }}>{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
