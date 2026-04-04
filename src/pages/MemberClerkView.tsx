import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type MemberProfile = {
  id: string;
  "Person code"?: string;
  "EU Abbreviation"?: string;
  "EU Name"?: string;
  EC?: string;
  "EC Name"?: string;
  Region?: string;
  District?: string;
  Church?: string;
  "Person type"?: string;
  Title?: string;
  Name?: string;
  "Last Name"?: string;
  "Full Name"?: string;
  "Known as"?: string;
  "Birth Date"?: string;
  Age?: string;
  Birthday?: string;
  "Country of Birth"?: string;
  "Birth Place"?: string;
  "Work Phone"?: string;
  Cellular?: string;
  Email?: string;
  "Document ID"?: string;
  "Other Document ID"?: string;
  Gender?: string;
  "Marital Status"?: string;
  "Father's Name"?: string;
  "Mother's Name"?: string;
  "Wedding Anniversary"?: string;
  "Occupation name"?: string;
  "Education Degree"?: string;
  Address?: string;
  "Address line 2"?: string;
  City?: string;
  Country?: string;
  "Postal Code"?: string;
  "Baptism Date"?: string;
  "Baptism Place"?: string;
  "Baptism by"?: string;
  Category?: string;
  "Last transaction"?: string;
  "Last move date"?: string;
  "Primary Conversion Method"?: string;
  "Secondary Conversion Method"?: string;
  created_at?: string;
  updated_at?: string;
  role?: string;
};

type TransferRequestRow = {
  id: string;
  from_church: string;
  to_church: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | string;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const prettyStatus = (value: string | null | undefined) => {
  if (!value) return "Unknown";
  return value.replace(/_/g, " ");
};

export default function MemberClerkView() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [member, setMember] = useState<MemberProfile | null>(null);
  const [transferRequests, setTransferRequests] = useState<TransferRequestRow[]>([]);

  const [profileForm, setProfileForm] = useState({
    email: "",
    phone: "",
  });

  const [transferForm, setTransferForm] = useState({
    from_church: "Gloryland SDA Church",
    to_church: "",
    reason: "",
  });

  const loadData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: memberData, error: memberError } = await supabase
        .from("members" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberError) throw memberError;

      if (!memberData) {
        setMember(null);
        setTransferRequests([]);
        return;
      }

      setMember(memberData as any as MemberProfile);
      setProfileForm({
        email: (memberData as any).Email ?? (memberData as any).email ?? "",
        phone: (memberData as any)["Work Phone"] ?? (memberData as any).phone ?? "",
      });

      const { data: requestRows, error: requestError } = await supabase
        .from("member_transfer_requests" as any)
        .select("id, from_church, to_church, reason, status, reviewer_notes:reviewer_note, reviewed_at, created_at:requested_at")
        .eq("member_id", (memberData as any).id)
        .order("requested_at", { ascending: false });

      if (requestError) throw requestError;

      const mappedRequests: TransferRequestRow[] = ((requestRows ?? []) as any[]).map((row) => ({
        id: String(row.id),
        from_church: String(row.from_church ?? ""),
        to_church: String(row.to_church ?? ""),
        reason: row.reason ?? null,
        status: String(row.status ?? "pending"),
        reviewer_notes: row.reviewer_notes ?? null,
        reviewed_at: row.reviewed_at ?? null,
        created_at: String(row.created_at ?? new Date().toISOString()),
      }));

      setTransferRequests(mappedRequests);
    } catch (error: any) {
      toast({
        title: "Failed to load clerk view",
        description: error?.message || "Could not load member clerk data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const canSubmitTransfer = useMemo(() => {
    return !!member && transferForm.to_church.trim().length > 0;
  }, [member, transferForm.to_church]);

  const saveProfileUpdates = async () => {
    if (!member) return;
    setSavingProfile(true);
    try {
      const payload = {
        email: profileForm.email.trim() || null,
        phone: profileForm.phone.trim() || null,
      };

      const { error } = await supabase.from("members" as any).update(payload as any).eq("id", member.id);
      if (error) throw error;

      toast({ title: "Profile updates saved" });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Could not save profile updates",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const submitTransferRequest = async () => {
    if (!member || !canSubmitTransfer) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("member_transfer_requests" as any).insert({
        member_id: member.id,
        from_church: transferForm.from_church.trim() || "Gloryland SDA Church",
        to_church: transferForm.to_church.trim(),
        reason: transferForm.reason.trim() || null,
      } as any);

      if (error) throw error;

      toast({ title: "Transfer request submitted" });
      setTransferForm((prev) => ({ ...prev, to_church: "", reason: "" }));
      await loadData();
    } catch (error: any) {
      toast({
        title: "Transfer request failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Membership & Clerk Services"
        description="View your membership status, baptism record, submit transfer requests, and update contact details."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Membership Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading profile...</div>
            ) : !member ? (
              <div className="text-sm text-muted-foreground">No linked member profile found for this account.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {Object.entries(member).map(([key, value]) => (
                  <div key={key}>
                    <div className="text-muted-foreground">{key}</div>
                    <div className="font-medium">{value ?? "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Update Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  value={profileForm.email}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="member@email.com"
                />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input
                  value={profileForm.phone}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="0551234567"
                />
              </div>
            </div>

            <Button onClick={saveProfileUpdates} disabled={!member || savingProfile}>
              {savingProfile ? "Saving..." : "Save Contact Updates"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transfer Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>From Church</Label>
                <Input
                  value={transferForm.from_church}
                  onChange={(event) => setTransferForm((prev) => ({ ...prev, from_church: event.target.value }))}
                  placeholder="Current church"
                />
              </div>
              <div className="space-y-1">
                <Label>To Church</Label>
                <Input
                  value={transferForm.to_church}
                  onChange={(event) => setTransferForm((prev) => ({ ...prev, to_church: event.target.value }))}
                  placeholder="Destination church"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Reason (Optional)</Label>
              <textarea
                value={transferForm.reason}
                onChange={(event) => setTransferForm((prev) => ({ ...prev, reason: event.target.value }))}
                rows={4}
                className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Provide context for transfer request"
              />
            </div>

            <Button onClick={submitTransferRequest} disabled={!canSubmitTransfer || submitting}>
              {submitting ? "Submitting..." : "Submit Transfer Request"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transfer Request History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading requests...</div>
            ) : transferRequests.length === 0 ? (
              <div className="text-sm text-muted-foreground">No transfer requests submitted yet.</div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submitted</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transferRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{formatDate(request.created_at)}</TableCell>
                        <TableCell>{request.from_church}</TableCell>
                        <TableCell>{request.to_church}</TableCell>
                        <TableCell>
                          <Badge variant={request.status === "approved" ? "default" : request.status === "rejected" ? "destructive" : "secondary"} className="capitalize">
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {request.reviewer_notes || request.reason || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
