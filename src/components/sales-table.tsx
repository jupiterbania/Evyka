'use client';

import { useState, useEffect } from 'react';
import type { Purchase, Image as ImageType, User } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collectionGroup, doc, getDoc, getDocs, query } from 'firebase/firestore';
import { format } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';

type EnrichedPurchase = Purchase & {
  imageTitle?: string;
  userEmail?: string | null;
};

export function SalesTable() {
  const firestore = useFirestore();
  const [enrichedSales, setEnrichedSales] = useState<EnrichedPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const salesQuery = useMemoFirebase(
    () => (firestore ? query(collectionGroup(firestore, 'purchases')) : null),
    [firestore]
  );
  
  const { data: sales, isLoading: salesLoading, error } = useCollection<Purchase>(salesQuery);

  useEffect(() => {
    async function enrichSalesData() {
      if (!sales || !firestore) {
        if (!salesLoading) setIsLoading(false);
        return;
      };

      setIsLoading(true);

      const imageCache = new Map<string, ImageType>();
      const userCache = new Map<string, User>();

      const enriched = await Promise.all(
        sales.map(async (sale) => {
          let imageTitle = 'Unknown Image';
          if (sale.imageId) {
            if (imageCache.has(sale.imageId)) {
              imageTitle = imageCache.get(sale.imageId)?.title || 'Unknown Image';
            } else {
              const imageRef = doc(firestore, 'images', sale.imageId);
              const imageSnap = await getDoc(imageRef);
              if (imageSnap.exists()) {
                const imageData = imageSnap.data() as ImageType;
                imageCache.set(sale.imageId, imageData);
                imageTitle = imageData.title;
              }
            }
          }

          let userEmail: string | null = 'Guest';
          if (sale.userId) {
             if (userCache.has(sale.userId)) {
              userEmail = userCache.get(sale.userId)?.email || 'Unknown User';
            } else {
              const userRef = doc(firestore, 'users', sale.userId);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                const userData = userSnap.data() as User;
                userCache.set(sale.userId, userData);
                userEmail = userData.email;
              }
            }
          }

          return { ...sale, imageTitle, userEmail };
        })
      );
      
      const sorted = enriched.sort((a,b) => b.purchaseDate.toMillis() - a.purchaseDate.toMillis());

      setEnrichedSales(sorted);
      setIsLoading(false);
    }

    enrichSalesData();
  }, [sales, firestore, salesLoading]);

  return (
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="w-full whitespace-nowrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image Title</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    Loading sales data...
                  </TableCell>
                </TableRow>
              )}
               {error && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-destructive">
                    You do not have permission to view sales data.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && enrichedSales.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    No sales have been recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && enrichedSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium truncate max-w-xs">
                    {sale.imageTitle}
                  </TableCell>
                  <TableCell>
                    {sale.userEmail === 'Guest' ? (
                       <Badge variant="secondary">Guest</Badge>
                    ) : (
                        sale.userEmail
                    )}
                    </TableCell>
                  <TableCell>
                    {format(sale.purchaseDate.toDate(), 'PPP p')}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{sale.price.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
