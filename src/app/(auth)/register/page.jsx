'use client';

import Register from '@/features/auth/ui/pages/Register.jsx';
import ProtectedRoute from '@/features/auth/ui/components/ProtectedRoute.jsx';

export default function RegisterPage() {
  return (
    <ProtectedRoute requireAuth={false}>
      <Register />
    </ProtectedRoute>
  );
}
