import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { useAuth } from '../../context/AuthContext';
import { User, LogOut } from 'lucide-react';
import { Button } from '../common/Button';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Administrative Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Front Desk & Hotel Management Suite</span>
          </div>

          {/* User info & quick logout */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-medium text-xs border border-slate-200">
                <User className="w-4 h-4" />
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-900 block leading-tight">
                  {user?.name}
                </span>
                <span className="text-[10px] uppercase font-bold text-brand-600 block">
                  {user?.role}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
            >
              Sign Out
            </Button>
          </div>
        </header>

        {/* Dynamic Nested Route Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
