import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import './Sidebar.css';

export default function Sidebar() {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: '/agendamentos', icon: '—', label: 'Agendamentos' },
    { to: '/financeiro', icon: '—', label: 'Financeiro' },
    { to: '/produtos', icon: '—', label: 'Produtos' },
    { to: '/cadastros', icon: '—', label: 'Cadastros' },
  ];

  const getInitials = (nome) => {
    if (!nome) return 'U';
    return nome
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Menu"
      >
        {mobileOpen ? '×' : '≡'}
      </button>

      <div
        className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">GM</div>
          <div className="sidebar-brand">
            <span className="sidebar-brand-name">GMScheduler</span>
            <span className="sidebar-brand-sub">Sistema de Gestão</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={() => setMobileOpen(false)}
            >
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {getInitials(usuario?.nome)}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{usuario?.nome || 'Usuário'}</div>
              <div className="sidebar-user-role">{usuario?.perfil || 'admin'}</div>
            </div>
          </div>
          <button className="sidebar-logout" onClick={logout}>
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
