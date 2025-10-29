// ============================================
// FILE: app/(dashboard)/admin/apartment-requests/page.jsx
// Admin - View Apartment Requests
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Home,
  Calendar,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Loader2,
  FileText,
  Shield,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function ApartmentRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [activeTab]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mobile-api/admin/apartment-requests?status=${activeTab}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.data.requests || []);
      } else {
        toast.error('Failed to fetch requests');
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      toast.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter((req) =>
    req.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.apartmentNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Toaster position="top-right" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Apartment Requests
        </h1>
        <p className="text-slate-600">Review and manage apartment access requests</p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl"
      >
        {['pending', 'approved', 'rejected'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
              activeTab === tab
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <span className="capitalize">{tab}</span>
            {requests.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white/20">
                {requests.length}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or apartment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </motion.div>

      {/* Requests Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12 bg-white rounded-xl border border-slate-200"
        >
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No {activeTab} requests
          </h3>
          <p className="text-slate-600">
            {searchQuery
              ? 'Try adjusting your search'
              : `No ${activeTab} requests at the moment`}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredRequests.map((request, index) => (
            <motion.div
              key={request.requestId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all group"
            >
              {/* Status Badge */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${
                    request.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : request.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {request.status === 'pending' && <AlertCircle className="w-3 h-3" />}
                  {request.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                  {request.status === 'rejected' && <XCircle className="w-3 h-3" />}
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
                <span className="text-xs text-slate-500">
                  #{request.requestId}
                </span>
              </div>

              {/* User Info */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{request.userName}</p>
                    <p className="text-sm text-slate-600">{request.userEmail}</p>
                  </div>
                </div>
              </div>

              {/* Apartment Info */}
              <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Home className="w-4 h-4 text-blue-600" />
                  <p className="font-semibold text-slate-900">
                    {request.towerName ? `${request.towerName} - ` : ''}
                    {request.apartmentNumber}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      request.ownershipType === 'owner'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {request.ownershipType === 'owner' ? 'Owner' : 'Tenant'}
                  </span>
                  {request.floorNumber && (
                    <span className="text-xs text-slate-600">
                      Floor {request.floorNumber}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1 text-slate-600">
                  <Users className="w-4 h-4" />
                  <span>{request.members?.length || 0} members</span>
                </div>
                <div className="flex items-center gap-1 text-slate-600">
                  <Shield className="w-4 h-4" />
                  <span>{request.ruleResponses?.length || 0} rules</span>
                </div>
                <div className="flex items-center gap-1 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(request.submittedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* View Button */}
              <a
                href={`/admin/apartment-requests/${request.requestId}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
              >
                <Eye className="w-4 h-4" />
                <span className="font-medium">View Details</span>
              </a>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}