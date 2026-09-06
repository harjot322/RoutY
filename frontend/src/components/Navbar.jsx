import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bus, MapPin, Shield, LayoutDashboard, LogOut, Radio, Navigation } from 'lucide-react';
import { getSocket } from '../services/socket';

export default function Navbar({ config }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLive, setIsLive] = useState(false);
  const adminUser = localStorage.getItem('routy_admin_user');

  useEffect(() => {
    const socket = getSocket();
    if (socket.connected) setIsLive(true);
    
    socket.on('connect', () => setIsLive(true));
    socket.on('disconnect', () => setIsLive(false));
    
    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('routy_admin_token');
    localStorage.removeItem('routy_admin_user');
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;
  const isAdminSection = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';

  return (
    <header className="sticky top-0 z-[1000] bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & City Context */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-900/30 group-hover:scale-105 transition-transform">
            <Bus className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-display tracking-tight text-white">RoutY</span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 rounded-full">
                {config?.city || 'Civic Transit'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Public Bus Tracking System</p>
          </div>
        </Link>

        {/* Center Live Telemetry Beacon */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/70 border border-slate-700/50 text-xs text-slate-300">
          <span className="relative flex h-2 w-2">
            {isLive ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            )}
          </span>
          <span className="font-medium text-[11px] tracking-wide">
            {isLive ? 'Live Feed Connected' : 'Connecting Telemetry...'}
          </span>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              isActive('/')
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Navigation className="w-4 h-4 text-emerald-400" />
            <span>Commuter Map</span>
          </Link>

          {adminUser ? (
            <div className="flex items-center gap-2">
              <Link
                to="/admin/dashboard"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  isAdminSection
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-blue-400" />
                <span className="hidden sm:inline">Admin Panel</span>
              </Link>
              <button
                onClick={handleLogout}
                title="Log out of Admin"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/admin/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/50 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
