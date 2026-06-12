import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Filter, X, Calendar } from 'lucide-react';

export default function AdvancedFilterBar({ filters, setFilters, onApply }) {
  const [customers, setCustomers] = useState([]);
  const [salesReps, setSalesReps] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/customers', { params: { limit: 1000 } }),
      api.get('/sales_persons', { params: { limit: 1000 } })
    ]).then(([custRes, salesRes]) => {
      setCustomers(custRes.data.data);
      setSalesReps(salesRes.data.data);
    }).catch(console.error);
  }, []);

  const handleChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({ startDate: '', endDate: '', customer_id: '', sales_person_id: '' });
    if (onApply) setTimeout(onApply, 50);
  };

  return (
    <div style={{ 
      display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', 
      padding: '16px 24px', 
      borderBottom: '1px solid var(--table-border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
        <Filter size={15} style={{ color: 'var(--primary)' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filters</span>
      </div>
      
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--glass-bg)', padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--table-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
        <input 
          type="date" 
          style={{ width: 110, border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: 'var(--text)', padding: 0 }} 
          value={filters.startDate || ''} 
          onChange={e => handleChange('startDate', e.target.value)} 
        />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>TO</span>
        <input 
          type="date" 
          style={{ width: 110, border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: 'var(--text)', padding: 0 }} 
          value={filters.endDate || ''} 
          onChange={e => handleChange('endDate', e.target.value)} 
        />
      </div>

      <select 
        style={{ width: 180, padding: '7px 12px', fontSize: 12.5, background: 'var(--glass-bg)', border: '1px solid var(--table-border)', borderRadius: 'var(--radius)', color: 'var(--text)', outline: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} 
        value={filters.customer_id || ''} 
        onChange={e => handleChange('customer_id', e.target.value)}
      >
        <option value="">All Customers</option>
        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <select 
        style={{ width: 160, padding: '7px 12px', fontSize: 12.5, background: 'var(--glass-bg)', border: '1px solid var(--table-border)', borderRadius: 'var(--radius)', color: 'var(--text)', outline: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} 
        value={filters.sales_person_id || ''} 
        onChange={e => handleChange('sales_person_id', e.target.value)}
      >
        <option value="">All Sales Reps</option>
        {salesReps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      <button className="btn btn-primary" style={{ padding: '6px 16px', fontSize: 12.5, borderRadius: 'var(--radius-sm)' }} onClick={onApply}>
        Apply
      </button>
      
      {(filters.startDate || filters.endDate || filters.customer_id || filters.sales_person_id) && (
        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12.5, color: 'var(--danger)', borderRadius: 'var(--radius-sm)' }} onClick={clearFilters}>
          <X size={14} style={{ marginRight: 4 }} /> Clear
        </button>
      )}
    </div>
  );
}
