"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

export default function AdminTransportersPage() {
  const [transporters, setTransporters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTransporters = async () => {
    try {
      const res = await fetch("/api/admin/transporters");
      if (res.ok) {
        const data = await res.json();
        setTransporters(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransporters();
  }, []);

  const updateStatus = async (transporterId: string, status: string) => {
    try {
      const res = await fetch("/api/admin/transporters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transporterId, availability_status: status }),
      });
      if (res.ok) {
        toast({ title: `Transporter status updated to ${status}` });
        fetchTransporters();
      } else {
        toast({ title: "Failed to update status", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error updating status", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Transporter Management</h2>
        <p className="text-muted-foreground">Manage and review registered transporters.</p>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name / Contact</TableHead>
              <TableHead>Vehicle Type</TableHead>
              <TableHead>Service Area</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Deliveries</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : transporters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">No transporters found.</TableCell>
              </TableRow>
            ) : (
              transporters.map((transporter) => (
                <TableRow key={transporter.id}>
                  <TableCell>
                    <div className="font-medium">{transporter.user.name}</div>
                    <div className="text-xs text-muted-foreground">{transporter.user.email}</div>
                  </TableCell>
                  <TableCell className="capitalize">
                    {transporter.vehicleType.replace(/_/g, " ")}
                    <div className="text-xs text-muted-foreground">{transporter.vehicleCapacityKg} kg max</div>
                  </TableCell>
                  <TableCell>{transporter.serviceAreaCity}</TableCell>
                  <TableCell>⭐ {transporter.avgRating.toFixed(1)}</TableCell>
                  <TableCell>{transporter.totalDeliveries}</TableCell>
                  <TableCell>
                    <Badge variant={transporter.availabilityStatus === 'available' ? 'default' : 'secondary'} className="capitalize">
                      {transporter.availabilityStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                       {transporter.availabilityStatus !== 'offline' ? (
                          <Button variant="outline" size="sm" onClick={() => updateStatus(transporter.id, 'offline')}>
                            Suspend
                          </Button>
                       ) : (
                           <Button variant="default" size="sm" onClick={() => updateStatus(transporter.id, 'available')}>
                            Activate
                          </Button>
                       )}
                    </div>
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
