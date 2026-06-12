import Sidebar from './Sidebar';
import Header from './Header';
import { Outlet, useLocation } from 'react-router-dom';

const PAGE_TITLES = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Welcome back — here\'s your overview' },
  '/customers': { title: 'Customers', subtitle: 'Manage customer profiles' },
  '/invoices': { title: 'Invoices', subtitle: 'Sales invoices and billing' },
  '/payments': { title: 'Payments', subtitle: 'Installment payment tracking' },
  '/inventory': { title: 'Inventory', subtitle: 'Products and stock management' },
  '/analytics': { title: 'Analytics', subtitle: 'Financial and sales reports' },
  '/warranty': { title: 'Warranty', subtitle: 'Warranty tracking and claims' },
};

export default function Layout() {
  const location = useLocation();
  const key = Object.keys(PAGE_TITLES).find(k => location.pathname.startsWith(k)) || '/dashboard';
  const { title, subtitle } = PAGE_TITLES[key] || { title: 'Orient Life CPD', subtitle: '' };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header title={title} subtitle={subtitle} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
