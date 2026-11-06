import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCheck,
  UserMinus,
  BedDouble,
  Clock,
  CheckCircle,
  Hotel,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import type { DashboardMetrics } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';

export const AdminDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getDashboardMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
          'Failed to load operational dashboard metrics.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (isLoading) {
    return <LoadingSpinner message="Calculating real-time hotel metrics..." className="py-24" />;
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Hotel Operations Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time occupancy status, arrivals, departures, and inventory pulse.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchMetrics}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Live Data
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Today's Expected Arrivals */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Today's Arrivals
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900">
                {metrics.todaysArrivals}
              </span>
              <Link
                to="/admin/front-desk"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                Front Desk <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Guests scheduled to check in today
            </p>
          </div>

          {/* 2. Today's Expected Departures */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Today's Departures
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <UserMinus className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900">
                {metrics.todaysDepartures}
              </span>
              <Link
                to="/admin/front-desk"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                Front Desk <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Guests scheduled to check out today
            </p>
          </div>

          {/* 3. Currently Occupied Rooms */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Occupied Rooms
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BedDouble className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900">
                {metrics.occupiedRooms}
              </span>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Live In-House
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Rooms currently occupied by checked-in guests
            </p>
          </div>

          {/* 4. Confirmed Upcoming Reservations */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Confirmed Reservations
              </span>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900">
                {metrics.confirmedReservations}
              </span>
              <Link
                to="/admin/reservations?status=confirmed"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                View List <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Future confirmed stays on the calendar
            </p>
          </div>

          {/* 5. Pending Bookings */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pending Bookings
              </span>
              <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900">
                {metrics.pendingReservations}
              </span>
              <Link
                to="/admin/reservations?status=pending"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                Review <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Reservations requiring staff confirmation
            </p>
          </div>

          {/* 6. Active Room Types */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Room Types
              </span>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Hotel className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900">
                {metrics.totalActiveRooms}
              </span>
              <Link
                to="/admin/rooms"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                Manage Inventory <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Room categories active for customer booking
            </p>
          </div>
        </div>
      )}

      {/* Quick Operation Hub */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-600" />
          Front Desk Quick Actions
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Access high-frequency staff tools with one click:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/admin/front-desk"
            className="p-4 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/40 transition-all group"
          >
            <UserCheck className="w-6 h-6 text-brand-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-sm font-bold text-slate-900">
              Front Desk Station
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Process guest arrivals and departures with instant key dispatch.
            </p>
          </Link>

          <Link
            to="/admin/reservations"
            className="p-4 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/40 transition-all group"
          >
            <Clock className="w-6 h-6 text-navy-800 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-sm font-bold text-slate-900">
              Reservation Search
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Server-side paginated lookup with instant reference & guest filtering.
            </p>
          </Link>

          <Link
            to="/admin/rooms"
            className="p-4 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/40 transition-all group"
          >
            <BedDouble className="w-6 h-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-sm font-bold text-slate-900">
              Rooms & Pricing
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Update nightly rates, amenities, and activate/deactivate room types.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};
