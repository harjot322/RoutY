import React, { useState, useEffect } from 'react';
import { Bus, Plus, Trash2, Edit3, Route, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import api from '../services/api';

export default function ManageBuses() {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [editingBus, setEditingBus] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [busNumber, setBusNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [model, setModel] = useState('Tata Ultra Electric Citybus');
  const [capacity, setCapacity] = useState('34');
  const [routeId, setRouteId] = useState('');
  const [status, setStatus] = useState('active');

  const fetchData = async () => {
    try {
      const [bRes, rRes] = await Promise.all([
        api.get('/public/buses'),
        api.get('/public/routes')
      ]);
      setBuses(bRes.data);
      setRoutes(rRes.data);
    } catch (err) {
      console.error('Failed to fetch buses/routes:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openNewBusModal = () => {
    setEditingBus(null);
    setBusNumber('');
    setRegistrationNumber('');
    setModel('Tata Ultra Electric Citybus');
    setCapacity('34');
    setRouteId(routes[0]?._id || '');
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditBusModal = (bus) => {
    setEditingBus(bus);
    setBusNumber(bus.bus_number);
    setRegistrationNumber(bus.registration_number || bus.bus_number);
    setModel(bus.model || '');
    setCapacity(bus.capacity || 32);
    setRouteId(bus.route_id?._id || bus.route_id || '');
    setStatus(bus.status || 'active');
    setIsModalOpen(true);
  };

  const handleSaveBus = async (e) => {
    e.preventDefault();
    const payload = {
      bus_number: busNumber.toUpperCase().trim(),
      registration_number: registrationNumber || busNumber,
      model,
      capacity: parseInt(capacity, 10),
      route_id: routeId || null,
      status
    };

    try {
      if (editingBus) {
        await api.put(`/admin/buses/${editingBus._id}`, payload);
      } else {
        await api.post('/admin/buses', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save bus');
    }
  };

  const handleDeleteBus = async (id) => {
    if (!window.confirm('Are you sure you want to remove this bus from the fleet?')) return;
    try {
      await api.delete(`/admin/buses/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete bus');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-white flex items-center gap-2.5">
            <Bus className="w-6 h-6 text-indigo-400" />
            <span>Fleet Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Register transit buses, assign routes, and monitor operational telemetry status.
          </p>
        </div>

        <button
          onClick={openNewBusModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-900/30 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register Vehicle</span>
        </button>
      </div>

      {/* Fleet Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4">Bus Identification</th>
              <th className="py-3.5 px-4">Model & Capacity</th>
              <th className="py-3.5 px-4">Assigned Route</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Speed & Heading</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {buses.map((bus) => {
              const route = bus.route_id;
              const speed = bus.last_telemetry?.speed_kmh || 0;
              const bearing = bus.last_telemetry?.bearing || 0;

              return (
                <tr key={bus._id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 shrink-0">
                      <Bus className="w-4 h-4" />
                    </div>
                    <div>
                      <div>{bus.bus_number}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{bus.registration_number}</div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-white font-medium">{bus.model}</div>
                    <div className="text-[10px] text-slate-400">{bus.capacity} passenger seats</div>
                  </td>
                  <td className="py-3.5 px-4">
                    {route ? (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-semibold text-white inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: route.color || '#2563eb' }}></span>
                        <span>{route.route_number}: {route.name}</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      bus.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : bus.status === 'idle'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {bus.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="font-bold text-emerald-400">{Math.round(speed)} km/h</span>
                    <span className="text-slate-500 ml-2">({Math.round(bearing)}°)</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditBusModal(bus)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteBus(bus._id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold font-display text-white">
                {editingBus ? `Edit Bus: ${editingBus.bus_number}` : 'Register Transit Bus'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBus} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Bus Number / Plate</label>
                <input
                  type="text"
                  value={busNumber}
                  onChange={(e) => setBusNumber(e.target.value)}
                  placeholder="e.g. MP04-HE-1024"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Vehicle Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. Tata Ultra Electric Citybus"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Seating Capacity</label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="idle">Idle</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assign Route</label>
                <select
                  value={routeId}
                  onChange={(e) => setRouteId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Unassigned</option>
                  {routes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.route_number}: {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-900/30"
                >
                  {editingBus ? 'Update Vehicle' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
