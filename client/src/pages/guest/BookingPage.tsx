import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { roomApi } from '../../api/roomApi';
import { reservationApi } from '../../api/reservationApi';
import type { RoomType, Reservation } from '../../types';
import {
  formatCurrency,
  formatDate,
  toInputDateFormat,
  calculateNightsBetween,
} from '../../utils/formatters';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { RoomImage } from '../../components/common/RoomImage';

const parsePositiveInt = (value: string | null, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const BookingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const [room, setRoom] = useState<RoomType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Confirmed booking state
  const [confirmedReservation, setConfirmedReservation] = useState<Reservation | null>(null);

  // Form states
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);

  const [checkIn, setCheckIn] = useState<string>(
    searchParams.get('checkIn') || toInputDateFormat(today)
  );
  const [checkOut, setCheckOut] = useState<string>(
    searchParams.get('checkOut') || toInputDateFormat(tomorrow)
  );
  const [guestCount, setGuestCount] = useState<number>(
    parsePositiveInt(searchParams.get('guests'), 2)
  );
  const [roomCount, setRoomCount] = useState<number>(
    parsePositiveInt(searchParams.get('rooms'), 1)
  );
  const [specialRequests, setSpecialRequests] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    const fetchRoom = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await roomApi.getRoomById(id);
        setRoom(data);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load room details.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoom();
  }, [id]);

  const nights = calculateNightsBetween(checkIn, checkOut);
  const totalAmount = room ? nights * room.pricePerNight * roomCount : 0;
  const maxCapacity = room ? room.capacity * roomCount : 2;

  useEffect(() => {
    if (!room) return;
    setGuestCount((prev) => Math.min(prev, maxCapacity));
  }, [room, maxCapacity]);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;

    if (guestCount > maxCapacity) {
      setError(
        `Guest count (${guestCount}) exceeds the maximum capacity of ${maxCapacity} for ${roomCount} room(s).`
      );
      return;
    }

    if (nights < 1) {
      setError('Check-out date must be at least 1 day after check-in.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const reservation = await reservationApi.create({
        roomTypeId: room._id,
        checkIn,
        checkOut,
        guestCount,
        roomCount,
        specialRequests: specialRequests.trim() || undefined,
      });

      setConfirmedReservation(reservation);
    } catch (err: any) {
      const serverCode = err.response?.data?.error?.code;
      const message =
        err.response?.data?.error?.message ||
        'Unable to complete reservation. Please try again.';

      if (serverCode === 'INSUFFICIENT_INVENTORY') {
        setError(
          'Conflict: The requested room is no longer available for all selected dates. Another guest may have just reserved the last room.'
        );
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Preparing booking portal..." className="py-24" />;
  }

  // Success Confirmation Screen
  if (confirmedReservation) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-2xl text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-brand-600 block mb-1">
            Reservation Confirmed
          </span>

          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            We Look Forward to Welcoming You
          </h2>

          <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">
            Your reservation has been committed directly to the hotel management system.
          </p>

          {/* Reference Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 text-left space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs uppercase font-bold text-slate-500">
                Reservation Reference
              </span>
              <span className="text-lg font-mono font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-lg border border-brand-200">
                {confirmedReservation.reference}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block">Room Type</span>
                <span className="font-semibold text-slate-900 text-sm">
                  {typeof confirmedReservation.roomType === 'object'
                    ? (confirmedReservation.roomType as any).name
                    : room?.name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Total Amount</span>
                <span className="font-semibold text-slate-900 text-sm">
                  {formatCurrency(confirmedReservation.totalAmount)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Check-In</span>
                <span className="font-semibold text-slate-900">
                  {formatDate(confirmedReservation.checkIn)} (3:00 PM)
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Check-Out</span>
                <span className="font-semibold text-slate-900">
                  {formatDate(confirmedReservation.checkOut)} (11:00 AM)
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/my-reservations" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full font-bold">
                View in My Reservations
              </Button>
            </Link>
            <Link to="/" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-600 mb-4">Room information not found.</p>
        <Link to="/">
          <Button variant="primary">Return Home</Button>
        </Link>
      </div>
    );
  }

  const minCheckIn = toInputDateFormat(today);
  const minCheckOut = (() => {
    const inDate = new Date(checkIn);
    return toInputDateFormat(new Date(inDate.getTime() + 86400000));
  })();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        to={`/rooms/${room._id}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {room.name}
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Confirm Your Hotel Reservation
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your dates, guest preferences, and lock in your stay.
        </p>
      </div>

      {error && (
        <div className="mb-8 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Reservation Failed</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitBooking} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Booking Form Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Selected Room Preview Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-5 items-center">
            <RoomImage
              src={room.imageUrl}
              alt={room.name}
              className="w-full sm:w-44 h-28 object-cover rounded-xl"
            />
            <div className="flex-1">
              <span className="text-xs font-bold text-brand-600 uppercase tracking-wider block">
                Selected Suite
              </span>
              <h3 className="text-xl font-bold text-slate-900">{room.name}</h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                {room.description}
              </p>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1 font-medium">
                  <Users className="w-3.5 h-3.5 text-brand-600" />
                  Capacity: {room.capacity} per room
                </span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(room.pricePerNight)} / night
                </span>
              </div>
            </div>
          </div>

          {/* Stay Dates and Party Size */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600" />
              Dates & Occupancy
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Check-In Date
                </label>
                <input
                  type="date"
                  required
                  min={minCheckIn}
                  value={checkIn}
                  onChange={(e) => {
                    setCheckIn(e.target.value);
                    const next = new Date(new Date(e.target.value).getTime() + 86400000);
                    setCheckOut(toInputDateFormat(next));
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Check-Out Date
                </label>
                <input
                  type="date"
                  required
                  min={minCheckOut}
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Number of Guests
                </label>
                <select
                  value={guestCount}
                  onChange={(e) => setGuestCount(parseInt(e.target.value, 10))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {Array.from({ length: maxCapacity }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'Guest' : 'Guests'}
                    </option>
                  ))}
                </select>
                {guestCount > maxCapacity && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">
                    Exceeds capacity of {maxCapacity} for {roomCount} room(s).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Number of Rooms
                </label>
                <select
                  value={roomCount}
                  onChange={(e) => setRoomCount(parseInt(e.target.value, 10))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value={1}>1 Room</option>
                  <option value={2}>2 Rooms</option>
                  <option value={3}>3 Rooms</option>
                </select>
              </div>
            </div>
          </div>

          {/* Special Requests */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" />
              Special Requests (Optional)
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Early check-in, late arrival, quiet floor preference, or dietary notes.
            </p>
            <textarea
              rows={3}
              maxLength={500}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Let the front desk know if you have specific preferences..."
              className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Right Column: Guaranteed Price Breakdown & Submit */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-200/50 sticky top-24">
            <h3 className="text-base font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
              Price Summary
            </h3>

            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Room Rate</span>
                <span>{formatCurrency(room.pricePerNight)} / night</span>
              </div>

              <div className="flex justify-between">
                <span>Stay Duration</span>
                <span className="font-medium text-slate-900">
                  {nights} {nights === 1 ? 'night' : 'nights'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Rooms</span>
                <span className="font-medium text-slate-900">{roomCount} room(s)</span>
              </div>

              <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span>Taxes & Service</span>
                <span>$0.00 (Included)</span>
              </div>

              <div className="flex justify-between text-lg font-black text-slate-900 pt-4 border-t border-slate-200">
                <span>Total Amount</span>
                <span className="text-brand-700">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
                <span>Price locked at booking. No hidden transaction fees.</span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full font-bold shadow-md shadow-brand-500/20"
                isLoading={isSubmitting}
                disabled={nights < 1 || guestCount > maxCapacity}
              >
                Confirm & Book Now
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
