import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Pencil, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface Return {
  id: string;
  return_date: string;
  recipient: string;
  fund_name: string;
  amount: number;
  reference_number?: string;
  description?: string;
  document_url?: string;
  payment_method: string;
  created_at: string;
}

interface ReturnFormState {
  return_date: string;
  recipient: string;
  fund_name: string;
  amount: string;
  reference_number: string;
  description: string;
  payment_method: string;
}

interface ReturnsTabProps {
  returns: Return[];
  returnOpen: boolean;
  setReturnOpen: (open: boolean) => void;
  editingReturnId: string | null;
  deleteReturnId: string | null;
  setDeleteReturnId: (id: string | null) => void;
  returnForm: ReturnFormState;
  setReturnForm: (form: ReturnFormState) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  uploading: boolean;
  userRole: string | null;
  handleReturnSubmit: (e: React.FormEvent) => Promise<void>;
  openEditReturn: (returnRecord: Return) => void;
  handleDeleteReturn: () => Promise<void>;
  resetReturnForm: () => void;
}

export function ReturnsTab({
  returns,
  returnOpen,
  setReturnOpen,
  editingReturnId,
  deleteReturnId,
  setDeleteReturnId,
  returnForm,
  setReturnForm,
  selectedFile,
  setSelectedFile,
  uploading,
  userRole,
  handleReturnSubmit,
  openEditReturn,
  handleDeleteReturn,
  resetReturnForm,
}: ReturnsTabProps) {
  const totalReturns = returns.reduce((sum, r) => sum + r.amount, 0);
  const districtTotal = returns
    .filter((r) => r.recipient === "DISTRICT")
    .reduce((sum, r) => sum + r.amount, 0);
  const conferenceTotal = returns
    .filter((r) => r.recipient === "CONFERENCE")
    .reduce((sum, r) => sum + r.amount, 0);

  const canEdit = userRole === "ADMIN" || userRole === "TREASURER";

  return (
    <>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{returns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">GH₵ {totalReturns.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">District Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">GH₵ {districtTotal.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conference Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">GH₵ {conferenceTotal.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Return Button */}
      {canEdit && (
        <div className="mb-4">
          <Button onClick={() => setReturnOpen(true)}>Add Return</Button>
        </div>
      )}

      {/* Returns Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Fund Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Document</TableHead>
              {canEdit && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {returns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 8 : 7} className="text-center text-muted-foreground">
                  No returns found. Add your first return to get started.
                </TableCell>
              </TableRow>
            ) : (
              returns.map((returnRecord) => (
                <TableRow key={returnRecord.id}>
                  <TableCell>
                    {new Date(returnRecord.return_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={returnRecord.recipient === "DISTRICT" ? "default" : "secondary"}>
                      {returnRecord.recipient}
                    </Badge>
                  </TableCell>
                  <TableCell>{returnRecord.fund_name}</TableCell>
                  <TableCell>GH₵ {returnRecord.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{returnRecord.payment_method}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {returnRecord.reference_number || "-"}
                  </TableCell>
                  <TableCell>
                    {returnRecord.document_url ? (
                      <button
                        onClick={async () => {
                          const { data } = await supabase.storage
                            .from("documents")
                            .createSignedUrl(returnRecord.document_url!, 300);
                          if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                        }}
                        className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="h-4 w-4" />
                        View
                      </button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditReturn(returnRecord)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteReturnId(returnRecord.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Return Dialog */}
      <Dialog open={returnOpen} onOpenChange={(open) => {
        setReturnOpen(open);
        if (!open) resetReturnForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReturnId ? "Edit Return" : "Add Return"}
            </DialogTitle>
            <DialogDescription>
              Record a fund return to district or conference.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReturnSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="return_date">Return Date *</Label>
                  <Input
                    id="return_date"
                    type="date"
                    value={returnForm.return_date}
                    onChange={(e) =>
                      setReturnForm({ ...returnForm, return_date: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient *</Label>
                  <Select
                    value={returnForm.recipient}
                    onValueChange={(value) =>
                      setReturnForm({ ...returnForm, recipient: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DISTRICT">District</SelectItem>
                      <SelectItem value="CONFERENCE">Conference</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fund_name">Fund Name *</Label>
                  <Input
                    id="fund_name"
                    value={returnForm.fund_name}
                    onChange={(e) =>
                      setReturnForm({ ...returnForm, fund_name: e.target.value })
                    }
                    placeholder="e.g., Mission Fund, Building Fund"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (GH₵) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={returnForm.amount}
                    onChange={(e) =>
                      setReturnForm({ ...returnForm, amount: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method *</Label>
                  <Select
                    value={returnForm.payment_method}
                    onValueChange={(value) =>
                      setReturnForm({ ...returnForm, payment_method: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference_number">Reference Number</Label>
                  <Input
                    id="reference_number"
                    value={returnForm.reference_number}
                    onChange={(e) =>
                      setReturnForm({ ...returnForm, reference_number: e.target.value })
                    }
                    placeholder="Transaction/receipt number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={returnForm.description}
                  onChange={(e) =>
                    setReturnForm({ ...returnForm, description: e.target.value })
                  }
                  placeholder="Additional notes about this return..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">Supporting Document</Label>
                <Input
                  id="document"
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
                <p className="text-sm text-muted-foreground">
                  Upload receipt, transfer slip, or supporting document (PDF, Image, DOC)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReturnOpen(false);
                  resetReturnForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : editingReturnId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteReturnId} onOpenChange={() => setDeleteReturnId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Return</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this return? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReturn} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
