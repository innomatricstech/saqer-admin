import React, { useState } from 'react';
import { FiSearch, FiFilter, FiCalendar, FiUsers, FiDollarSign, FiClock, FiCheckCircle } from 'react-icons/fi';

// Dummy data for the bookings table
const initialBookings = [
  { id: 'B00101', customer: 'Raja K.', driver: 'Kumar S.', date: '2025-11-05 10:30', amount: 350.50, status: 'Completed' },
  { id: 'B00102', customer: 'Priya A.', driver: 'Mani R.', date: '2025-11-05 15:45', amount: 480.00, status: 'Active' },
  { id: 'B00103', customer: 'Vijay T.', driver: 'Suresh V.', date: '2025-11-06 08:00', amount: 220.75, status: 'Scheduled' },
  { id: 'B00104', customer: 'Anu M.', driver: 'Kumar S.', date: '2025-11-04 20:15', amount: 610.90, status: 'Cancelled' },
  { id: 'B00105', customer: 'Ganesh L.', driver: 'Velu P.', date: '2025-11-03 12:00', amount: 290.00, status: 'Completed' },
];

// Helper component for the statistics cards
const StatCard = ({ icon: Icon, title, value, color }) => (
  <div className="bg-white p-5 rounded-xl shadow-lg flex items-center justify-between transition-transform duration-300 hover:scale-[1.02]">
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`text-3xl font-bold mt-1 text-${color}-600`}>{value}</p>
    </div>
    <div className={`p-3 rounded-full bg-${color}-100 text-${color}-600`}>
      <Icon size={24} />
    </div>
  </div>
);

// Helper function to render status badges
const getStatusBadge = (status) => {
  let colorClass = '';
  switch (status) {
    case 'Completed':
      colorClass = 'bg-green-100 text-green-800';
      break;
    case 'Active':
      colorClass = 'bg-blue-100 text-blue-800 animate-pulse';
      break;
    case 'Scheduled':
      colorClass = 'bg-yellow-100 text-yellow-800';
      break;
    case 'Cancelled':
      colorClass = 'bg-red-100 text-red-800';
      break;
    default:
      colorClass = 'bg-gray-100 text-gray-800';
  }
  return (
    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>
      {status}
    </span>
  );
};

export default function Bookings() {
  const [bookings, setBookings] = useState(initialBookings);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Calculate statistics
  const totalBookings = bookings.length;
  const activeBookings = bookings.filter(b => b.status === 'Active').length;
  const totalRevenue = bookings
    .filter(b => b.status === 'Completed')
    .reduce((sum, b) => sum + b.amount, 0)
    .toFixed(2);

  // Filtered and searched data
  const filteredBookings = bookings.filter(booking => {
    // Status Filter
    if (filterStatus !== 'All' && booking.status !== filterStatus) {
      return false;
    }
    // Search Filter (ID, Customer, Driver)
    if (searchTerm === '') {
      return true;
    }
    const lowerCaseSearch = searchTerm.toLowerCase();
    return (
      booking.id.toLowerCase().includes(lowerCaseSearch) ||
      booking.customer.toLowerCase().includes(lowerCaseSearch) ||
      booking.driver.toLowerCase().includes(lowerCaseSearch)
    );
  });
  
  // Action handlers (placeholders)
  const handleViewDetails = (id) => {
    alert(`Viewing details for Booking ID: ${id}`);
  };
  const handleCancelBooking = (id) => {
    if (window.confirm(`Are you sure you want to cancel booking ${id}?`)) {
        // In a real app, update state/API here
        setBookings(bookings.map(b => b.id === id ? { ...b, status: 'Cancelled' } : b));
    }
  };


  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-extrabold mb-6 text-gray-900 flex items-center">
        <FiCalendar className="text-indigo-600 mr-3" size={28} />
        Bookings Control Panel
      </h1>

      {/* --- 1. Statistics Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          icon={FiUsers} 
          title="Total Bookings" 
          value={totalBookings} 
          color="indigo" 
        />
        <StatCard 
          icon={FiClock} 
          title="Active Now" 
          value={activeBookings} 
          color="blue" 
        />
        <StatCard 
          icon={FiDollarSign} 
          title="Total Revenue (Completed)" 
          value={`₹${totalRevenue}`} 
          color="green" 
        />
      </div>
      
      {/* --- 2. Search and Filter Controls --- */}
      <div className="bg-white p-4 rounded-xl shadow-md mb-8 flex flex-col md:flex-row gap-4 items-center">
        {/* Search Input */}
        <div className="relative flex-grow w-full md:w-auto">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID, Customer or Driver name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
          />
        </div>
        
        {/* Status Filter */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <FiFilter className="text-gray-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 bg-white"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* --- 3. Bookings Table --- */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <h2 className="text-xl font-semibold p-4 border-b text-gray-800">Recent Bookings ({filteredBookings.length})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (₹)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{booking.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{booking.customer}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.driver}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">₹{booking.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(booking.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleViewDetails(booking.id)}
                        className="text-indigo-600 hover:text-indigo-900 transition-colors"
                      >
                        View
                      </button>
                      {booking.status !== 'Completed' && booking.status !== 'Cancelled' && (
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                    No bookings found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}