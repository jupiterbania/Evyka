"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useEffect, useState } from "react"
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Analytics } from "@/lib/types";
import { format, subMonths, getYear } from "date-fns";

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export function SalesChart() {
  const [chartData, setChartData] = useState<any[]>([]);
  const firestore = useFirestore();

  const analyticsDocRef = useMemoFirebase(() => doc(firestore, 'analytics', 'sales'), [firestore]);
  const { data: analytics, isLoading, error } = useDoc<Analytics>(analyticsDocRef);

  useEffect(() => {
    if (analytics && analytics.monthlySales) {
      const monthOrder: { key: string, name: string }[] = [];
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(today, i);
        monthOrder.push({
          key: format(date, 'yyyy-MM'),
          name: format(date, 'MMM')
        });
      }
      
      const data = monthOrder.map(month => ({
          name: month.name,
          sales: analytics.monthlySales[month.key] || 0
      }));

      setChartData(data);
    }
  }, [analytics]);
  
  if (error) {
    return <div className="h-[300px] flex items-center justify-center text-destructive">You don't have permission to view sales data.</div>
  }

  if (isLoading) {
    return <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading chart data...</div>
  }

  if (!chartData.length) {
    return <div className="h-[300px] flex items-center justify-center text-muted-foreground">No sales data available for the last 6 months.</div>
  }

  return (
    <div className="h-[300px]">
    <ChartContainer config={chartConfig} className="w-full h-full">
      <BarChart accessibilityLayer data={chartData}>
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
