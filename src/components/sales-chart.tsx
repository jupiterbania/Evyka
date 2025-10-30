"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useEffect, useState } from "react"
import { useFirestore, useUser } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import type { Purchase } from "@/lib/types";
import { format } from "date-fns";

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export function SalesChart() {
  const [salesData, setSalesData] = useState<any[]>([]);
  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    const fetchSalesData = async () => {
        if (!firestore || !user) return;
        const monthlySales: { [key: string]: number } = {};

        try {
            // Fetch all images
            const imagesCollection = collection(firestore, 'images');
            const imagesSnapshot = await getDocs(imagesCollection);

            // For each image, fetch its purchases subcollection
            for (const imageDoc of imagesSnapshot.docs) {
                const purchasesCollection = collection(firestore, 'images', imageDoc.id, 'purchases');
                const purchasesSnapshot = await getDocs(purchasesCollection);
                
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
            })).filter(d => d.sales > 0); // Optionally filter out months with no sales

            setSalesData(chartData);
        } catch (error) {
            console.error("Error fetching sales data:", error);
            // Here you could set an error state to display in the UI
        }
    };

    fetchSalesData();
  }, [firestore, user]);

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
