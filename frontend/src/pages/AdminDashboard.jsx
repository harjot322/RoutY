import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Route, 
  MapPin, 
  Bus, 
  Calendar, 
  Gauge, 
  Activity, 
  Plus, 
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import api from '../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, busesRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/public/buses')
      ]);
      setStats(statsRes.data);
      setBuses(busesRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 6000);
    return () => clearInterval(interval);
  }, []);

  const kpis = [
    { title: 'Active Routes', value: stats?.totalRoutes ?? '--', icon: Route, color: 'text-blue-400', link: '/admin/routes' },
    { title: 'Transit Stops', value: stats?.totalStops ?? '--', icon: MapPin, color: 'text-emerald-400', link: '/admin/stops' },
    { title: 'Total Fleet', value: stats?.totalBuses ?? '--', icon: Bus, color: 'text-indigo-400', link: '/admin/buses' },
    { title: 'Live on Road', value: stats?.activeBuses ?? '--', icon: Activity, color: 'text-amber-400', link: '/admin/buses' },
    { title: 'Average Speed', value: `${stats?.averageSpeedKmh ?? '24.5'} km/h`, icon: Gauge, color: 'text-teal-400', link: null },
    { title: 'Schedules', value: stats?.totalSchedules ?? '--', icon: Calendar, color: 'text-purple-400', link: '/admin/schedules' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-white">Transit Fleet Control Center</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time public transportation telemetry, route management, and municipal dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <Link
            to="/admin/routes"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-900/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Route</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {kpi.title}
                </span>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div className="text-2xl font-bold font-display text-white">
                {kpi.value}
              </div>
              {kpi.link && (
                <Link
                  to={kpi.link}
                  className="mt-2 text-[11px] font-semibold text-slate-500 group-hover:text-emerald-400 flex items-center gap-1 transition-colors"
                >
                  <span>Manage</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Navigation Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/admin/routes"
          className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-5 transition-all shadow-md group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Route className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">Manage Routes</h3>
          <p className="text-xs text-slate-400 mt-1">Design routes, order stops, and snap road geometry using free OSRM.</p>
        </Link>

        <Link
          to="/admin/stops"
          className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 transition-all shadow-md group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">Manage Stops</h3>
          <p className="text-xs text-slate-400 mt-1">Add transit stops with free automated place detection via Nominatim.</p>
        </Link>

        <Link
          to="/admin/buses"
          className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 transition-all shadow-md group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Bus className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">Manage Fleet</h3>
          <p className="text-xs text-slate-400 mt-1">Assign buses to routes, monitor speeds, and view hardware telemetry status.</p>
        </Link>

        <Link
          to="/admin/schedules"
          className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-5 transition-all shadow-md group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition-colors">Manage Schedules</h3>
          <p className="text-xs text-slate-400 mt-1">Set daily timetables, departure frequencies, and service operating hours.</p>
        </Link>
      </div>

      {/* Live Fleet Telemetry Table */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold font-display text-white">Live Fleet Telemetry Monitor</h2>
            <p className="text-xs text-slate-400">Continuous GPS signals received from simulated or physical bus feeds.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Gateway Online</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/50 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Bus Plate</th>
                <th className="py-3 px-4">Assigned Route</th>
                <th className="py-3 px-4">Current Coordinates</th>
                <th className="py-3 px-4">Live Speed</th>
                <th className="py-3 px-4">Next Stop</th>
                <th className="py-3 px-4">Telemetry Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {buses.map((bus) => {
                const isStale = bus.last_telemetry?.is_stale;
                const speed = bus.last_telemetry?.speed_kmh || 0;
                const lat = bus.last_telemetry?.latitude;
                const lng = bus.last_telemetry?.longitude;

                return (
                  <tr key={bus._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <Bus className="w-3.5 h-3.5 text-slate-500" />
                      <span>{bus.bus_number}</span>
                    </td>
                    <td className="py-3 px-4">
                      {bus.route_id ? (
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-semibold text-slate-200">
                          {bus.route_id.route_number}: {bus.route_id.name}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {lat ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : '--'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {Math.round(speed)} km/h
                    </td>
                    <td className="py-3 px-4 text-amber-300 font-semibold truncate max-w-[150px]">
                      {bus.last_telemetry?.next_stop_name || 'En Route'}
                    </td>
                    <td className="py-3 px-4">
                      {isStale ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" /> Stale (&gt;30s)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Streaming
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
