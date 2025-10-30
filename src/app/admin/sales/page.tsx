import { SalesTable } from '@/components/sales-table';

export default function AdminSalesPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Sales History</h1>
        <p className="text-sm sm:text-base text-muted-foreground">A complete log of all transactions.</p>
      </header>
      
      <SalesTable />
    </div>
  );
}
