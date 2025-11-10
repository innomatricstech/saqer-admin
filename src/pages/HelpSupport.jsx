import React, { useState } from 'react';
import { 
  FiLifeBuoy, 
  FiMessageSquare, 
  FiFileText, 
  FiChevronDown, 
  FiChevronUp, 
  FiSettings, 
  FiMail, 
  FiCheckCircle,
  FiUsers,
  FiDollarSign,
  FiCalendar,
  FiRefreshCw,
  FiArrowRight
} from 'react-icons/fi';

// Dummy data for FAQ section
const faqs = [
  {
    question: "How do I reset a driver's password?",
    answer: "Go to the 'Drivers' section, select the driver, click on 'Actions', and choose 'Reset Password'. A temporary password will be sent to their registered email.",
  },
  {
    question: "Where can I view weekly revenue reports?",
    answer: "Weekly revenue reports are available under the 'Dashboard' main screen, in the 'Analytics' panel. You can also export detailed reports from the 'Bookings' section.",
  },
  {
    question: "How are loyalty points calculated and managed?",
    answer: "Loyalty points rules are configured entirely on the 'Rewards' page. You can set the point-to-currency ratio and redemption rules there.",
  },
  {
    question: "How to manage customer bookings and reservations?",
    answer: "All bookings can be managed through the 'Bookings' section. You can view, edit, cancel, or reassign bookings from this interface.",
  },
  {
    question: "What should I do if the payment gateway is not working?",
    answer: "First, check the System Status panel on this page. If the payment gateway shows issues, contact our technical support team immediately for resolution.",
  },
];

// Dummy data for Ticket Summary
const ticketSummary = [
  { status: 'Open Tickets', count: 5, color: 'text-red-600', icon: FiMessageSquare, bgColor: 'bg-red-50' },
  { status: 'In Progress', count: 12, color: 'text-yellow-600', icon: FiSettings, bgColor: 'bg-yellow-50' },
  { status: 'Resolved Today', count: 8, color: 'text-green-600', icon: FiFileText, bgColor: 'bg-green-50' },
  { status: 'Total Customers', count: 245, color: 'text-blue-600', icon: FiUsers, bgColor: 'bg-blue-50' },
];

// Dummy data for support agents
const supportAgents = [
  { name: 'Alex Johnson', department: 'Technical Support', availability: 'Online', avatar: 'AJ' },
  { name: 'Sarah Miller', department: 'Billing & Payments', availability: 'Online', avatar: 'SM' },
  { name: 'David Chen', department: 'Account Management', availability: 'Away', avatar: 'DC' },
];

// Component for a single FAQ item (with state for toggle)
const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border-b border-gray-200">
      <button 
        className="flex justify-between items-center w-full py-4 text-left font-semibold text-gray-800 hover:text-indigo-600 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{question}</span>
        {isOpen ? <FiChevronUp size={20} className="text-indigo-600" /> : <FiChevronDown size={20} className="text-gray-500" />}
      </button>
      {isOpen && (
        <div className="pb-4 pr-6 text-gray-600 animate-fadeIn transition-opacity duration-300">
          <p className="bg-gray-50 p-3 rounded-lg border border-gray-100">{answer}</p>
        </div>
      )}
    </div>
  );
};

// Component for the main Help & Support page
export default function HelpSupport() {
  const [ticketForm, setTicketForm] = useState({
    name: '',
    department: '',
    priority: 'Medium',
    description: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTicketForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitTicket = (e) => {
    e.preventDefault();
    // In a real app, you would submit the ticket data to your backend
    alert('Support ticket submitted successfully!');
    setTicketForm({
      name: '',
      department: '',
      priority: 'Medium',
      description: ''
    });
  };
  
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
          <FiLifeBuoy className="text-indigo-600 mr-3" size={28} />
          Help & Support Center
        </h1>
        <div className="flex items-center space-x-4">
          <button className="flex items-center text-indigo-600 font-medium">
            <FiRefreshCw className="mr-2" />
            Refresh Data
          </button>
          <div className="flex items-center bg-white px-4 py-2 rounded-lg shadow-sm border">
            <span className="text-gray-700 mr-2">Admin</span>
            <span className="text-indigo-600">admin.sager@gmail.com</span>
          </div>
        </div>
      </div>

      {/* Stats Overview - Matching Dashboard Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {ticketSummary.map((item, index) => (
          <div 
            key={index} 
            className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 transition-transform duration-300 hover:shadow-xl"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">{item.status}</p>
                <p className={`text-3xl font-bold mt-2 ${item.color}`}>{item.count}</p>
                <p className="text-xs text-green-600 mt-1 flex items-center">
                  <span>↑ 12% this week</span>
                </p>
              </div>
              <div className={`p-3 rounded-full ${item.bgColor} ${item.color}`}>
                <item.icon size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Ticket Management & Support Agents */}
        <div className="lg:col-span-2 space-y-8">
          {/* Ticket Management Summary */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Support Ticket Overview</h2>
              <button className="flex items-center text-indigo-600 font-medium">
                View All Tickets <FiArrowRight className="ml-1" />
              </button>
            </div>
            
            <div className="space-y-4">
              {[
                { id: 'TK-7842', subject: 'Payment Gateway Issue', status: 'Open', priority: 'High', date: 'Nov 5, 2025' },
                { id: 'TK-7839', subject: 'Driver Account Verification', status: 'In Progress', priority: 'Medium', date: 'Nov 5, 2025' },
                { id: 'TK-7835', subject: 'Loyalty Points Calculation', status: 'Resolved', priority: 'Low', date: 'Nov 4, 2025' },
                { id: 'TK-7828', subject: 'Booking System Error', status: 'Open', priority: 'High', date: 'Nov 4, 2025' },
              ].map((ticket, index) => (
                <div key={index} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">{ticket.id}</span>
                      <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                        ticket.status === 'Open' ? 'bg-red-100 text-red-800' :
                        ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {ticket.status}
                      </span>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                        ticket.priority === 'High' ? 'bg-red-100 text-red-800' :
                        ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="text-gray-700 mt-1">{ticket.subject}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{ticket.date}</p>
                    <button className="text-indigo-600 text-sm font-medium mt-1">View Details</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Support Team Availability */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Support Team Availability</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {supportAgents.map((agent, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-800 rounded-full flex items-center justify-center font-bold mx-auto mb-3">
                    {agent.avatar}
                  </div>
                  <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                  <p className="text-sm text-gray-600">{agent.department}</p>
                  <div className={`inline-flex items-center mt-2 px-2 py-1 rounded-full text-xs ${
                    agent.availability === 'Online' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    <span className={`w-2 h-2 rounded-full mr-1 ${
                      agent.availability === 'Online' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></span>
                    {agent.availability}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Quick Actions & System Status */}
        <div className="space-y-8">
          {/* Create New Ticket */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <FiMail className="text-indigo-600 mr-2" />
              Create Support Ticket
            </h2>
            <form onSubmit={handleSubmitTicket}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                  <input 
                    type="text" 
                    name="name"
                    value={ticketForm.name}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input 
                    type="text" 
                    name="department"
                    value={ticketForm.department}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select 
                    name="priority"
                    value={ticketForm.priority}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Description</label>
                  <textarea 
                    rows="4" 
                    name="description"
                    value={ticketForm.description}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" 
                    required
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <FiCheckCircle className="text-green-600 mr-2" />
              System Status
            </h2>
            <div className="space-y-3">
              <StatusIndicator label="API Server" status="Operational" color="green" />
              <StatusIndicator label="Database" status="Operational" color="green" />
              <StatusIndicator label="Payment Gateway" status="Minor Issues" color="yellow" />
              <StatusIndicator label="Driver App" status="Operational" color="green" />
              <StatusIndicator label="Customer Portal" status="Operational" color="green" />
              <StatusIndicator label="SMS Services" status="Degraded" color="red" />
            </div>
            <p className="text-xs text-gray-500 mt-4">Last updated: Nov 5, 2025, 17:00 GST</p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <FAQItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper component for system status indicator
const StatusIndicator = ({ label, status, color }) => {
  let bgColor, ringColor, statusColor;
  switch (color) {
    case 'green':
      bgColor = 'bg-green-500';
      ringColor = 'ring-green-300';
      statusColor = 'text-green-700';
      break;
    case 'yellow':
      bgColor = 'bg-yellow-500';
      ringColor = 'ring-yellow-300';
      statusColor = 'text-yellow-700';
      break;
    case 'red':
      bgColor = 'bg-red-500';
      ringColor = 'ring-red-300';
      statusColor = 'text-red-700';
      break;
    default:
      bgColor = 'bg-gray-500';
      ringColor = 'ring-gray-300';
      statusColor = 'text-gray-700';
  }

  return (
    <div className="flex justify-between items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <span className="font-medium text-gray-700">{label}</span>
      <div className="flex items-center space-x-2">
        <span className={`h-3 w-3 ${bgColor} rounded-full ring-2 ${ringColor} transition-all duration-500`}></span>
        <span className={`text-sm font-semibold ${statusColor}`}>{status}</span>
      </div>
    </div>
  );
};