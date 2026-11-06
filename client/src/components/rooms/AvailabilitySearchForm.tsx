import React, { useState } from 'react';
import { Calendar, Users, Search, RotateCcw } from 'lucide-react';
import { toInputDateFormat } from '../../utils/formatters';
import { Button } from '../common/Button';

export interface SearchFormValues {
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

interface AvailabilitySearchFormProps {
  onSearch: (values: SearchFormValues) => void;
  onReset: () => void;
  isSearching: boolean;
  initialValues?: Partial<SearchFormValues>;
  hasActiveSearch: boolean;
}

export const AvailabilitySearchForm: React.FC<AvailabilitySearchFormProps> = ({
  onSearch,
  onReset,
  isSearching,
  initialValues,
  hasActiveSearch,
}) => {
  // Default check-in: today, default check-out: tomorrow
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);

  const [checkIn, setCheckIn] = useState<string>(
    initialValues?.checkIn || toInputDateFormat(today)
  );
  const [checkOut, setCheckOut] = useState<string>(
    initialValues?.checkOut || toInputDateFormat(tomorrow)
  );
  const [guests, setGuests] = useState<number>(initialValues?.guests || 2);
  const [rooms, setRooms] = useState<number>(initialValues?.rooms || 1);

  const minCheckIn = toInputDateFormat(today);

  // Minimum check-out is 1 day after checkIn
  const minCheckOut = (() => {
    const inDate = new Date(checkIn);
    const minOut = new Date(inDate.getTime() + 86400000);
    return toInputDateFormat(minOut);
  })();

  const handleCheckInChange = (newCheckIn: string) => {
    setCheckIn(newCheckIn);
    // If selected check-in is on or after current check-out, bump check-out by 1 day
    const inDate = new Date(newCheckIn);
    const outDate = new Date(checkOut);
    if (outDate <= inDate) {
      const nextDay = new Date(inDate.getTime() + 86400000);
      setCheckOut(toInputDateFormat(nextDay));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      checkIn,
      checkOut,
      guests,
      rooms,
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-4 sm:p-6 border border-slate-200/80 -mt-8 relative z-20 max-w-5xl mx-auto">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        {/* Check-In Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-brand-600" />
            Check-In
          </label>
          <input
            type="date"
            required
            min={minCheckIn}
            value={checkIn}
            onChange={(e) => handleCheckInChange(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-slate-50 hover:bg-white transition-colors"
          />
        </div>

        {/* Check-Out Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-brand-600" />
            Check-Out
          </label>
          <input
            type="date"
            required
            min={minCheckOut}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-slate-50 hover:bg-white transition-colors"
          />
        </div>

        {/* Guest Count */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-brand-600" />
            Guests
          </label>
          <select
            value={guests}
            onChange={(e) => setGuests(parseInt(e.target.value, 10))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-slate-50 hover:bg-white transition-colors"
          >
            <option value={1}>1 Guest</option>
            <option value={2}>2 Guests</option>
            <option value={3}>3 Guests</option>
            <option value={4}>4 Guests</option>
            <option value={5}>5 Guests</option>
            <option value={6}>6 Guests</option>
          </select>
        </div>

        {/* Room Count */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Rooms
          </label>
          <select
            value={rooms}
            onChange={(e) => setRooms(parseInt(e.target.value, 10))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-slate-50 hover:bg-white transition-colors"
          >
            <option value={1}>1 Room</option>
            <option value={2}>2 Rooms</option>
            <option value={3}>3 Rooms</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSearching}
            className="flex-1 h-[42px] font-semibold"
            leftIcon={<Search className="w-4 h-4" />}
          >
            Search
          </Button>

          {hasActiveSearch && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onReset}
              className="h-[42px] px-3"
              title="Reset Search to all rooms"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

