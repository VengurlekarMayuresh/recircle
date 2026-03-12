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
import { CheckCircle, XCircle, Eye, Loader2 } from "lucide-react";

interface Verification {
  id: number;
  selfieUrl: string;
  idProofUrl: string;
  vehiclePhotoUrl: string;
  addressProofUrl: string | null;
  status: string;
  reviewedAt: string | null;
  createdAt: string;
  transporter: {
    id: number;
    vehicleType: string;
    vehicleCapacityKg: number;
    serviceAreaCity: string;
    isVolunteer: boolean;
    user: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      city: string;
    };
  };
}

export default function AdminVerificationsPage() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Verification | null>(null);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const fetchVerifications = async () => {
    try {
      const res = await fetch("/api/admin/verifications");
      if (res.ok) {
        const data = await res.json();
        setVerifications(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const handleDecision = async (verificationId: number, status: "verified" | "rejected") => {
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/verifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId, status }),
      });

      if (res.ok) {
        toast({
          title: status === "verified"
            ? "Volunteer approved successfully ✅"
            : "Verification rejected",
        });
        setSelected(null);
        fetchVerifications();
      } else {
        const d = await res.json();
        toast({ title: d.error || "Failed to update", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error updating verification", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const pendingCount = verifications.filter((v) => v.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Volunteer Verifications</h2>
        <p className="text-muted-foreground">
          Review submitted documents and approve or reject volunteer verifications.
          {pendingCount > 0 && (
            <span className="ml-2 text-amber-600 font-bold">
              {pendingCount} pending review
            </span>
          )}
        </p>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Volunteer</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Service Area</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : verifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No verification submissions found.
                </TableCell>
              </TableRow>
            ) : (
              verifications.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="font-medium">{v.transporter.user.name}</div>
                    <div className="text-xs text-muted-foreground">{v.transporter.user.email}</div>
                    {v.transporter.user.phone && (
                      <div className="text-xs text-muted-foreground">{v.transporter.user.phone}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{v.transporter.vehicleType.replace(/_/g, " ")}</span>
                    <div className="text-xs text-muted-foreground">
                      {v.transporter.vehicleCapacityKg} kg capacity
                    </div>
                  </TableCell>
                  <TableCell>{v.transporter.serviceAreaCity}</TableCell>
                  <TableCell>{new Date(v.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        v.status === "verified" ? "default" :
                        v.status === "pending" ? "secondary" :
                        "destructive"
                      }
                      className="capitalize"
                    >
                      {v.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelected(v)} className="gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Review Dialog */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Verification — {selected.transporter.user.name}</DialogTitle>
              <DialogDescription>
                Submitted on {new Date(selected.createdAt).toLocaleDateString()} •{" "}
                {selected.transporter.user.email}
                {selected.transporter.user.phone && ` • ${selected.transporter.user.phone}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Volunteer Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Vehicle Type:</span>{" "}
                  <span className="font-medium capitalize">
                    {selected.transporter.vehicleType.replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Capacity:</span>{" "}
                  <span className="font-medium">{selected.transporter.vehicleCapacityKg} kg</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Service Area:</span>{" "}
                  <span className="font-medium">{selected.transporter.serviceAreaCity}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge
                    variant={
                      selected.status === "verified" ? "default" :
                      selected.status === "pending" ? "secondary" :
                      "destructive"
                    }
                    className="capitalize ml-1"
                  >
                    {selected.status}
                  </Badge>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Submitted Documents</h4>
                <div className="grid grid-cols-2 gap-4">
                  <DocumentCard label="Selfie" url={selected.selfieUrl} />
                  <DocumentCard label="ID Proof" url={selected.idProofUrl} />
                  <DocumentCard label="Vehicle Photo" url={selected.vehiclePhotoUrl} />
                  {selected.addressProofUrl && (
                    <DocumentCard label="Address Proof" url={selected.addressProofUrl} />
                  )}
                </div>
              </div>

              {selected.reviewedAt && (
                <p className="text-xs text-muted-foreground">
                  Reviewed on {new Date(selected.reviewedAt).toLocaleString()}
                </p>
              )}
            </div>

            <DialogFooter>
              {selected.status === "pending" ? (
                <div className="flex gap-3 w-full justify-end">
                  <Button
                    variant="destructive"
                    onClick={() => handleDecision(selected.id, "rejected")}
                    disabled={updating}
                    className="gap-1"
                  >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleDecision(selected.id, "verified")}
                    disabled={updating}
                    className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Approve
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function DocumentCard({ label, url }: { label: string; url: string }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
        {label}
      </div>
      <a href={url} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={label}
          className="w-full h-40 object-cover hover:opacity-80 transition-opacity"
        />
      </a>
    </div>
  );
}
