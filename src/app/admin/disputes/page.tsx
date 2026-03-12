"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [resolutionText, setResolutionText] = useState("");
  const { toast } = useToast();

  const fetchDisputes = async () => {
    try {
      const res = await fetch("/api/admin/disputes");
      if (res.ok) {
        const data = await res.json();
        setDisputes(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const openResolveDialog = async (dispute: any) => {
    setSelectedDispute(dispute);
    if (dispute.status === "open") {
      // automatically mark as reviewing when opened by admin
      await fetch("/api/admin/disputes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disputeId: dispute.id, status: "reviewing" }),
      });
      fetchDisputes(); // re-fetch to reflect reviewing status
      dispute.status = "reviewing";
    }
  };

  const handleResolve = async () => {
    if (!resolutionText || !selectedDispute) return;
    try {
      const res = await fetch("/api/admin/disputes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disputeId: selectedDispute.id,
          status: "resolved",
          resolution: resolutionText,
        }),
      });
      
      if (res.ok) {
        toast({ title: "Dispute successfully resolved" });
        setSelectedDispute(null);
        setResolutionText("");
        fetchDisputes();
      } else {
        toast({ title: "Failed to resolve dispute", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error resolving dispute", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dispute Resolution</h2>
        <p className="text-muted-foreground">Review and resolve transaction disputes raised by users.</p>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID / Material</TableHead>
              <TableHead>Raised By</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : disputes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">No disputes found.</TableCell>
              </TableRow>
            ) : (
              disputes.map((dispute) => (
                <TableRow key={dispute.id}>
                  <TableCell>
                    <div className="font-mono text-xs">{dispute.id.slice(0, 8)}...</div>
                    <div className="font-medium truncate max-w-[200px]">
                      {dispute.transaction?.material?.title || "Unknown Material"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {dispute.raiser?.name}
                    <div className="text-xs text-muted-foreground capitalize">
                      {dispute.raiser?.role}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="truncate max-w-[200px]" title={dispute.reason}>
                      {dispute.reason}
                    </div>
                  </TableCell>
                  <TableCell>
                     <Badge variant={dispute.status === 'open' ? 'destructive' : (dispute.status === 'reviewing' ? 'secondary' : 'default')} className="capitalize">
                      {dispute.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(dispute.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => openResolveDialog(dispute)}>
                      {dispute.status === 'resolved' ? 'View Details' : 'Review & Resolve'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedDispute && (
        <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Dispute Details</DialogTitle>
              <DialogDescription>
                Review the evidence and provide a dispute resolution.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                 <h4 className="font-medium text-sm text-muted-foreground mb-1">Reason provided by {selectedDispute.raiser?.name}</h4>
                 <p className="text-sm border p-3 rounded bg-muted/30">{selectedDispute.reason}</p>
              </div>

              {selectedDispute.evidenceImages?.length > 0 ? (
                <div>
                   <h4 className="font-medium text-sm text-muted-foreground mb-2">Evidence Photos</h4>
                   <div className="flex gap-2 overflow-x-auto pb-2">
                     {selectedDispute.evidenceImages.map((img: string, i: number) => (
                        <a key={i} href={img} target="_blank" rel="noreferrer" className="block w-24 h-24 flex-shrink-0 rounded overflow-hidden border">
                           {/* eslint-disable-next-line @next/next/no-img-element */}
                           <img src={img} alt={`Evidence ${i+1}`} className="w-full h-full object-cover" />
                        </a>
                     ))}
                   </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">No evidence photos provided.</div>
              )}

              {selectedDispute.status === 'resolved' ? (
                 <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Resolution by Admin ({selectedDispute.resolver?.name || 'Unknown'})</h4>
                    <p className="text-sm border p-3 rounded bg-emerald-50 text-emerald-900 border-emerald-200">
                      {selectedDispute.resolution}
                    </p>
                 </div>
              ) : (
                <div className="space-y-2 mt-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Record Resolution Action</h4>
                  <Textarea 
                    placeholder="Describe the action taken (e.g., Refund issued, Trust Score reduced for Supplier, etc.)"
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    rows={4}
                  />
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelectedDispute(null)}>
                Close
              </Button>
              {selectedDispute.status !== 'resolved' && (
                <Button onClick={handleResolve} disabled={!resolutionText.trim()}>
                  Mark as Resolved
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
