import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Check,
  ArrowLeft,
  Calendar,
  ShieldCheck,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { roomApi } from '../../api/roomApi';
import type { RoomType } from '../../types';
import {
  formatCurrency,
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

export const RoomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState<RoomType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill dates from query params if available, else default to today & tomorrow
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);

  const [checkIn, setCheckIn] = useState<string>(
    searchParams.get('checkIn') || toInputDateFormat(today)
  );
  const [checkOut, setCheckOut] = useState<string>(
    searchParams.get('checkOut') || toInputDateFormat(tomorrow)
  );
  const [guests, setGuests] = useState<number>(
    parsePositiveInt(searchParams.get('guests'), 2)
  );
  const requestedRooms = parsePositiveInt(searchParams.get('rooms'), 1);

  useEffect(() => {
    if (!id) return;

    const fetchRoom = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await roomApi.getRoomById(id);
        setRoom(data);
        setGuests((prev) => Math.min(prev, data.capacity * requestedRooms));
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Room not found.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [id, requestedRooms]);

  const nights = calculateNightsBetween(checkIn, checkOut);
  const maxGuests = room ? room.capacity * requestedRooms : 2;
  const estimatedTotal = room
    ? nights * room.pricePerNight * requestedRooms
    : 0;

  const handleProceedToBooking = () => {
    if (!room) return;
    navigate(
      `/booking/${room._id}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&rooms=${requestedRooms}`
    );
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading room details..." className="py-24" />;
  }

  if (error || !room) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Room Unavailable</h2>
        <p className="text-sm text-slate-600 mb-6">{error || 'This room type does not exist.'}</p>
        <Link to="/">
          <Button variant="primary">← Return to Rooms</Button>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb / Back Link */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to All Rooms
      </Link>

      {/* Main Grid: Left Details & Right Booking Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Image Gallery, Title, Description, Amenities */}
        <div className="lg:col-span-2 space-y-8">
          {/* Hero Image */}
          <div className="relative h-96 sm:h-[460px] w-full rounded-3xl overflow-hidden shadow-lg border border-slate-200">
            <RoomImage
              src={room.imageUrl}
              alt={room.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-brand-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
              Verified Premium Room
            </div>
          </div>

          {/* Title & Key Stats */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  {room.name}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Grand Vista Signature Hospitality
                </p>
              </div>

              <div className="sm:text-right">
                <span className="text-3xl font-black text-slate-900">
                  {formatCurrency(room.pricePerNight)}
                </span>
                <span className="text-xs text-slate-500 font-medium block">
                  per night (all taxes included)
                </span>
              </div>
            </div>

            {/* Quick Specs Badges */}
            <div className="flex flex-wrap items-center gap-3 pt-6">
              <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold">
                <Users className="w-4 h-4 text-brand-600" />
                Up to {room.capacity}
                {requestedRooms > 1 ? ` × ${requestedRooms} rooms` : ''} Guests
              </div>
              <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-brand-600" />
                Instant Confirmation
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-3">About This Room</h3>
            <p className="text-slate-600 text-base leading-relaxed whitespace-pre-line">
              {room.description}
            </p>
          </div>

          {/* Room Amenities & Facilities */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Included Room Facilities
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {room.facilities.map((facility, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs text-sm font-medium text-slate-700"
                >
                  <div className="w-6 h-6 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>{facility}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Booking Widget */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-200/50">
            <div className="pb-6 border-b border-slate-100 mb-6">
              <span className="text-xs uppercase font-bold text-brand-600 tracking-wider block mb-1">
                Reserve Your Stay
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">
                  {formatCurrency(room.pricePerNight)}
                </span>
                <span className="text-xs text-slate-500 font-medium">/ night</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Check-In */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-600" />
                  Check-In Date
                </label>
                <input
                  type="date"
                  min={minCheckIn}
                  value={checkIn}
                  onChange={(e) => {
                    setCheckIn(e.target.value);
                    const next = new Date(new Date(e.target.value).getTime() + 86400000);
                    setCheckOut(toInputDateFormat(next));
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Check-Out */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-600" />
                  Check-Out Date
                </label>
                <input
                  type="date"
                  min={minCheckOut}
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Guests */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-brand-600" />
                  Number of Guests
                </label>
                <select
                  value={guests}
                  onChange={(e) => setGuests(parseInt(e.target.value, 10))}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'Guest' : 'Guests'} (Max {maxGuests})
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Calculation Breakdown */}
              <div className="pt-4 border-t border-slate-100 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>
                    {formatCurrency(room.pricePerNight)} × {nights}{' '}
                    {nights === 1 ? 'night' : 'nights'}
                    {requestedRooms > 1 ? ` × ${requestedRooms} rooms` : ''}
                  </span>
                  <span>{formatCurrency(estimatedTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Taxes and Tourism Fees</span>
                  <span>$0 (Included)</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold text-base pt-2 border-t border-slate-100">
                  <span>Estimated Total</span>
                  <span className="text-brand-700">{formatCurrency(estimatedTotal)}</span>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full font-bold shadow-md shadow-brand-500/20 mt-4"
                onClick={handleProceedToBooking}
                disabled={nights < 1}
              >
                Proceed to Reservation
              </Button>

              <p className="text-[11px] text-center text-slate-400 pt-1">
                You won't be charged yet. Review your booking on the next screen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
