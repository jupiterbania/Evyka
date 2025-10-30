"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, ShoppingCart, ImageIcon } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import type { Image, Purchase } from "@/lib/types";

export function DashboardStats() {
    const firestore = useFirestore();
    const imagesCollection = useMemoFirebase(() => collection(firestore, 'images'), [firestore]);
    const { data: images, isLoading: imagesLoading } = useCollection<Image>(imagesCollection);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalSales, setTotalSales] = useState(0);

    useEffect(() => {
        const calculateStats = async () => {
            if (!firestore) return;

            const purchasesQuery = collection(firestore, 'users');
            const usersSnapshot = await getDocs(purchasesQuery);
            let revenue = 0;
            let sales = 0;

            for (const userDoc of usersSnapshot.docs) {
                const userPurchasesCollection = collection(firestore, 'users', userDoc.id, 'purchases');
                const purchasesSnapshot = await getDocs(userPurchasesCollection);
                purchasesSnapshot.forEach(purchaseDoc => {
                    const purchase = purchaseDoc.data() as Purchase;
                    revenue += purchase.price;
                    sales += 1;
                });
            }
            setTotalRevenue(revenue);
            setTotalSales(sales);
        };

        calculateStats();
    }, [firestore, images]);

    const stats = [
        {
            title: "Total Revenue",
            value: `$${totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            description: "Total revenue from all image sales."
        },
        {
            title: "Total Sales",
            value: totalSales.toLocaleString(),
            icon: ShoppingCart,
            description: "Total number of images sold."
        },
        {
            title: "Images Available",
            value: images?.length.toLocaleString() ?? '...',
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
