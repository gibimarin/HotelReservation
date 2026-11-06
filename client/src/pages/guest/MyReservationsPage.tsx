import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  AlertCircle,
  XCircle,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { reservationApi } from '../../api/reservationApi';
import type { Reservation, PaginationMetadata } from '../../types';
import {
  formatCurrency,
  formatDate,
  calculateNightsBetween,
} from '../../utils/formatters';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Pagination } from '../../components/common/Pagination';
import { RoomImage } from '../../components/common/RoomImage';

export const MyReservationsPage: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation modal state
  const [cancellingRes, setCancellingRes] = useState<Reservation | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchReservations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await reservationApi.getMyReservations({
        page,
        limit: 10,
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
          'Failed to load your reservations.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [page]);

  const handleOpenCancelModal = (res: Reservation) => {
    setCancellingRes(res);
    setCancelReason('');
    setCancelError(null);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingRes) return;
    setIsCancelling(true);
    setCancelError(null);

    try {
      await reservationApi.cancel(cancellingRes._id, cancelReason);
      setSuccessMessage(
        `Reservation ${cancellingRes.reference} has been cancelled successfully. Your room inventory was released.`
      );
      setCancellingRes(null);
      await fetchReservations();
    } catch (err: any) {
      setCancelError(
        err.response?.data?.error?.message ||
          'Unable to cancel reservation. Please contact the front desk.'
      );
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            My Reservations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review your upcoming hotel stays, booking details, and manage cancellations.
          </p>
        </div>

        <Link to="/">
          <Button
            variant="outline"
            size="sm"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Explore More Rooms
          </Button>
        </Link>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <LoadingSpinner message="Retrieving your reservation records..." className="py-20" />
      )}

      {/* Empty State */}
      {!isLoading && !error && reservations.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs max-w-lg mx-auto">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            No Reservations Found
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            You don't have any hotel bookings yet. Check our available luxury suites to plan your next getaway.
          </p>
          <Link to="/">
            <Button variant="primary" size="md">
              Browse Available Rooms
            </Button>
          </Link>
        </div>
      )}

      {/* Reservations List */}
      {!isLoading && !error && reservations.length > 0 && (
        <div className="space-y-6">
          {reservations.map((res) => {
            const roomData =
              typeof res.roomType === 'object' && res.roomType !== null
                ? (res.roomType as any)
                : null;

            const nights = calculateNightsBetween(res.checkIn, res.checkOut);
            const checkInDate = new Date(res.checkIn);
            const todayStart = new Date();
            todayStart.setUTCHours(0, 0, 0, 0);
            const canCancel =
              (res.status === 'confirmed' || res.status === 'pending') &&
              checkInDate.getTime() >= todayStart.getTime();

            return (
              <div
                key={res._id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col md:flex-row"
              >
                {/* Room Image */}
                <div className="md:w-64 h-48 md:h-auto bg-slate-100 shrink-0 relative">
                  {roomData?.imageUrl ? (
                    <RoomImage
                      src={roomData.imageUrl}
                      alt={roomData.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Calendar className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 md:hidden">
                    <StatusBadge status={res.status} />
                  </div>
                </div>

                {/* Reservation Details */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header: Reference + Status badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                          Ref:
                        </span>
                        <span className="font-mono font-bold text-base text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                          {res.reference}
                        </span>
                      </div>

                      <div className="hidden md:block">
                        <StatusBadge status={res.status} />
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-4">
                      {roomData?.name || 'Grand Suite'}
                    </h3>

                    {/* Key Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs py-3 border-y border-slate-100 mb-4">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Check-In</span>
                        <span className="font-semibold text-slate-900 text-sm">
                          {formatDate(res.checkIn)}
                        </span>
                        <span className="text-[10px] text-slate-500 block">From 3:00 PM</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-0.5">Check-Out</span>
                        <span className="font-semibold text-slate-900 text-sm">
                          {formatDate(res.checkOut)}
                        </span>
                        <span className="text-[10px] text-slate-500 block">Until 11:00 AM</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-0.5">Duration & Party</span>
                        <span className="font-semibold text-slate-900 text-sm">
                          {nights} {nights === 1 ? 'Night' : 'Nights'}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {res.guestCount} {res.guestCount === 1 ? 'Guest' : 'Guests'}, {res.roomCount} Room
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-0.5">Total Paid / Due</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {formatCurrency(res.totalAmount)}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          ({formatCurrency(res.priceSnapshot)}/night)
                        </span>
                      </div>
                    </div>

                    {/* Special Requests or Cancellation Notice */}
                    {res.status === 'cancelled' && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-700 mb-2">
                        <span className="font-bold">Cancelled: </span>
                        {res.cancellationReason || 'Cancelled by guest request.'}
                      </div>
                    )}

                    {res.specialRequests && res.status !== 'cancelled' && (
                      <p className="text-xs text-slate-500 italic mb-2">
                        <span className="font-semibold text-slate-700 not-italic">Special Requests: </span>
                        "{res.specialRequests}"
                      </p>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Booked on {formatDate(res.createdAt)}
                    </span>

                    {canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenCancelModal(res)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        leftIcon={<XCircle className="w-3.5 h-3.5" />}
                      >
                        Cancel Reservation
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !error && pagination.totalPages > 1 && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      )}

      {/* Accessible Cancellation Confirmation Modal */}
      <Modal
        isOpen={cancellingRes !== null}
        onClose={() => setCancellingRes(null)}
        title="Cancel Hotel Reservation"
      >
        {cancellingRes && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to cancel reservation{' '}
              <strong className="text-slate-900 font-mono">
                {cancellingRes.reference}
              </strong>
              ?
            </p>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed">
              <strong>Notice:</strong> Your reserved rooms will be released immediately back into the available hotel inventory for other guests.
            </div>

            {cancelError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {cancelError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Reason for Cancellation (Optional)
              </label>
              <textarea
                rows={2}
                maxLength={300}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Schedule change, personal reasons..."
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="md"
                onClick={() => setCancellingRes(null)}
                disabled={isCancelling}
              >
                Keep Reservation
              </Button>

              <Button
                variant="danger"
                size="md"
                onClick={handleConfirmCancel}
                isLoading={isCancelling}
              >
                Yes, Cancel Reservation
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
