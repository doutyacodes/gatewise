// ============================================
// FILE: app/(dashboard)/admin/dashboard/page.jsx
// ============================================
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Building2,
  UserCheck,
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  Home,
  ClipboardList,
} from 'lucide-react';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="text-slate-600">
          Here's what's happening with your {user?.type === 'superadmin' ? 'platform' : 'community'} today.
        </p>
      </motion.div>

      {/* Dynamic Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-${stat.color}-100 rounded-xl flex items-center justify-center`}>
                {stat.icon === 'Building2' && <Building2 className={`w-6 h-6 text-${stat.color}-600`} />}
                {stat.icon === 'Users' && <Users className={`w-6 h-6 text-${stat.color}-600`} />}
                {stat.icon === 'Shield' && <Shield className={`w-6 h-6 text-${stat.color}-600`} />}
                {stat.icon === 'UserCheck' && <UserCheck className={`w-6 h-6 text-${stat.color}-600`} />}
                {stat.icon === 'Home' && <Home className={`w-6 h-6 text-${stat.color}-600`} />}
                {stat.icon === 'ClipboardList' && <ClipboardList className={`w-6 h-6 text-${stat.color}-600`} />}
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${
                stat.trend === 'up' ? 'text-green-600' : stat.trend === 'down' ? 'text-red-600' : 'text-slate-600'
              }`}>
                {stat.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : 
                 stat.trend === 'down' ? <TrendingDown className="w-4 h-4" /> : 
                 <Activity className="w-4 h-4" />}
                <span>{stat.change}</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-1">
              {stat.value.toLocaleString()}
            </h3>
            <p className="text-slate-600 text-sm">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm"
        >
          <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">A{i}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {user?.type === 'superadmin' 
                      ? `New community registered: Building ${i}`
                      : `New apartment added: Tower A-${100 + i}`}
                  </p>
                  <p className="text-xs text-slate-500">{i} hours ago</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Alerts */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm"
        >
          <h3 className="text-lg font-bold text-slate-900 mb-4">Alerts & Notifications</h3>
          <div className="space-y-3">
            {[
              { type: 'info', message: user?.type === 'superadmin' ? 'New admin registration pending' : 'New security shift assigned', time: '2h ago' },
              { type: 'warning', message: user?.type === 'superadmin' ? '3 communities require attention' : '2 apartment approvals pending', time: '5h ago' },
              { type: 'success', message: user?.type === 'superadmin' ? 'System backup completed' : 'All rules updated successfully', time: '1d ago' },
            ].map((alert, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  alert.type === 'info'
                    ? 'bg-blue-50 border-blue-200'
                    : alert.type === 'warning'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <AlertCircle
                  className={`w-5 h-5 mt-0.5 ${
                    alert.type === 'info'
                      ? 'text-blue-600'
                      : alert.type === 'warning'
                      ? 'text-orange-600'
                      : 'text-green-600'
                  }`}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{alert.message}</p>
                  <p className="text-xs text-slate-500 mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-6 bg-white rounded-xl p-6 border border-slate-200 shadow-sm"
      >
        <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {user?.type === 'superadmin' ? (
            <>
              {[
                { icon: Building2, label: 'Add Community', color: 'blue', href: '/admin/communities' },
                { icon: Users, label: 'Add Admin', color: 'purple', href: '/admin/admins' },
                { icon: Activity, label: 'System Stats', color: 'orange', href: '/admin/dashboard' },
              ].map((action, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => window.location.href = action.href}
                  className={`flex flex-col items-center gap-3 p-4 bg-${action.color}-50 border border-${action.color}-200 rounded-xl hover:bg-${action.color}-100 transition-colors cursor-pointer`}
                >
                  <div className={`w-12 h-12 bg-gradient-to-br from-${action.color}-500 to-${action.color}-600 rounded-xl flex items-center justify-center`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-900">{action.label}</span>
                </motion.button>
              ))}
            </>
          ) : (
            <>
              {[
                { icon: Home, label: 'Add Apartment', color: 'blue', href: '/admin/apartments' },
                { icon: ClipboardList, label: 'Manage Rules', color: 'purple', href: '/admin/rules' },
                { icon: Shield, label: 'Security Staff', color: 'green', href: '/admin/security' },
                { icon: Activity, label: 'View Stats', color: 'orange', href: '/admin/dashboard' },
              ].map((action, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => window.location.href = action.href}
                  className={`flex flex-col items-center gap-3 p-4 bg-${action.color}-50 border border-${action.color}-200 rounded-xl hover:bg-${action.color}-100 transition-colors cursor-pointer`}
                >
                  <div className={`w-12 h-12 bg-gradient-to-br from-${action.color}-500 to-${action.color}-600 rounded-xl flex items-center justify-center`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-900">{action.label}</span>
                </motion.button>
              ))}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}