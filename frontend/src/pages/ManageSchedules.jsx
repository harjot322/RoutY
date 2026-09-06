import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Edit3, Clock, Route, Bus, X } from 'lucide-react';
import api from '../services/api';

export default function ManageSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [routeId, setRouteId] = useState('');
  const [busId, setBusId] = useState('');
  const [departureTime, setDepartureTime] = useState('06:30');
  const [arrivalTime, setArrivalTime] = useState('07:15');
  const [frequencyMinutes, setFrequencyMinutes] = useState('15');
  const [days, setDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

  const fetchData = async () => {
    try {
      const [sRes, rRes, bRes] = await Promise.all([
        api.get('/public/schedules'),
        api.get('/public/routes'),
        api.get('/public/buses')
      ]);
      setSchedules(sRes.data);
      setRoutes(rRes.data);
      setBuses(bRes.data);
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openNewScheduleModal = () => {
    setEditingSchedule(null);
    setRouteId(routes[0]?._id || '');
    setBusId(buses[0]?._id || '');
    setDepartureTime('06:30');
    setArrivalTime('07:15');
    setFrequencyMinutes('15');
    setDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    setIsModalOpen(true);
  };

  const openEditScheduleModal = (s) => {
    setEditingSchedule(s);
    setRouteId(s.route_id?._id || s.route_id || '');
    setBusId(s.bus_id?._id || s.bus_id || '');
    setDepartureTime(s.departure_time);
    setArrivalTime(s.arrival_time);
    setFrequencyMinutes(s.frequency_minutes || 15);
    setDays(s.days || []);
    setIsModalOpen(true);
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    const payload = {
      route_id: routeId,
      bus_id: busId || null,
      departure_time: departureTime,
      arrival_time: arrivalTime,
      frequency_minutes: parseInt(frequencyMinutes, 10),
      days
    };

    try {
      if (editingSchedule) {
        await api.put(`/admin/schedules/${editingSchedule._id}`, payload);
      } else {
        await api.post('/admin/schedules', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save schedule');
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await api.delete(`/admin/schedules/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete schedule');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-white flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-purple-400" />
            <span>Transit Service Schedules</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure departure windows, headway frequencies, and daily service operations.
          </p>
        </div>

        <button
          onClick={openNewScheduleModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-900/30 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Timetable</span>
        </button>
      </div>

      {/* Schedules Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4">Route</th>
              <th className="py-3.5 px-4">Vehicle</th>
              <th className="py-3.5 px-4">Operating Window</th>
              <th className="py-3.5 px-4">Headway Frequency</th>
              <th className="py-3.5 px-4">Active Days</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {schedules.map((s) => (
              <tr key={s._id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-4 font-bold text-white">
                  {s.route_id ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.route_id.color || '#2563eb' }}></span>
                      <span>{s.route_id.route_number}: {s.route_id.name}</span>
                    </span>
                  ) : (
                    '--'
                  )}
                </td>
                <td className="py-3.5 px-4">
                  {s.bus_id ? (
                    <span className="font-mono text-slate-300 font-semibold">{s.bus_id.bus_number}</span>
                  ) : (
                    <span className="text-slate-500 italic">Unassigned Fleet</span>
                  )}
                </td>
                <td className="py-3.5 px-4 font-mono text-emerald-400 font-semibold">
                  {s.departure_time} - {s.arrival_time}
                </td>
                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                    Every {s.frequency_minutes} min
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                  {s.days?.join(', ') || 'All Week'}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEditScheduleModal(s)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(s._id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold font-display text-white">
                {editingSchedule ? 'Edit Timetable Schedule' : 'Create Transit Schedule'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Route</label>
                <select
                  value={routeId}
                  onChange={(e) => setRouteId(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select route...</option>
                  {routes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.route_number}: {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assign Primary Bus</label>
                <select
                  value={busId}
                  onChange={(e) => setBusId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">No specific bus</option>
                  {buses.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.bus_number} ({b.model})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">First Departure</label>
                  <input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Last Arrival</label>
                  <input
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Headway Frequency (Minutes)</label>
                <input
                  type="number"
                  value={frequencyMinutes}
                  onChange={(e) => setFrequencyMinutes(e.target.value)}
                  min="5"
                  max="120"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
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
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-900/30"
                >
                  {editingSchedule ? 'Update Schedule' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
