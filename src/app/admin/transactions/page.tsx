"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/transactions");
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transactions Directory</h2>
          <p className="text-muted-foreground">View all marketplace exchanges and deliveries.</p>
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Receiver</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Transport Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Initiated On</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading transactions...</TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transactions recorded yet.</TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">
                    {tx.material?.title || "Unknown Material"}
                  </TableCell>
                  <TableCell>
                    <div>{tx.supplier?.name}</div>
                    <div className="text-xs text-muted-foreground">{tx.supplier?.email}</div>
                  </TableCell>
                  <TableCell>
                    <div>{tx.receiver?.name}</div>
                    <div className="text-xs text-muted-foreground">{tx.receiver?.email}</div>
                  </TableCell>
                  <TableCell>{tx.quantity}</TableCell>
                  <TableCell className="capitalize">
                     {tx.transportMethod.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        tx.status === 'completed' ? 'default' : 
                        tx.status === 'cancelled' ? 'destructive' : 'secondary'
                      } 
                      className="capitalize"
                    >
                      {tx.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
