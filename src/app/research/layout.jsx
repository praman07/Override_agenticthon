import ProtectedRoute from '@/features/auth/ui/components/ProtectedRoute.jsx';

export const metadata = {
  title: 'AI Research Assistant | Override AI',
  description: 'Evidence-grounded scholarly paper discovery, claim verification, and comparative synthesis.',
};

export default function ResearchRootLayout({ children }) {
  return (
    <ProtectedRoute requireAuth={true}>
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col overflow-x-hidden">
        {children}
      </div>
    </ProtectedRoute>
  );
}
