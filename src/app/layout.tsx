import './globals.css';
import type { Metadata } from 'next';
import { StoreProvider } from '@/store/StoreProvider';
import { AdminAuthProvider } from '@/components/AdminAuthProvider';
import { ToastProvider } from '@/components/Toast';

export const metadata: Metadata = {
  title: 'ExamBondhuBD — Admin Management Console',
  description: 'Bangladesh Competitive Examination & MCQ Preparation Platform Administration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen">
        <StoreProvider>
          <ToastProvider>
            <AdminAuthProvider>
              {children}
            </AdminAuthProvider>
          </ToastProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
