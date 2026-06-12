import { Bell, Moon, Sun } from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import { useTheme } from '../../context/ThemeContext';

export default function Header({ title, subtitle }) {
  const { theme, toggleTheme } = useTheme();
  const today = new Date();
  return (
    <header className="header">
      <div className="header-left">
        <div className="page-title">{title}</div>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      <div className="header-right">
        <div className="header-date">
          {today.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
        <button className="header-btn" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="header-btn" title="Notifications">
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
