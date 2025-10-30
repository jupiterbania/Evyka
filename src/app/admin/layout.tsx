import { Header } from '@/components/header';
import { AdminHeader } from '@/components/admin-header';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminHeader />
      <div className="min-h-screen">{children}</div>
    </>
  );
}
