// ============================================
// FILE: app/admin/rent-sessions/page.jsx
// Admin - View Rent Sessions
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Home,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Loader2,
  FileText,
  DollarSign
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function RentSessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/rent-sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      } else {
        toast.error('Failed to fetch rent sessions');
      }
    } catch (error) {
      console.error('Failed to fetch rent sessions:', error);
      toast.error('Failed to fetch rent sessions');
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter((session) =>
    (session.ownerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (session.tenantName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (session.apartmentNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
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
          Rent Sessions
        </h1>
        <p className="text-slate-600">Overview of all rent agreements in the community</p>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by owner name, tenant name, or apartment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </motion.div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredSessions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12 bg-white rounded-xl border border-slate-200"
        >
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No rent sessions found
          </h3>
          <p className="text-slate-600">
            {searchQuery
              ? 'Try adjusting your search'
              : 'There are no active or pending rent sessions.'}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all group"
            >
              {/* Status Badge */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${
                    session.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : session.status === 'pending_tenant_approval'
                      ? 'bg-yellow-100 text-yellow-800'
                      : session.status === 'completed'
                      ? 'bg-slate-100 text-slate-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {session.status === 'active' && <CheckCircle className="w-3 h-3" />}
                  {session.status === 'pending_tenant_approval' && <AlertCircle className="w-3 h-3" />}
                  {(session.status === 'terminated' || session.status === 'rejected') && <XCircle className="w-3 h-3" />}
                  {session.status === 'pending_tenant_approval' ? 'Pending Approval' : session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                </span>
                <span className="text-xs text-slate-500">
                  ID: #{session.id}
                </span>
              </div>

              {/* Apartment Info */}
              <div className="mb-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-blue-600" />
                  <p className="font-semibold text-slate-900">
                    {session.towerName ? `${session.towerName} - ` : ''}
                    {session.apartmentNumber}
                  </p>
                </div>
              </div>

              {/* User Info */}
              <div className="mb-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Owner</p>
                    <p className="font-semibold text-slate-900">{session.ownerName || 'Unknown'}</p>
                    <p className="text-xs text-slate-600">{session.ownerPhone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Tenant</p>
                    <p className="font-semibold text-slate-900">{session.tenantName || 'Unknown'}</p>
                    <p className="text-xs text-slate-600">{session.tenantPhone}</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Rent Amount</p>
                    <p className="font-semibold text-slate-900">₹{session.rentAmount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Duration</p>
                    <p className="font-semibold text-slate-900">{session.durationMonths} months</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
