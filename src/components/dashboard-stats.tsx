"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, ShoppingCart, ImageIcon } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Image } from "@/lib/types";

export function DashboardStats() {
    const firestore = useFirestore();
    
    const imagesQuery = useMemoFirebase(() => collection(firestore, 'images'), [firestore]);
    const { data: images, isLoading: imagesLoading, error: imagesError } = useCollection<Image>(imagesQuery);

    const totalRevenue = images?.reduce((acc, image) => acc + (image.sales || 0) * image.price, 0) ?? 0;
    const totalSales = images?.reduce((acc, image) => acc + (image.sales || 0), 0) ?? 0;

    const statsError = imagesError ? "You don't have permission to view all image statistics." : null;

    const stats = [
        {
            title: "Total Revenue",
            value: statsError ? 'Error' : `$${totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            description: statsError || "Total revenue from all image sales."
        },
        {
            title: "Total Sales",
            value: statsError ? 'Error' : totalSales.toLocaleString(),
            icon: ShoppingCart,
            description: statsError || "Total number of images sold."
        },
        {
            title: "Images Available",
            value: imagesLoading ? '...' : (images?.length ?? 0).toLocaleString(),
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
