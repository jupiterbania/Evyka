
"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { IndianRupee, ShoppingCart, ImageIcon } from "lucide-react";
import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import type { Image, Analytics } from "@/lib/types";

export function DashboardStats() {
    const firestore = useFirestore();
    
    const imagesQuery = useMemoFirebase(() => collection(firestore, 'images'), [firestore]);
    const { data: images, isLoading: imagesLoading } = useCollection<Image>(imagesQuery);

    const analyticsDocRef = useMemoFirebase(() => doc(firestore, 'analytics', 'sales'), [firestore]);
    const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useDoc<Analytics>(analyticsDocRef);

    const getErrorMessage = (error: any) => {
        if (!error) return null;
        if (error.name === 'FirebaseError' && error.message.includes('denied')) {
            return "Permission denied to view statistics.";
        }
        return "An error occurred fetching statistics.";
    }

    const statsError = getErrorMessage(analyticsError);

    const stats = [
        {
            title: "Total Revenue",
            value: analyticsLoading ? '...' : (statsError ? 'Error' : `₹${(analytics?.totalRevenue ?? 0).toLocaleString()}`),
            icon: IndianRupee,
            description: statsError || "Total revenue from all image sales."
        },
        {
            title: "Total Sales",
            value: analyticsLoading ? '...' : (statsError ? 'Error' : (analytics?.totalSales ?? 0).toLocaleString()),
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
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
