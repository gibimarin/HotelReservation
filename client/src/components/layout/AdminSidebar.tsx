import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  UserCheck,
  BedDouble,
  ArrowLeft,
  Hotel,
} from 'lucide-react';

export const AdminSidebar: React.FC = () => {
  const navItems = [
    {
      to: '/admin',
      label: 'Overview Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      end: true,
    },
    {
      to: '/admin/reservations',
      label: 'All Reservations',
      icon: <CalendarCheck className="w-5 h-5" />,
      end: false,
    },
    {
      to: '/admin/front-desk',
      label: 'Front Desk Operations',
      icon: <UserCheck className="w-5 h-5" />,
      end: false,
    },
    {
      to: '/admin/rooms',
      label: 'Rooms & Inventory',
      icon: <BedDouble className="w-5 h-5" />,
      end: false,
    },
  ];

  return (
    <aside className="w-64 bg-navy-900 text-slate-300 min-h-screen flex flex-col shrink-0 border-r border-navy-800">
      {/* Brand Header */}
      <div className="p-6 border-b border-navy-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white">
          <Hotel className="w-5 h-5" />
        </div>
        <div>
          <span className="text-base font-bold text-white block leading-tight">
            Staff Portal
          </span>
          <span className="text-[11px] font-medium text-brand-500 uppercase tracking-wider block">
            Management Suite
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-600 text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Back to Guest Website link */}
      <div className="p-4 border-t border-navy-800">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Guest View</span>
        </Link>
      </div>
    </aside>
  );
};

