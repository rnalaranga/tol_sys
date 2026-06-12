import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { formatCurrency, formatDate, getStatusBadge, capitalize } from '../utils/helpers';
import { Search, CreditCard, AlertTriangle, Clock, CheckCircle, Filter, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import AdvancedFilterBar from '../components/common/AdvancedFilterBar';

const STATUS_COLORS = {
  paid: '#10b981', overdue: '#ef4444', pending: '#f59e0b', partial: '#06b6d4'
};

export default function AllInstallments() {
  const [installments, setInstallments] = useState([]);
  const [summary, setSummary] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [freqFilter, setFreqFilter] = useState('');
  const [page, setPage] = useState(1);
  const [advFilters, setAdvFilters] = useState({ startDate: '', endDate: '', customer_id: '', sales_person_id: '' });
  const navigate = useNavigate();
  const limit = 80;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [inst, sum] = await Promise.all([
        api.get('/installments', { params: { search, status: statusFilter, frequency: freqFilter, customer_id: advFilters.customer_id, sales_person_id: advFilters.sales_person_id, startDate: advFilters.startDate, endDate: advFilters.endDate, page, limit } }),
        api.get('/installments/summary'),
      ]);
      setInstallments(inst.data.data);
      setTotal(inst.data.total);
      setSummary(sum.data.data);
    } catch { toast.error('Failed to load installments'); }
    finally { setLoading(false); }
  }, [search, statusFilter, freqFilter, page, advFilters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  const freqLabel = (f) => ({ monthly: 'Monthly', weekly: 'Weekly', daily: 'Daily' }[f] || 'Monthly');

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title">All Installments</div>
          <div className="page-header-sub">{total} installments across all invoices</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchData}><RefreshCw size={14} /> Refresh</button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        {[
          { label: 'Overdue', value: summary.total_overdue || 0, sub: formatCurrency(summary.amount_overdue), color: 'red', icon: <AlertTriangle size={20} />, filter: 'overdue' },
          { label: 'Pending', value: summary.total_pending || 0, sub: formatCurrency(summary.amount_pending), color: 'amber', icon: <Clock size={20} />, filter: 'pending' },
          { label: 'Partial', value: summary.total_partial || 0, sub: 'Partly paid', color: 'cyan', icon: <CreditCard size={20} />, filter: 'partial' },
          { label: 'Paid', value: summary.total_paid || 0, sub: 'Completed', color: 'green', icon: <CheckCircle size={20} />, filter: 'paid' },
        ].map(c => (
          <div key={c.label} className="stat-card" style={{ cursor: 'pointer', borderColor: statusFilter === c.filter ? 'var(--primary)' : 'var(--border)' }}
            onClick={() => { setStatusFilter(prev => prev === c.filter ? '' : c.filter); setPage(1); }}>
            <div className={`stat-icon ${c.color}`}>{c.icon}</div>
            <div className="stat-info">
              <div className="stat-label">{c.label}</div>
              <div className="stat-value">{c.value}</div>
              <div className="stat-sub">{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <AdvancedFilterBar filters={advFilters} setFilters={setAdvFilters} onApply={() => setPage(1)} />
        {/* Filters */}
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="search-input-wrap" style={{ margin: 0, maxWidth: 280 }}>
            <Search size={14} />
            <input placeholder="Customer, invoice no..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ fontSize: 13 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Status filter pills */}
            {['', 'overdue', 'pending', 'partial', 'paid'].map(s => (
              <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                style={{ fontSize: 12, padding: '5px 12px' }}>
                {s ? capitalize(s) : 'All'}
              </button>
            ))}
            <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
            {/* Frequency filter */}
            {['', 'monthly', 'weekly', 'daily'].map(f => (
              <button key={f} className={`btn btn-sm ${freqFilter === f ? 'btn-outline' : 'btn-ghost'}`}
                onClick={() => { setFreqFilter(f); setPage(1); }}
                style={{ fontSize: 12, padding: '5px 12px' }}>
                {f ? freqLabel(f) : 'All Freq.'}
              </button>
            ))}
          </div>
        </div>

        {/* COMPACT EXCEL-LIKE TABLE */}
        <div className="table-wrapper">
          <table className="table-pro">
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>#</th>
                <th>INVOICE</th>
                <th>CUSTOMER</th>
                <th style={{ width: 90 }}>FREQ.</th>
                <th style={{ width: 80, textAlign: 'center' }}>INST. #</th>
                <th style={{ width: 100 }}>DUE DATE</th>
                <th className="text-right">AMOUNT DUE</th>
                <th className="text-right">PAID</th>
                <th className="text-right">BALANCE</th>
                <th style={{ textAlign: 'center', width: 90 }}>STATUS</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={11} style={{ padding: '30px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Loading...
                  </div>
                </td></tr>
              )}
              {!loading && installments.length === 0 && (
                <tr><td colSpan={11} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No installments found
                </td></tr>
              )}
              {installments.map((inst, idx) => {
                const balance = parseFloat(inst.amount_due) - parseFloat(inst.amount_paid);
                const isOverdue = inst.status === 'overdue';
                const rowBg = isOverdue ? 'var(--danger-bg)' : inst.status === 'paid' ? 'var(--success-bg)' : 'transparent';
                return (
                  <tr key={inst.id} style={{ background: rowBg }}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        onClick={() => navigate('/invoices')}>{inst.invoice_number}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12.5 }}>{inst.customer_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{inst.customer_code} · {inst.customer_phone}</div>
                    </td>
                    <td>
                      <span className="badge badge-gray" style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase' }}>
                        {freqLabel(inst.installment_frequency)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 12.5 }}>
                      {inst.installment_number} / {inst.installment_months}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: isOverdue ? 'var(--danger)' : 'var(--text)', fontWeight: isOverdue ? 700 : 500, fontSize: 12.5 }}>
                      {formatDate(inst.due_date)}
                    </td>
                    <td className="text-right" style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: 12.5 }}>
                      {formatCurrency(inst.amount_due)}
                    </td>
                    <td className="text-right" style={{ color: 'var(--success)', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 12.5 }}>
                      {formatCurrency(inst.amount_paid)}
                    </td>
                    <td className="text-right" style={{ whiteSpace: 'nowrap', fontWeight: 700, fontSize: 13, color: balance > 0 ? (isOverdue ? 'var(--danger)' : 'var(--text)') : 'var(--success)' }}>
                      {formatCurrency(Math.max(0, balance))}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${inst.status === 'paid' ? 'badge-success' : inst.status === 'overdue' ? 'badge-danger' : inst.status === 'partial' ? 'badge-info' : 'badge-warning'}`} style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>
                        {inst.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {inst.status !== 'paid' && (
                        <button className="btn btn-primary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }}
                          onClick={() => navigate('/invoices')}>Pay</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination" style={{ gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 8 }}>
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} style={{ width: 28, height: 28, fontSize: 12 }}
                onClick={() => setPage(p)}>{p}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
