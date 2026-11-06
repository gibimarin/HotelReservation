import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Key,
  DoorOpen,
  RefreshCw,
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import type { Reservation } from '../../types';
import {
  formatDate,
  calculateNightsBetween,
} from '../../utils/formatters';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const FrontDeskPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'arrivals' | 'in_house'>('arrivals');

  const [arrivals, setArrivals] = useState<Reservation[]>([]);
  const [inHouse, setInHouse] = useState<Reservation[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchFrontDeskData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch confirmed arrivals
      const arrivalsRes = await adminApi.getReservations({
        status: 'confirmed',
        limit: 50,
        sortBy: 'checkIn',
        sortOrder: 'asc',
      });

      // 2. Fetch in-house checked-in guests
      const inHouseRes = await adminApi.getReservations({
        status: 'checked_in',
        limit: 50,
        sortBy: 'checkOut',
        sortOrder: 'asc',
      });

      setArrivals(arrivalsRes.reservations);
      setInHouse(inHouseRes.reservations);
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
          'Failed to load front desk records.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFrontDeskData();
  }, []);

  // Process check-in
  const handleCheckIn = async (res: Reservation) => {
    setActionLoadingId(res._id);
    setError(null);
    try {
      await adminApi.checkIn(res._id);
      const guestName =
        typeof res.guest === 'object' ? (res.guest as any).name : 'Guest';
      setSuccessMessage(
        `Success: ${guestName} (${res.reference}) checked in. Room key card assigned.`
      );
      await fetchFrontDeskData();
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
          'Failed to complete check-in operation.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // Process check-out
  const handleCheckOut = async (res: Reservation) => {
    setActionLoadingId(res._id);
    setError(null);
    try {
      await adminApi.checkOut(res._id);
      const guestName =
        typeof res.guest === 'object' ? (res.guest as any).name : 'Guest';
      setSuccessMessage(
        `Success: ${guestName} (${res.reference}) checked out. Bill closed successfully.`
      );
      await fetchFrontDeskData();
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
          'Failed to complete check-out operation.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter records by search text
  const currentList = activeTab === 'arrivals' ? arrivals : inHouse;
  const filteredList = currentList.filter((res) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const refMatch = res.reference.toLowerCase().includes(q);
    const guestNameMatch =
      typeof res.guest === 'object' &&
      (res.guest as any).name?.toLowerCase().includes(q);
    return refMatch || guestNameMatch;
  });

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Front Desk Operations Station
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Expedite guest check-in arrival key dispatch and departure check-out settlements.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchFrontDeskData}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Desk
        </Button>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs and Quick Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('arrivals')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'arrivals'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Expected Arrivals ({arrivals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('in_house')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'in_house'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <DoorOpen className="w-4 h-4" />
            <span>In-House Guests ({inHouse.length})</span>
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search desk by guest name or ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Desk Action Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Updating front desk manifest..." className="py-20" />
        ) : filteredList.length === 0 ? (
          <div className="text-center py-16 px-4">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">
              No guests found in this category
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {activeTab === 'arrivals'
                ? 'No pending arrivals awaiting check-in.'
                : 'No in-house guests currently awaiting check-out.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4">Guest Name</th>
                  <th className="py-3.5 px-4">Room Category</th>
                  <th className="py-3.5 px-4">Stay Dates</th>
                  <th className="py-3.5 px-4">Party & Rooms</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Desk Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredList.map((res) => {
                  const guestData =
                    typeof res.guest === 'object' && res.guest !== null
                      ? (res.guest as any)
                      : null;
                  const roomData =
                    typeof res.roomType === 'object' && res.roomType !== null
                      ? (res.roomType as any)
                      : null;
                  const nights = calculateNightsBetween(
                    res.checkIn,
                    res.checkOut
                  );
                  const isBusy = actionLoadingId === res._id;

                  return (
                    <tr
                      key={res._id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-xs">
                        {res.reference}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {guestData?.name || 'Guest'}
                        </div>
                        <div className="text-xs text-slate-400">
                          {guestData?.email || 'N/A'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {roomData?.name || 'Suite'}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-medium text-slate-900">
                          {formatDate(res.checkIn)} → {formatDate(res.checkOut)}
                        </div>
                        <div className="text-slate-400">
                          {nights} {nights === 1 ? 'night' : 'nights'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <span className="font-semibold text-slate-900">
                          {res.guestCount} {res.guestCount === 1 ? 'Guest' : 'Guests'}
                        </span>
                        <span className="text-slate-400 block">
                          {res.roomCount} room(s)
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={res.status} />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {activeTab === 'arrivals' && res.status === 'confirmed' && (
                          <Button
                            variant="primary"
                            size="sm"
                            isLoading={isBusy}
                            onClick={() => handleCheckIn(res)}
                            leftIcon={<Key className="w-3.5 h-3.5" />}
                          >
                            Check In
                          </Button>
                        )}

                        {activeTab === 'in_house' && res.status === 'checked_in' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            isLoading={isBusy}
                            onClick={() => handleCheckOut(res)}
                            leftIcon={<DoorOpen className="w-3.5 h-3.5" />}
                          >
                            Check Out
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
