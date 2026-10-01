'use client';

import Login from '@/features/auth/ui/pages/Login.jsx';
import ProtectedRoute from '@/features/auth/ui/components/ProtectedRoute.jsx';

export default function LoginPage() {
  return (
    <ProtectedRoute requireAuth={false}>
      <Login />
    </ProtectedRoute>
  );
}
