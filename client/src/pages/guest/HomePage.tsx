import React, { useState, useEffect } from 'react';
import { Wifi, Sparkles, Coffee, ShieldCheck, AlertCircle } from 'lucide-react';
import { roomApi } from '../../api/roomApi';
import type { RoomType, AvailableRoomOption, AvailabilitySearchResult } from '../../types';
import { RoomCard } from '../../components/rooms/RoomCard';
import {
  AvailabilitySearchForm,
  type SearchFormValues,
} from '../../components/rooms/AvailabilitySearchForm';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { formatDate } from '../../utils/formatters';

export const HomePage: React.FC = () => {
  const [allRooms, setAllRooms] = useState<RoomType[]>([]);
  const [availableOptions, setAvailableOptions] = useState<AvailableRoomOption[] | null>(null);
  const [searchMeta, setSearchMeta] = useState<AvailabilitySearchResult | null>(null);
  const [activeSearchParams, setActiveSearchParams] = useState<SearchFormValues | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all active room types on mount
  const fetchAllRooms = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await roomApi.getActiveRooms();
      setAllRooms(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load rooms.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllRooms();
  }, []);

  // Handle availability search submission
  const handleSearch = async (values: SearchFormValues) => {
    setIsSearching(true);
    setError(null);
    try {
      const result = await roomApi.searchAvailability({
        checkIn: values.checkIn,
        checkOut: values.checkOut,
        guests: values.guests,
        rooms: values.rooms,
      });

      setSearchMeta(result);
      setAvailableOptions(result.availableRooms);
      setActiveSearchParams(values);
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
          'Failed to check availability. Please verify dates.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Reset search back to default all rooms
  const handleResetSearch = () => {
    setAvailableOptions(null);
    setSearchMeta(null);
    setActiveSearchParams(null);
    setError(null);
  };

  return (
    <div>
      {/* Hero Section */}
      <div className="relative bg-navy-900 text-white pb-20 pt-16 sm:pb-28 sm:pt-24 overflow-hidden">
        {/* Background Image with Dark Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2000&q=80"
            alt="Grand Vista Luxury Hotel"
            className="w-full h-full object-cover opacity-25 filter brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/60 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30 mb-4 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Five-Star Coastal Sanctuary
          </span>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Elevate Your Stay in Pure Elegance
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Experience bespoke hospitality, oceanfront vistas, and exquisite suites tailored for unforgettable moments.
          </p>
        </div>
      </div>

      {/* Floating Availability Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AvailabilitySearchForm
          onSearch={handleSearch}
          onReset={handleResetSearch}
          isSearching={isSearching}
          hasActiveSearch={availableOptions !== null}
        />
      </div>

      {/* Main Content Area */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Section Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-6 w-1 rounded-full bg-brand-600 block" />
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {searchMeta
                  ? `Available Rooms (${availableOptions?.length || 0})`
                  : 'Handcrafted Rooms & Suites'}
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500 pl-3">
              {searchMeta
                ? `Showing rooms available for ${searchMeta.nights} night(s) from ${formatDate(
                    searchMeta.checkIn
                  )} to ${formatDate(searchMeta.checkOut)}`
                : 'Browse our signature room collection for the ultimate escape.'}
            </p>
          </div>

          {searchMeta && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetSearch}
              className="self-start sm:self-auto"
            >
              Clear Filter & Show All
            </Button>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to load rooms</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAllRooms}>
              Retry
            </Button>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && <LoadingSpinner message="Loading rooms..." />}

        {/* Rooms Grid */}
        {!isLoading && !error && (
          <>
            {/* When search filter is active */}
            {availableOptions !== null ? (
              availableOptions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {availableOptions.map((opt) => (
                    <RoomCard
                      key={opt.roomType._id}
                      room={opt.roomType}
                      availableOption={opt}
                      searchParams={activeSearchParams || undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 max-w-lg mx-auto shadow-xs">
                  <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    No Rooms Available for Selected Dates
                  </h3>
                  <p className="text-sm text-slate-500 mb-6">
                    All rooms are sold out or cannot accommodate {activeSearchParams?.guests} guest(s) for the chosen dates. Try shifting your check-in date or reducing guest count.
                  </p>
                  <Button variant="primary" size="md" onClick={handleResetSearch}>
                    View All Room Types
                  </Button>
                </div>
              )
            ) : (
              /* When viewing all active rooms */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {allRooms.map((room) => (
                  <RoomCard key={room._id} room={room} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Hotel Highlights & Features */}
      <section className="bg-slate-100/70 border-t border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h3 className="text-xs font-bold text-brand-700 uppercase tracking-widest mb-2">
              The Grand Vista Experience
            </h3>
            <h2 className="text-3xl font-extrabold text-slate-900">
              Why Guests Choose Us
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
                <Wifi className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">
                Gigabit Wi-Fi
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Complimentary ultra-high-speed fiber wireless throughout all suites and private cabanas.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
                <Coffee className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">
                Artisan Breakfast
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Gourmet organic morning spread prepared daily by Michelin-trained executive chefs.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">
                24/7 Concierge
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Dedicated front desk and private butler service for airport transfers and yacht charters.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">
                Guaranteed Rates
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Direct booking rate lock with zero surprise fees, seamless cancellation, and instant confirmation.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
