import { DashboardStats } from '@/components/dashboard-stats';
import { SalesChart } from '@/components/sales-chart';
import { SiteSettings } from '@/components/site-settings';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function AdminDashboardPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Admin Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Welcome back, Admin! Here's what's happening.</p>
      </header>
      
      <DashboardStats />
      
      <div className="grid gap-8 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>
              A chart showing sales performance over the last 6 months.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SalesChart />
          </CardContent>
        </Card>

        <SiteSettings />

      </div>
    </div>
  );
}
