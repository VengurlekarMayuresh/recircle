"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

export default function AdminFlaggedPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFlags = async () => {
    try {
      const res = await fetch("/api/admin/flagged");
      if (res.ok) {
        const data = await res.json();
        setFlags(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const resolveFlag = async (flagId: string, status: string) => {
    try {
      const res = await fetch("/api/admin/flagged", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagId, status }),
      });
      if (res.ok) {
        toast({ title: `Flag updated to ${status}` });
        fetchFlags();
      } else {
        toast({ title: "Failed to update flag", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error updating flag", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Flagged Listings</h2>
        <p className="text-muted-foreground">Review materials flagged by the Sentinel fraud detection agent.</p>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Listing</TableHead>
              <TableHead>User / Supplier</TableHead>
              <TableHead>Risk Score</TableHead>
              <TableHead>Reasons</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : flags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">No flagged listings currently.</TableCell>
              </TableRow>
            ) : (
              flags.map((flag) => (
                <TableRow key={flag.id}>
                  <TableCell>
                    {flag.material ? (
                      <div>
                        <Link href={`/materials/${flag.materialId}`} className="font-medium hover:underline text-primary">
                          {flag.material.title}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-1">Status: {flag.material.status}</div>
                      </div>
                    ) : (
                       <span className="text-muted-foreground italic">Material deleted</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {flag.user ? (
                      <>
                        <div className="font-medium">{flag.user.name}</div>
                        <div className="text-xs text-muted-foreground">{flag.user.email}</div>
                      </>
                    ) : (
                      "Unknown User"
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`font-bold ${flag.riskScore > 60 ? 'text-rose-600' : 'text-amber-600'}`}>
                      {flag.riskScore}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[250px] space-y-1">
                      {flag.reasons.map((reason: string, i: number) => (
                        <div key={i} className="text-xs list-item list-inside truncate" title={reason}>
                          {reason}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={flag.status === 'pending' ? 'destructive' : (flag.status === 'cleared' ? 'outline' : 'secondary')}>
                      {flag.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {flag.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                         <Button variant="outline" size="sm" onClick={() => resolveFlag(flag.id, 'cleared')}>
                           Clear Flag
                         </Button>
                         <Button variant="destructive" size="sm" onClick={() => resolveFlag(flag.id, 'banned')}>
                           Archive & Ban
                         </Button>
                      </div>
                    )}
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
