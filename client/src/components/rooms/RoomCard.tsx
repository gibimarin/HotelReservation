import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Check, ArrowRight, AlertTriangle } from 'lucide-react';
import type { RoomType, AvailableRoomOption } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Button } from '../common/Button';
import { RoomImage } from '../common/RoomImage';

interface RoomCardProps {
  room: RoomType;
  availableOption?: AvailableRoomOption;
  searchParams?: {
    checkIn: string;
    checkOut: string;
    guests: number;
    rooms: number;
  };
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  availableOption,
  searchParams,
}) => {
  const bookingQuery = searchParams
    ? `?checkIn=${searchParams.checkIn}&checkOut=${searchParams.checkOut}&guests=${searchParams.guests}&rooms=${searchParams.rooms}`
    : '';

  const isLowInventory =
    availableOption && availableOption.availableRooms <= 2;

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col group">
      {/* Room Image */}
      <div className="relative h-60 w-full overflow-hidden bg-slate-100">
        <RoomImage
          src={room.imageUrl}
          alt={room.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
          <Users className="w-3.5 h-3.5 text-brand-400" />
          <span>Up to {room.capacity} Guests</span>
        </div>

        {availableOption && (
          <div
            className={`absolute bottom-3 left-3 text-xs font-bold px-3 py-1 rounded-full shadow-md backdrop-blur-md ${
              isLowInventory
                ? 'bg-amber-600/90 text-white flex items-center gap-1'
                : 'bg-emerald-600/90 text-white'
            }`}
          >
            {isLowInventory && <AlertTriangle className="w-3.5 h-3.5" />}
            <span>
              {availableOption.availableRooms === 1
                ? 'Only 1 room remaining!'
                : `${availableOption.availableRooms} rooms available`}
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand-700 transition-colors">
              {room.name}
            </h3>
          </div>

          <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">
            {room.description}
          </p>

          {/* Key Amenities preview */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {room.facilities.slice(0, 4).map((facility, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg"
              >
                <Check className="w-3 h-3 text-brand-600" />
                {facility}
              </span>
            ))}
            {room.facilities.length > 4 && (
              <span className="text-[11px] font-medium text-slate-400 px-1 py-1">
                +{room.facilities.length - 4} more
              </span>
            )}
          </div>
        </div>

        {/* Pricing and Action Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-end justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900">
                {formatCurrency(room.pricePerNight)}
              </span>
              <span className="text-xs text-slate-500 font-medium">/ night</span>
            </div>

            {availableOption ? (
              <p className="text-xs font-semibold text-brand-700 mt-0.5">
                Total {formatCurrency(availableOption.totalPrice)} ({availableOption.nights} {availableOption.nights === 1 ? 'night' : 'nights'})
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-0.5">
                Taxes & fees included
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link to={`/rooms/${room._id}${bookingQuery}`}>
              <Button variant="outline" size="sm">
                Details
              </Button>
            </Link>

            <Link to={`/booking/${room._id}${bookingQuery}`}>
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Book
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
