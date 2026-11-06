import React from 'react';
import { Hotel, MapPin, Phone, Mail, Clock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-navy-900 text-slate-300 mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white">
                <Hotel className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                Grand Vista Hotel
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm mb-4 leading-relaxed">
              Experience unparalleled luxury, modern comfort, and personalized hospitality. Designed for discerning travelers seeking tranquility and excellence.
            </p>
          </div>

          {/* Front Desk Hours & Policy */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Hotel Information
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-500 shrink-0" />
                <span>Check-in: 3:00 PM</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-500 shrink-0" />
                <span>Check-out: 11:00 AM</span>
              </li>
              <li className="text-xs text-slate-500 pt-1">
                Front Desk operates 24 hours daily.
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Contact & Location
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                <span>100 Ocean Promenade, Suite 400, Coastal Haven</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-brand-500 shrink-0" />
                <span>+1 (800) 555-VISTA</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-500 shrink-0" />
                <span>concierge@grandvistahotel.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Grand Vista Hotel. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Full Stack Technical Assessment Demo</p>
        </div>
      </div>
    </footer>
  );
};

