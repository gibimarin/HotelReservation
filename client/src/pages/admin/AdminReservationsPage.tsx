import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Eye,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  LogIn,
  LogOut,
  XCircle,
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import type {
  Reservation,
  PaginationMetadata,
  ReservationStatus,
} from '../../types';
import {
  formatCurrency,
  formatDate,
  calculateNightsBetween,
} from '../../utils/formatters';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const parsePositiveInt = (value: string | null, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const AdminReservationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [page, setPage] = useState<number>(
    parsePositiveInt(searchParams.get('page'), 1)
  );
  const [limit, setLimit] = useState<number>(
    parsePositiveInt(searchParams.get('limit'), 10)
  );
  const [status, setStatus] = useState<ReservationStatus | ''>(
    (searchParams.get('status') as ReservationStatus) || ''
  );
  const [searchInput, setSearchInput] = useState<string>(
    searchParams.get('search') || ''
  );
  const [searchTerm, setSearchTerm] = useState<string>(
    searchParams.get('search') || ''
  );
  const [startDate, setStartDate] = useState<string>(
    searchParams.get('startDate') || ''
  );
  const [endDate, setEndDate] = useState<string>(
    searchParams.get('endDate') || ''
  );
  const [sortBy, setSortBy] = useState<string>(
    searchParams.get('sortBy') || 'createdAt'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
  );

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected reservation details modal
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchReservations = async () => {
    if (startDate && endDate && startDate > endDate) {
      setError('Start date cannot be after the end date.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await adminApi.getReservations({
        page,
        limit,
        status: status || undefined,
        search: searchTerm || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortOrder,
      });

      if (page > result.pagination.totalPages) {
        setPage(result.pagination.totalPages);
        return;
      }

      setReservations(result.reservations);
      setPagination(result.pagination);
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
          'Failed to load reservations table.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
    // Sync URL search params
    const params: Record<string, string> = {
      page: String(page),
      limit: String(limit),
    };
    if (status) params.status = status;
    if (searchTerm) params.search = searchTerm;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (sortBy !== 'createdAt') params.sortBy = sortBy;
    if (sortOrder !== 'desc') params.sortOrder = sortOrder;
    setSearchParams(params, { replace: true });
  }, [
    page,
    limit,
    status,
    searchTerm,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  ]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchTerm(searchInput.trim());
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    Boolean(status) ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    sortBy !== 'createdAt' ||
    sortOrder !== 'desc';

  const selectedCheckIn = selectedRes ? new Date(selectedRes.checkIn) : null;
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const canCancelSelected =
    Boolean(selectedRes) &&
    (selectedRes?.status === 'pending' ||
      selectedRes?.status === 'confirmed') &&
    Boolean(selectedCheckIn && selectedCheckIn.getTime() >= todayStart.getTime());
  const canConfirmSelected = selectedRes?.status === 'pending';
  const canCheckInSelected = selectedRes?.status === 'confirmed';
  const canCheckOutSelected = selectedRes?.status === 'checked_in';

  const closeDetailsModal = () => {
    setSelectedRes(null);
    setActionError(null);
    setActionSuccess(null);
  };

  const handleStatusAction = async (nextStatus: ReservationStatus) => {
    if (!selectedRes) return;

    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      let updated: Reservation;
      if (nextStatus === 'checked_in') {
        updated = await adminApi.checkIn(selectedRes._id);
      } else if (nextStatus === 'checked_out') {
        updated = await adminApi.checkOut(selectedRes._id);
      } else {
        updated = await adminApi.updateReservationStatus(
          selectedRes._id,
          nextStatus
        );
      }

      setSelectedRes(updated);
      setActionSuccess(
        `Reservation ${updated.reference} is now ${nextStatus.replace('_', ' ')}.`
      );
      await fetchReservations();
    } catch (err: any) {
      setActionError(
        err.response?.data?.error?.message ||
          'Unable to update the reservation status.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Reservations Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Server-side paginated queries, instant guest search, and lifecycle status audits.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchReservations}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Data
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* Search Box */}
            <div className="lg:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by reference, guest name, or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Status Filter */}
            <div className="lg:col-span-2">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as ReservationStatus | '');
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked In</option>
                <option value="checked_out">Checked Out</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Check-in date range */}
            <div className="lg:col-span-2">
              <input
                type="date"
                aria-label="Check-in from date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="lg:col-span-2">
              <input
                type="date"
                aria-label="Check-in to date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Page Size */}
            <div className="lg:col-span-2">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Sorting */}
            <div className="lg:col-span-3">
              <select
                aria-label="Sort reservations by"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="createdAt">Newest booking</option>
                <option value="checkIn">Check-in date</option>
                <option value="checkOut">Check-out date</option>
                <option value="totalAmount">Total amount</option>
                <option value="reference">Reference</option>
              </select>
            </div>
            <div className="lg:col-span-2">
              <select
                aria-label="Sort direction"
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value as 'asc' | 'desc');
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            {/* Actions */}
            <div className="lg:col-span-3 flex items-center gap-2">
              <Button type="submit" variant="primary" size="md" className="flex-1">
                Apply Search
              </Button>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={handleResetFilters}
                >
                  Clear
                </Button>
              )}
            </div>

            <div className="lg:col-span-4 text-xs text-slate-500 lg:text-right">
              Showing {pagination.totalCount} matching reservation
              {pagination.totalCount === 1 ? '' : 's'}
            </div>
          </div>
        </form>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Querying database records..." className="py-20" />
        ) : reservations.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">
              No matching reservations found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search criteria or clear active status filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4">Guest</th>
                  <th className="py-3.5 px-4">Room Type</th>
                  <th className="py-3.5 px-4">Dates</th>
                  <th className="py-3.5 px-4">Total</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reservations.map((res) => {
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

                  return (
                    <tr
                      key={res._id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Reference */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-xs">
                        {res.reference}
                      </td>

                      {/* Guest */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {guestData?.name || 'Guest'}
                        </div>
                        <div className="text-xs text-slate-400">
                          {guestData?.email || 'N/A'}
                        </div>
                      </td>

                      {/* Room Type */}
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {roomData?.name || 'Standard'}
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-medium text-slate-900">
                          {formatDate(res.checkIn)} → {formatDate(res.checkOut)}
                        </div>
                        <div className="text-slate-400">
                          {nights} {nights === 1 ? 'night' : 'nights'} ({res.guestCount} guests)
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatCurrency(res.totalAmount)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={res.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedRes(res)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        <Pagination
          pagination={pagination}
          onPageChange={(newPage) => setPage(newPage)}
        />
      </div>

      {/* Reservation Details Inspection Modal */}
      <Modal
        isOpen={selectedRes !== null}
        onClose={closeDetailsModal}
        title="Reservation Details"
        maxWidth="lg"
      >
        {selectedRes && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Reference Code</span>
                <p className="font-mono font-bold text-lg text-slate-900">
                  {selectedRes.reference}
                </p>
              </div>
              <StatusBadge status={selectedRes.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-semibold block mb-1">Guest Information</span>
                <p className="font-bold text-slate-900 text-sm">
                  {typeof selectedRes.guest === 'object' ? (selectedRes.guest as any).name : 'Guest'}
                </p>
                <p className="text-slate-600">
                  {typeof selectedRes.guest === 'object' ? (selectedRes.guest as any).email : 'N/A'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-semibold block mb-1">Room Category</span>
                <p className="font-bold text-slate-900 text-sm">
                  {typeof selectedRes.roomType === 'object' ? (selectedRes.roomType as any).name : 'Room'}
                </p>
                <p className="text-slate-600">
                  Rate snapshot: {formatCurrency(selectedRes.priceSnapshot)}/night
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs py-2 border-y border-slate-100">
              <div>
                <span className="text-slate-400 block">Check-In</span>
                <span className="font-semibold text-slate-900 text-sm">
                  {formatDate(selectedRes.checkIn)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Check-Out</span>
                <span className="font-semibold text-slate-900 text-sm">
                  {formatDate(selectedRes.checkOut)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Total Billed</span>
                <span className="font-bold text-slate-900 text-sm text-brand-700">
                  {formatCurrency(selectedRes.totalAmount)}
                </span>
              </div>
            </div>

            {selectedRes.specialRequests && (
              <div className="text-xs">
                <span className="text-slate-400 font-semibold block mb-1">Special Requests</span>
                <p className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 italic">
                  "{selectedRes.specialRequests}"
                </p>
              </div>
            )}

            {selectedRes.cancellationReason && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-700">
                <span className="font-bold">Cancellation Reason: </span>
                {selectedRes.cancellationReason}
              </div>
            )}

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {actionError}
              </div>
            )}

            {actionSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
                {actionSuccess}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                {canConfirmSelected && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    onClick={() => handleStatusAction('confirmed')}
                    disabled={actionLoading}
                  >
                    Confirm
                  </Button>
                )}
                {canCheckInSelected && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<LogIn className="w-3.5 h-3.5" />}
                    onClick={() => handleStatusAction('checked_in')}
                    disabled={actionLoading}
                  >
                    Check In
                  </Button>
                )}
                {canCheckOutSelected && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<LogOut className="w-3.5 h-3.5" />}
                    onClick={() => handleStatusAction('checked_out')}
                    disabled={actionLoading}
                  >
                    Check Out
                  </Button>
                )}
                {canCancelSelected && (
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<XCircle className="w-3.5 h-3.5" />}
                    onClick={() => handleStatusAction('cancelled')}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={closeDetailsModal}
                disabled={actionLoading}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
