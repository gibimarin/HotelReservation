import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GuestLayout } from './components/layout/GuestLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

import { HomePage } from './pages/guest/HomePage';
import { RoomDetailPage } from './pages/guest/RoomDetailPage';
import { BookingPage } from './pages/guest/BookingPage';
import { MyReservationsPage } from './pages/guest/MyReservationsPage';
import { LoginPage } from './pages/guest/LoginPage';
import { RegisterPage } from './pages/guest/RegisterPage';

import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminReservationsPage } from './pages/admin/AdminReservationsPage';
import { FrontDeskPage } from './pages/admin/FrontDeskPage';
import { AdminRoomsPage } from './pages/admin/AdminRoomsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Guest Facing Routes */}
          <Route path="/" element={<GuestLayout />}>
            <Route index element={<HomePage />} />
            <Route path="rooms/:id" element={<RoomDetailPage />} />
            <Route
              path="booking/:id"
              element={
                <ProtectedRoute>
                  <BookingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="my-reservations"
              element={
                <ProtectedRoute allowedRoles={['guest', 'staff', 'admin']}>
                  <MyReservationsPage />
                </ProtectedRoute>
              }
            />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
          </Route>

          {/* Admin & Staff Portal Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['staff', 'admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="reservations" element={<AdminReservationsPage />} />
            <Route path="front-desk" element={<FrontDeskPage />} />
            <Route path="rooms" element={<AdminRoomsPage />} />
          </Route>

          {/* 404 Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
