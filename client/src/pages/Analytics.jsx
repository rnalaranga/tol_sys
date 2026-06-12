import { useEffect, useState } from 'react';
import api from '../api/axios';
import { formatCurrency, formatDate } from '../utils/helpers';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, Award } from 'lucide-react';

const COLORS = ['#1a56db', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316'];

export default function Analytics() {
  const [revenue, setRevenue] = useState([]);
  const [movement, setMovement] = useState({ topSelling: [], categoryBreakdown: [], slowMoving: [] });
  const [advanced, setAdvanced] = useState({ brandBreakdown: [], supplierVolume: [], profitTrend: [] });
  const [receivables, setReceivables] = useState(null);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/analytics/revenue'),
      api.get(`/analytics/products/movement?period=${period}&limit=10`),
      api.get(`/analytics/advanced?period=${period}`),
      api.get('/analytics/receivables'),
    ]).then(([r, m, adv, rec]) => {
      setRevenue(r.data.data);
      setMovement(m.data.data);
      setAdvanced(adv.data.data);
      setReceivables(rec.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [period]);

  if (loading) return <div className="loading-wrap"><div className="spinner" /><span>Loading analytics...</span></div>;

  const aging = receivables?.aging || {};
  const totalAging = Object.values(aging).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">Analytics & Reports</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['7', '7 Days'], ['30', '30 Days'], ['90', '90 Days'], ['365', '1 Year']].map(([v, l]) => (
            <button key={v} className={`btn btn-sm ${period === v ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPeriod(v)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="card mb-20">
        <div className="card-header"><span className="card-title">Monthly Revenue vs Collection — {new Date().getFullYear()}</span></div>
        <div className="card-body chart-wrap">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenue} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `Rs.${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#1a56db" radius={[4, 4, 0, 0]} />
              <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gross Profit Trend */}
      <div className="card mb-20">
        <div className="card-header"><span className="card-title">Monthly Gross Profit Trend — {new Date().getFullYear()}</span></div>
        <div className="card-body chart-wrap">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={advanced.profitTrend} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `Rs.${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend />
              <Area type="monotone" dataKey="profit" name="Gross Profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Top Selling Products */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><Award size={15} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--warning)' }} />Top Selling Products</span>
            <span className="badge badge-gray">Last {period} days</span>
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
                  <th style={{ textAlign: 'center' }}>UNITS SOLD</th>
                  <th className="text-right">REVENUE (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {movement.topSelling.length === 0 && <tr><td colSpan={4} className="text-center text-muted" style={{ padding: 24 }}>No sales data for this period</td></tr>}
                {movement.topSelling.map((p, i) => (
                  <tr key={p.id}>
                    <td style={{ textAlign: 'center' }}><span style={{ width: 22, height: 22, borderRadius: '50%', background: i < 3 ? ['#fbbf24', '#9ca3af', '#cd7c2f'][i] : 'var(--bg)', color: i < 3 ? 'white' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{i + 1}</span></td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.brand} · STOCK: {p.current_stock}</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{p.units_sold}</td>
                    <td className="text-right" style={{ fontWeight: 700, color: '#1a56db', fontSize: 13 }}>{formatCurrency(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Slow Moving */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><TrendingDown size={15} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--danger)' }} />Slow Moving Items</span>
            <span className="badge badge-gray">Last {period} days</span>
          </div>
          <div className="card-body chart-wrap" style={{ borderBottom: '1px solid var(--border)' }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={movement.slowMoving} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(value, name) => [value, name === 'current_stock' ? 'Stock Level' : name]} />
                <Bar dataKey="current_stock" name="Stock Level" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={16}>
                  {movement.slowMoving.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.units_sold === 0 ? '#ef4444' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="table-wrapper">
            <table className="table-pro">
              <thead>
                <tr>
                  <th>PRODUCT DETAILS</th>
                  <th style={{ textAlign: 'center', width: 100 }}>STOCK</th>
                  <th style={{ textAlign: 'center', width: 100 }}>SOLD</th>
                </tr>
              </thead>
              <tbody>
                {movement.slowMoving.map((p, i) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.brand}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: '#fffbeb', color: '#f59e0b', border: '1px solid #fbbf24' }}>{p.current_stock}</span></td>
                    <td style={{ textAlign: 'center', fontWeight: p.units_sold === 0 ? 800 : 600, color: p.units_sold === 0 ? '#ef4444' : 'var(--text-secondary)', fontSize: 13 }}>{p.units_sold || 0}</td>
                  </tr>
                ))}
                {movement.slowMoving.length === 0 && <tr><td colSpan={3} className="text-center text-muted" style={{ padding: 24 }}>No data available</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Category Breakdown */}
        <div className="card">
          <div className="card-header"><span className="card-title">Sales by Category</span></div>
          <div className="card-body chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={movement.categoryBreakdown} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={90}
                  label={({ name, percent }) => `${name?.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}>
                  {movement.categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              {movement.categoryBreakdown.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                  {c.category} ({c.units_sold} units)
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Aging Receivables */}
        <div className="card">
          <div className="card-header"><span className="card-title">Receivables Aging Report</span></div>
          <div className="card-body">
            <div style={{ marginBottom: 20 }}>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={[
                  { name: 'Current', value: parseFloat(aging.current_due) || 0, fill: '#1a56db' },
                  { name: '1-30d', value: parseFloat(aging.overdue_30) || 0, fill: '#f59e0b' },
                  { name: '31-60d', value: parseFloat(aging.overdue_60) || 0, fill: '#f97316' },
                  { name: '61-90d', value: parseFloat(aging.overdue_90) || 0, fill: '#ef4444' },
                  { name: '90d+', value: parseFloat(aging.overdue_90plus) || 0, fill: '#7f1d1d' },
                ]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => formatCurrency(v)} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {[{ fill: '#1a56db' }, { fill: '#f59e0b' }, { fill: '#f97316' }, { fill: '#ef4444' }, { fill: '#7f1d1d' }].map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {[
              { label: 'Current', value: aging.current_due, color: 'var(--primary)' },
              { label: '1–30 Days', value: aging.overdue_30, color: 'var(--warning)' },
              { label: '31–60 Days', value: aging.overdue_60, color: '#f97316' },
              { label: '61–90 Days', value: aging.overdue_90, color: 'var(--danger)' },
              { label: '90+ Days', value: aging.overdue_90plus, color: '#7f1d1d' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex-between" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13 }}>{label}</span>
                </div>
                <span className="fw-700 amount" style={{ color }}>{formatCurrency(value || 0)}</span>
              </div>
            ))}
            <div className="divider" />
            <div className="flex-between fw-800">
              <span>Total Outstanding</span>
              <span className="text-primary" style={{ fontSize: 16 }}>{formatCurrency(totalAging)}</span>
            </div>
          </div>
        </div>

        {/* Brand Breakdown */}
        <div className="card">
          <div className="card-header"><span className="card-title">Sales by Brand</span></div>
          <div className="card-body chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={advanced.brandBreakdown} dataKey="revenue" nameKey="brand" cx="50%" cy="50%" outerRadius={90}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {advanced.brandBreakdown.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              {advanced.brandBreakdown.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[(i + 3) % COLORS.length] }} />
                  {b.brand} ({b.units_sold} units)
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Supplier Volume */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Purchase Volume by Supplier</span>
            <span className="badge badge-gray">Last {period} days</span>
          </div>
          <div className="card-body chart-wrap" style={{ borderBottom: '1px solid var(--border)' }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={advanced.supplierVolume} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="supplier" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(value, name) => [value, name === 'total_volume' ? 'Purchase Volume' : name]} />
                <Bar dataKey="total_volume" name="Purchase Volume" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={16}>
                  {advanced.supplierVolume.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 5) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
