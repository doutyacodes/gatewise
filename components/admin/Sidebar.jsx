// ============================================
// FILE: components/admin/Sidebar.jsx
// ============================================
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  UserCheck,
  Home,
  ClipboardList,
} from 'lucide-react';

export default function Sidebar({ user, isOpen, onClose }) {
  const pathname = usePathname();

  // Define menu items based on user type
  const superAdminMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
    { icon: Building2, label: 'Communities', href: '/admin/communities' },
    { icon: Users, label: 'All Admins', href: '/admin/admins' },
  ];

  const adminMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
    { icon: Home, label: 'Apartments', href: '/admin/apartments' },
    // { icon: Users, label: 'Residents', href: '/admin/residents' },
    // { icon: UserCheck, label: 'Visitors', href: '/admin/visitors' },
    { icon: Shield, label: 'Security', href: '/admin/security' },
    { icon: ClipboardList, label: 'Rules', href: '/admin/rules' },
  ];

  const menuItems = user?.type === 'superadmin' ? superAdminMenuItems : adminMenuItems;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 z-50 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* User Info */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {user?.name?.charAt(0) || 'A'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user?.name || 'Admin'}
                </p>
                <p className="text-xs text-slate-500 capitalize">
                  {user?.type === 'superadmin' ? 'Super Admin' : 'Admin'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200">
            <div className="text-xs text-slate-500 text-center">
              © 2025 GateWise
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}