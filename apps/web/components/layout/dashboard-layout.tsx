'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ProtectedRoute } from './protected-route';
import {
  Bell,
  Briefcase,
  Building2,
  CheckSquare,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationsOpen]);

  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'Assigned to New Case',
      description: 'You were assigned to Operation Cyber Shield (CASE-2026-8242)',
      time: '10m ago',
      href: '/cases',
      type: 'case',
      read: false,
    },
    {
      id: '2',
      title: 'Peer Review Requested',
      description: 'C2 Payload Dump submitted for your audit approval',
      time: '1h ago',
      href: '/reviews',
      type: 'review',
      read: false,
    },
    {
      id: '3',
      title: 'SHA-256 Integrity Verified',
      description: 'EVI-2026-8827 hash verified against MinIO storage',
      time: '2h ago',
      href: '/audit-logs',
      type: 'security',
      read: false,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setNotificationsOpen(false);
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Organizations', href: '/organizations', icon: Building2 },
    { name: 'Cases', href: '/cases', icon: Briefcase },
    { name: 'Peer Reviews', href: '/reviews', icon: CheckSquare },
    { name: 'Audit Logs', href: '/audit-logs', icon: FileText },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row selection:bg-emerald-500 selection:text-zinc-950">
        {/* Mobile Header Bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-xl sticky top-0 z-40">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-bold tracking-tight text-white text-base">
              ProofLedger
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900/95 border-r border-zinc-800/80 backdrop-blur-2xl flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          } md:static md:z-auto`}
        >
          <div className="p-6">
            {/* Logo Brand */}
            <Link
              href="/dashboard"
              className="flex items-center gap-3 mb-8 group"
              onClick={() => setMobileOpen(false)}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-zinc-950 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-white tracking-tight leading-tight">
                  ProofLedger
                </span>
                <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase">
                  Evidence Vault
                </span>
              </div>
            </Link>

            {/* Navigation Links */}
            <nav className="flex flex-col gap-1.5">
              {navigation.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : ''}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Profile Pill & Logout */}
          <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/40">
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-emerald-400 shrink-0 font-bold text-xs">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-zinc-100 truncate">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="text-[10px] text-zinc-400 truncate">
                    {user?.email}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Backdrop for Mobile Sidebar */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 overflow-y-auto flex flex-col">
          {/* Top Desktop Bar */}
          <div className="hidden md:flex items-center justify-between px-8 py-4 border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Status: <strong className="text-emerald-400">Vault Protected</strong></span>
            </div>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950 animate-pulse" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl shadow-black/80 z-50 p-4 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                          {unreadCount} Unread
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto">
                    {notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={n.href}
                        onClick={() => markAsRead(n.id)}
                        className={`p-2.5 rounded-xl border transition-colors flex flex-col gap-1 cursor-pointer group ${
                          n.read
                            ? 'bg-zinc-950/30 border-zinc-800/40 opacity-70'
                            : 'bg-zinc-950/80 border-emerald-500/30 hover:border-emerald-500/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {!n.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            )}
                            <span
                              className={`font-semibold text-xs ${
                                n.read ? 'text-zinc-400' : 'text-zinc-100 group-hover:text-emerald-400'
                              } transition-colors`}
                            >
                              {n.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-normal pl-3">{n.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1">{children}</div>
        </main>
      </div>
    </ProtectedRoute>
  );
};
