import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, ShoppingCart, ImageIcon, Tag } from "lucide-react";
import { dashboardStats } from "@/lib/placeholder-data";

export function DashboardStats() {
    const stats = [
        {
            title: "Total Revenue",
            value: `$${dashboardStats.totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            description: "Total revenue from all image sales."
        },
        {
            title: "Total Sales",
            value: dashboardStats.totalSales.toLocaleString(),
            icon: ShoppingCart,
            description: "Total number of images sold."
        },
        {
            title: "Images Available",
            value: dashboardStats.totalImages.toLocaleString(),
            icon: ImageIcon,
            description: "Total number of images in the gallery."
        },
        {
            title: "Most Popular Category",
            value: dashboardStats.popularCategory,
            icon: Tag,
            description: "The category with the most sales."
        }
    ]
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
         <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
                {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
                {stat.description}
            </p>
            </CardContent>
      </Card>
      ))}
    </div>
  );
}
