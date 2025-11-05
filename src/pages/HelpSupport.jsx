import React, { useState } from 'react';
// FiCheckCircle ஐகானை இறக்குமதி பட்டியலில் சேர்த்துள்ளோம் (Imported FiCheckCircle to fix the error)
import { FiLifeBuoy, FiMessageSquare, FiFileText, FiChevronDown, FiChevronUp, FiSettings, FiMail, FiCheckCircle } from 'react-icons/fi';

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
];

// Dummy data for Ticket Summary
const ticketSummary = [
  { status: 'Open', count: 5, color: 'text-red-600', icon: FiMessageSquare },
  { status: 'In Progress', count: 12, color: 'text-yellow-600', icon: FiSettings },
  { status: 'Resolved Today', count: 8, color: 'text-green-600', icon: FiFileText },
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
  
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-extrabold mb-8 text-gray-900 flex items-center">
        <FiLifeBuoy className="text-indigo-600 mr-3" size={28} />
        Help & Support Center
      </h1>

      {/* --- 1. Ticket Management Summary --- */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">Ticket Summary Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ticketSummary.map((item, index) => (
            <div 
              key={index} 
              className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 transition-transform duration-300 hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-500">{item.status}</p>
                <p className={`text-4xl font-bold mt-1 ${item.color}`}>{item.count}</p>
              </div>
              <div className={`p-4 rounded-full bg-gray-100 ${item.color}`}>
                <item.icon size={30} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-right">
            <button className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-indigo-700 transition-colors">
                View All Support Tickets
            </button>
        </div>
      </div>
      
      {/* --- 2. Quick Links and Contact --- */}
      <div className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Contact Support */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-xl font-bold mb-3 flex items-center text-indigo-700">
            <FiMail className="mr-2" />
            Contact Direct Support
          </h3>
          <p className="text-gray-600 mb-4">
            If you can't find the answer in the FAQ, contact the technical team directly.
          </p>
          <div className="space-y-3">
              <input 
                  type="text" 
                  placeholder="Your Name / Department" 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" 
              />
              <textarea 
                  rows="4" 
                  placeholder="Describe your issue in detail..." 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" 
              />
              <button className="w-full bg-red-500 text-white font-semibold py-3 rounded-lg shadow-md hover:bg-red-600 transition-colors">
                  Submit New Ticket
              </button>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <h3 className="text-xl font-bold mb-3 flex items-center text-green-700">
                {/* இங்கே FiCheckCircle பயன்படுத்தப்பட்டுள்ளது, மேலே இறக்குமதி செய்யப்பட்டுள்ளது */}
                <FiCheckCircle className="mr-2" /> 
                System Health & Status
            </h3>
            <p className="text-gray-600 mb-4">
                Monitor the real-time status of critical system components.
            </p>
            <div className="space-y-3">
                <StatusIndicator label="API Server" status="Operational" color="green" />
                <StatusIndicator label="Database" status="Operational" color="green" />
                <StatusIndicator label="Payment Gateway" status="Minor Degradation" color="yellow" />
                <StatusIndicator label="Driver App Services" status="Operational" color="green" />
            </div>
            <p className="text-xs text-gray-400 mt-4">Last checked: Nov 5, 2025, 17:00 IST</p>
        </div>
      </div>

      {/* --- 3. Frequently Asked Questions (FAQ) --- */}
      <div className="mt-8 bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Frequently Asked Questions (FAQ)</h2>
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
    let bgColor, ringColor;
    switch (color) {
        case 'green':
            bgColor = 'bg-green-500';
            ringColor = 'ring-green-300';
            break;
        case 'yellow':
            bgColor = 'bg-yellow-500';
            ringColor = 'ring-yellow-300';
            break;
        case 'red':
            bgColor = 'bg-red-500';
            ringColor = 'ring-red-300';
            break;
        default:
            bgColor = 'bg-gray-500';
            ringColor = 'ring-gray-300';
    }

    return (
        <div className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
            <span className="font-medium text-gray-700">{label}</span>
            <div className="flex items-center space-x-2">
                <span className={`h-3 w-3 ${bgColor} rounded-full ring-2 ${ringColor} transition-all duration-500`}></span>
                <span className={`text-sm font-semibold text-${color}-700`}>{status}</span>
            </div>
        </div>
    );
};