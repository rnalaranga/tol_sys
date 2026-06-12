import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { formatCurrency, formatDate, getStatusBadge } from '../utils/helpers';
import {
  Users, Package, FileText, CreditCard, AlertTriangle,
  TrendingUp, DollarSign, ShieldCheck, ArrowRight, Clock
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#1a56db', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [movement, setMovement] = useState({ topSelling: [], categoryBreakdown: [] });
  const [receivables, setReceivables] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/analytics/dashboard'),
      api.get('/analytics/revenue'),
      api.get('/analytics/products/movement?period=30&limit=5'),
      api.get('/analytics/receivables'),
    ]).then(([s, r, m, rec]) => {
      setStats(s.data.data);
      setRevenue(r.data.data);
      setMovement(m.data.data);
      setReceivables(rec.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-wrap"><div className="spinner" /><span>Loading dashboard...</span></div>;

  const aging = receivables?.aging || {};

  return (
    <div>
      {/* Stat Cards */}
      <div className="stats-grid">
        <StatCard icon={<DollarSign size={22} />} iconClass="blue" label="Total Revenue" value={formatCurrency(stats?.total_revenue)} sub="All time" />
        <StatCard icon={<TrendingUp size={22} />} iconClass="green" label="This Month" value={formatCurrency(stats?.month_revenue)} sub={`Collected: ${formatCurrency(stats?.month_collected)}`} />
        <StatCard icon={<CreditCard size={22} />} iconClass="amber" label="Outstanding" value={formatCurrency(stats?.total_outstanding)} sub="Receivables balance" />
        <StatCard icon={<AlertTriangle size={22} />} iconClass="red" label="Overdue" value={stats?.overdue_invoices || 0} sub="Invoices overdue" onClick={() => navigate('/invoices?status=overdue')} />
        <StatCard icon={<Users size={22} />} iconClass="navy" label="Customers" value={stats?.total_customers || 0} sub="Active customers" onClick={() => navigate('/customers')} />
        <StatCard icon={<Package size={22} />} iconClass="cyan" label="Products" value={stats?.total_products || 0} sub={`${stats?.low_stock_products || 0} low stock alerts`} onClick={() => navigate('/inventory?low_stock=true')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Revenue Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Revenue & Collection Trend — {new Date().getFullYear()}</span>
          </div>
          <div className="card-body chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenue} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a56db" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1a56db" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `Rs.${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#1a56db" fill="url(#revGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="collected" name="Collected" stroke="#10b981" fill="url(#colGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie */}
        <div className="card">
          <div className="card-header"><span className="card-title">Sales by Category</span></div>
          <div className="card-body chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={movement.categoryBreakdown} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name?.split(' ')[0]} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {movement.categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Top Selling */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Top Selling Products (30 days)</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/analytics')}>View All <ArrowRight size={13} /></button>
          </div>
          <div className="card-body chart-wrap" style={{ borderBottom: '1px solid var(--border)' }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={movement.topSelling} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(value, name) => [value, name === 'units_sold' ? 'Units Sold' : name]} />
                <Bar dataKey="units_sold" name="Units Sold" fill="#1a56db" radius={[0, 4, 4, 0]} barSize={16}>
                  {movement.topSelling.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="table-wrapper">
            <table className="table-pro">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>#</th>
                  <th>PRODUCT DETAILS</th>
                  <th style={{ textAlign: 'center' }}>UNITS</th>
                  <th className="text-right">REVENUE (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {movement.topSelling.length === 0 && <tr><td colSpan={4} className="text-center text-muted" style={{padding:24}}>No sales data yet</td></tr>}
                {movement.topSelling.map((p, i) => (
                  <tr key={i}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.brand}</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{p.units_sold}</td>
                    <td className="text-right" style={{ fontWeight: 700, color: '#1a56db', fontSize: 13 }}>{formatCurrency(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Receivables Aging</span></div>
          <div className="card-body">
            <div style={{ marginBottom: 16 }}>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={[
                  { name: 'Current', value: parseFloat(aging.current_due) || 0, fill: 'var(--primary)' },
                  { name: '1-30d', value: parseFloat(aging.overdue_30) || 0, fill: 'var(--warning)' },
                  { name: '31-60d', value: parseFloat(aging.overdue_60) || 0, fill: '#f97316' },
                  { name: '61-90d', value: parseFloat(aging.overdue_90) || 0, fill: 'var(--danger)' },
                  { name: '90d+', value: parseFloat(aging.overdue_90plus) || 0, fill: '#7f1d1d' },
                ]} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => formatCurrency(v)} cursor={{fill: 'transparent'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={30}>
                    {[{ fill: 'var(--primary)' }, { fill: 'var(--warning)' }, { fill: '#f97316' }, { fill: 'var(--danger)' }, { fill: '#7f1d1d' }].map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <AgingRow label="Current (not yet due)" amount={aging.current_due} color="var(--primary)" />
            <AgingRow label="1–30 Days Overdue" amount={aging.overdue_30} color="var(--warning)" />
            <AgingRow label="31–60 Days Overdue" amount={aging.overdue_60} color="#f97316" />
            <AgingRow label="61–90 Days Overdue" amount={aging.overdue_90} color="var(--danger)" />
            <AgingRow label="90+ Days Overdue" amount={aging.overdue_90plus} color="#7f1d1d" />
            <div className="divider" />
            <div className="flex-between">
              <span className="fw-700">Total Outstanding</span>
              <span className="amount fw-800 text-primary" style={{ fontSize: 16 }}>{formatCurrency(stats?.total_outstanding)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, iconClass, label, value, sub, onClick }) {
  return (
    <div className="stat-card" onClick={onClick} style={onClick ? { cursor: 'pointer' } : {}}>
      <div className={`stat-icon ${iconClass}`}>{icon}</div>
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

function AgingRow({ label, amount, color }) {
  return (
    <div className="flex-between" style={{ marginBottom: 12 }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <span className="amount fw-700" style={{ fontSize: 14, color }}>{formatCurrency(amount || 0)}</span>
    </div>
  );
}
