import DashboardNav from '@/components/layout/DashboardNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-screen bg-slate-950">
      <div className="border-b border-gray-800 px-6 py-4">
        <DashboardNav />
      </div>
      <main className="p-6">{children}</main>
    </section>
  );
}

