import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import CommuterTracking from './pages/CommuterTracking';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ManageRoutes from './pages/ManageRoutes';
import ManageStops from './pages/ManageStops';
import ManageBuses from './pages/ManageBuses';
import ManageSchedules from './pages/ManageSchedules';
import api from './services/api';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('routy_admin_token');
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

export default function App() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    api.get('/public/config')
      .then(res => setConfig(res.data))
      .catch(err => console.warn('Could not load city config:', err.message));
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar config={config} />
        <main className="flex-1 flex flex-col">
          <Routes>
            {/* Public Commuter Tracking (No login required) */}
            <Route path="/" element={<CommuterTracking />} />

            {/* Admin Authentication */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Protected Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/routes"
              element={
                <ProtectedRoute>
                  <ManageRoutes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/stops"
              element={
                <ProtectedRoute>
                  <ManageStops />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/buses"
              element={
                <ProtectedRoute>
                  <ManageBuses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/schedules"
              element={
                <ProtectedRoute>
                  <ManageSchedules />
                </ProtectedRoute>
              }
            />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
