import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, Package, FileText, CreditCard,
  BarChart3, Shield, LogOut, Truck, Container, List, Briefcase
} from 'lucide-react';

export default function Sidebar({ isOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-logo">
          <div className="brand-icon">OL</div>
          <span className="brand-name">The Orient Life</span>
        </div>
        <div className="brand-sub">Consumer Products Division</div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main</div>
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
          <LayoutDashboard size={16} /> Dashboard
        </NavLink>
        <NavLink to="/customers" className={({ isActive }) => isActive ? 'active' : ''}>
          <Users size={16} /> Customers
        </NavLink>
        <NavLink to="/sales-persons" className={({ isActive }) => isActive ? 'active' : ''}>
          <Briefcase size={16} /> Sales Reps
        </NavLink>

        <div className="sidebar-section-label">Sales</div>
        <NavLink to="/invoices" className={({ isActive }) => isActive ? 'active' : ''}>
          <FileText size={16} /> Invoices
        </NavLink>
        <NavLink to="/payments" className={({ isActive }) => isActive ? 'active' : ''}>
          <CreditCard size={16} /> Payments
        </NavLink>
        <NavLink to="/all-installments" className={({ isActive }) => isActive ? 'active' : ''}>
          <List size={16} /> All Installments
        </NavLink>

        <div className="sidebar-section-label">Inventory & Purchases</div>
        <NavLink to="/inventory" className={({ isActive }) => isActive ? 'active' : ''}>
          <Package size={16} /> Inventory
        </NavLink>
        <NavLink to="/suppliers" className={({ isActive }) => isActive ? 'active' : ''}>
          <Truck size={16} /> Suppliers
        </NavLink>
        <NavLink to="/grn" className={({ isActive }) => isActive ? 'active' : ''}>
          <Container size={16} /> GRN (Purchases)
        </NavLink>

        <div className="sidebar-section-label">Reports</div>
        <NavLink to="/analytics" className={({ isActive }) => isActive ? 'active' : ''}>
          <BarChart3 size={16} /> Analytics
        </NavLink>
        <NavLink to="/warranty" className={({ isActive }) => isActive ? 'active' : ''}>
          <Shield size={16} /> Warranty
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={handleLogout} title="Logout">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role} · Logout</div>
          </div>
          <LogOut size={14} style={{ color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }} />
        </div>
      </div>
    </aside>
  );
}
