import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { providerAPI } from '../../services/api';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default function ProviderCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Fetch provider bookings for current month
  const { data: bookingsData } = useQuery({
    queryKey: ['provider-bookings-calendar', year, month],
    queryFn: async () => {
      const startOfMonth = new Date(year, month, 1).toISOString();
      const endOfMonth = new Date(year, month + 1, 0).toISOString();
      const res = await providerAPI.getMyBookings({
        startDate: startOfMonth,
        endDate: endOfMonth,
        limit: 100,
      });
      return res?.data?.bookings || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const bookings = bookingsData || [];

  // Group bookings by date
  const bookingsByDate = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      const dateKey = new Date(b.scheduledDate).toISOString().split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(b);
    });
    return map;
  }, [bookings]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [year, month]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const selectedDateBookings = selectedDate
    ? bookingsByDate[selectedDate] || []
    : [];

  const statusColors = {
    pending: 'bg-yellow-500',
    confirmed: 'bg-blue-500',
    in_progress: 'bg-purple-500',
    completed: 'bg-green-500',
    cancelled: 'bg-red-500',
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-pink-400" />
          Booking Calendar
        </h2>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-medium min-w-[140px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="h-12" />;

          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayBookings = bookingsByDate[dateKey] || [];
          const isToday = new Date().toISOString().split('T')[0] === dateKey;
          const isSelected = selectedDate === dateKey;

          return (
            <button
              key={dateKey}
              onClick={() => setSelectedDate(dateKey)}
              className={`h-12 rounded-lg flex flex-col items-center justify-center relative transition-colors
                ${isToday ? 'ring-1 ring-pink-400' : ''}
                ${isSelected ? 'bg-pink-500/20 border border-pink-400' : 'hover:bg-white/5'}
              `}
            >
              <span className={`text-sm ${isToday ? 'text-pink-400 font-bold' : 'text-gray-300'}`}>
                {day}
              </span>
              {dayBookings.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayBookings.slice(0, 3).map((b, idx) => (
                    <div key={idx} className={`w-1.5 h-1.5 rounded-full ${statusColors[b.status] || 'bg-gray-400'}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date bookings */}
      {selectedDate && (
        <div className="mt-6 border-t border-white/10 pt-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          {selectedDateBookings.length === 0 ? (
            <p className="text-gray-500 text-sm">No bookings on this date</p>
          ) : (
            <div className="space-y-2">
              {selectedDateBookings.map(booking => (
                <div key={booking._id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className={`w-2 h-8 rounded-full ${statusColors[booking.status]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{booking.service?.title || 'Service'}</p>
                    <p className="text-gray-400 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {booking.scheduledTime?.start || 'TBD'} • {booking.customer?.name || 'Customer'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[booking.status]}/20 text-white`}>
                    {booking.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
