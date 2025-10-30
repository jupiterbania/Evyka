"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useEffect, useState } from "react"
import { useFirestore, useUser } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import type { Purchase } from "@/lib/types";
import { format } from "date-fns";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export function SalesChart() {
  const [salesData, setSalesData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    const fetchSalesData = async () => {
        if (!firestore || !user) return;
        const monthlySales: { [key: string]: number } = {};

        try {
            const imagesCollectionRef = collection(firestore, 'images');
            const imagesSnapshot = await getDocs(imagesCollectionRef);

            for (const imageDoc of imagesSnapshot.docs) {
                const purchasesCollectionRef = collection(firestore, 'images', imageDoc.id, 'purchases');
                const purchasesSnapshot = await getDocs(purchasesCollectionRef);
                
                purchasesSnapshot.forEach(purchaseDoc => {
                    const purchase = purchaseDoc.data() as Purchase;
                    if (purchase.purchaseDate && purchase.purchaseDate.toDate) {
                        const month = format(purchase.purchaseDate.toDate(), 'MMM');
                        monthlySales[month] = (monthlySales[month] || 0) + 1;
                    }
                });
            }
            
            const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            
            const chartData = monthOrder.map(month => ({
                name: month,
                sales: monthlySales[month] || 0
            })).filter(d => d.sales > 0); 

            setSalesData(chartData);
        } catch (err: any) {
            console.log("Caught error in sales chart, creating contextual error.");
            
            // For this component, the error is likely happening on either `getDocs(imagesCollectionRef)`
            // or `getDocs(purchasesCollectionRef)`. We will report the more likely restrictive one, which
            // is iterating through all images. A more robust solution might check permissions individually.
            const permissionError = new FirestorePermissionError({
                path: 'images',
                operation: 'list',
            });
            
            errorEmitter.emit('permission-error', permissionError);
            setError("You don't have permission to view sales data.");
        }
    };

    fetchSalesData();
  }, [firestore, user]);

  if (error) {
    return <div className="h-[300px] flex items-center justify-center text-destructive">{error}</div>
  }

  if (!salesData.length) {
    return <div className="h-[300px] flex items-center justify-center text-muted-foreground">Not enough data to display chart.</div>
  }

  return (
    <div className="h-[300px]">
    <ChartContainer config={chartConfig} className="w-full h-full">
      <BarChart accessibilityLayer data={salesData}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
          allowDecimals={false}
        />
        <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
        <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
      </BarChart>
    </ChartContainer>
    </div>
  )
}
