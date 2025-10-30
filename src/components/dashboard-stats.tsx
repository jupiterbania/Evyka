"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, ShoppingCart, ImageIcon } from "lucide-react";
import { generateAllPhotos, generateDashboardStats } from "@/lib/placeholder-data";
import { useEffect, useState } from "react";
import type { Photo } from "@/lib/types";

export function DashboardStats() {
    const [statsData, setStatsData] = useState({
        totalRevenue: 0,
        totalSales: 0,
        totalImages: 0,
    });

    useEffect(() => {
        const photos = generateAllPhotos();
        setStatsData(generateDashboardStats(photos));
    }, []);

    const stats = [
        {
            title: "Total Revenue",
            value: `$${statsData.totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            description: "Total revenue from all image sales."
        },
        {
            title: "Total Sales",
            value: statsData.totalSales.toLocaleString(),
            icon: ShoppingCart,
            description: "Total number of images sold."
        },
        {
            title: "Images Available",
            value: statsData.totalImages.toLocaleString(),
            icon: ImageIcon,
            description: "Total number of images in the gallery."
        }
    ]
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
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
