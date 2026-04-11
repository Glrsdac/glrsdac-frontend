import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Plus, Trash2 } from "lucide-react";

type ClerkTab = "dashboard" | "registry" | "records" | "calendar" | "reports";

type MemberRow = {
  id: number;
  member_no: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  dob: string | null;
  membership_status: string;
  membership_type: string;
  baptism_date: string | null;
  transfer_in_date: string | null;
  transfer_out_date: string | null;
  death_date: string | null;
  is_disciplined: boolean;
  created_at: string;
};

type ClerkEvent = {
  id: number | string;
  member_id: number;
  event_type: string;
  event_date: string;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
};

type MemberDocument = {
  id: number | string;
  member_id: number;
  document_type: string;
  title: string;
  file_url: string | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
};

type TransferRequest = {
  id: string;
  member_id: number;
  from_church: string;
  to_church: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | string;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type AnnouncementRecord = {
  id: number;
  title: string;
  description: string | null;
  url: string | null;
  is_published: boolean;
  published_at: string;
  created_at: string;
};

type NewsletterRecord = {
  id: number;
  title: string;
  content: string | null;
  issue_date: string;
  file_url: string | null;
  is_published: boolean;
  published_at: string;
  created_at: string;
};

type PublicEventRecord = {
  id: number;
  name: string;
  description: string | null;
  event_date: string | null;
  program_level: "general_conference" | "union" | "conference" | "district" | "local_church" | string;
  department_id: string | null;
  department_name: string | null;
  location: string | null;
  url: string | null;
  is_published: boolean;
  created_at: string;
};

const programLevelOptions = [
  "general_conference",
  "union",
  "conference",
  "district",
  "local_church",
] as const;

const formatProgramLevel = (value: string | null | undefined) => {
  if (!value) return "Local Church";
  return value.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
};

const eventTypeOptions = [
  "baptism",
  "profession_of_faith",
  "transfer_in",
  "transfer_out",
  "death",
  "marriage",
  "status_change",
] as const;

const statusOptions = [
  "active",
  "inactive",
  "transferred_in",
  "transferred_out",
  "deceased",
  "disciplined",
] as const;

const typeOptions = ["baptized", "profession_of_faith", "regular", "adventist_transfer"] as const;

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const calculateAge = (dob: string | null | undefined) => {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
};

const getAgeBucket = (age: number | null) => {
  if (age === null) return "Unknown";
  if (age < 18) return "0-17";
  if (age < 31) return "18-30";
  if (age < 46) return "31-45";
  if (age < 61) return "46-60";
  return "61+";
};

const downloadCsv = (filename: string, headers: string[], rows: Array<Array<string | number | boolean | null>>) => {
  const escapeCell = (value: string | number | boolean | null) => {
    const text = String(value ?? "").replace(/"/g, '""');
    return `"${text}"`;
  };

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCell(cell)).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const printReport = (title: string, htmlRows: string) => {
  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          h1 { margin: 0 0 8px; font-size: 20px; }
          p { margin: 0 0 16px; color: #555; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #f6f6f6; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr><th>Category</th><th>Count</th></tr>
          </thead>
          <tbody>${htmlRows}</tbody>
        </table>
      </body>
    </html>
  `;

  const popup = window.open("", "_blank", "width=1000,height=700");
  if (!popup) return;
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  popup.print();
};

export default function ClerkPortal({ initialTab = "dashboard" }: { initialTab?: ClerkTab }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<ClerkTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [events, setEvents] = useState<ClerkEvent[]>([]);
  const [documents, setDocuments] = useState<MemberDocument[]>([]);
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [newsletters, setNewsletters] = useState<NewsletterRecord[]>([]);
  const [publicEvents, setPublicEvents] = useState<PublicEventRecord[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; type: string | null }>>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);

  const [registryQuery, setRegistryQuery] = useState("");

  const [eventOpen, setEventOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    member_id: "",
    event_type: "baptism",
    event_date: "",
    notes: "",
  });

  const [documentOpen, setDocumentOpen] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    member_id: "",
    document_type: "membership_certificate",
    title: "",
    file_url: "",
    notes: "",
  });

  const [editMemberOpen, setEditMemberOpen] = useState(false);
  const [communicationsBusy, setCommunicationsBusy] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    description: "",
    url: "",
    is_published: true,
  });
  const [newsletterForm, setNewsletterForm] = useState({
    title: "",
    content: "",
    issue_date: new Date().toISOString().slice(0, 10),
    file_url: "",
    is_published: true,
  });
  const [publicEventForm, setPublicEventForm] = useState({
    name: "",
    description: "",
    event_date: "",
    program_level: "local_church",
    department_id: "",
    location: "",
    url: "",
    is_published: true,
  });
  const [memberForm, setMemberForm] = useState<{
    id: number | null;
    membership_status: string;
    membership_type: string;
    baptism_date: string;
    transfer_in_date: string;
    transfer_out_date: string;
    death_date: string;
    is_disciplined: boolean;
  }>({
    id: null,
    membership_status: "active",
    membership_type: "regular",
    baptism_date: "",
    transfer_in_date: "",
    transfer_out_date: "",
    death_date: "",
    is_disciplined: false,
  });

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [memberRes, eventRes, docRes, transferRes, announcementRes, newsletterRes, publicEventRes, departmentRes] = await Promise.all([
        supabase
          .from("members" as any)
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("clerk_member_events" as any)
          .select("id, member_id, event_type, event_date, notes, recorded_by, created_at")
          .order("start_date", { ascending: false })
          .limit(300),
        supabase
          .from("member_documents" as any)
          .select("id, member_id, document_type, title, file_url, notes, uploaded_by, created_at")
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("member_transfer_requests" as any)
          .select("id, member_id, from_church, to_church, reason, status, reviewer_notes:reviewer_note, reviewed_by, reviewed_at, created_at:requested_at")
          .order("requested_at", { ascending: false })
          .limit(300),
        supabase
          .from("announcements" as any)
          .select("id, title, description, url, is_published, published_at, created_at")
          .order("published_at", { ascending: false })
          .limit(200),
        supabase
          .from("newsletters" as any)
          .select("id, title, content, issue_date, file_url, is_published, published_at, created_at")
          .order("issue_date", { ascending: false })
          .limit(200),
        supabase
          .from("events" as any)
          .select("id, name, description, start_date, end_date, program_level, department_id, location, url, is_published")
          .order("start_date", { ascending: false })
          .limit(200),
        supabase
          .from("departments" as any)
          .select("id, name, type")
          .eq("is_active", true)
          .order("name", { ascending: true }),
      ]);

          if (memberRes.error) throw memberRes.error;

          const softErrors: string[] = [];
          if (eventRes.error) softErrors.push("member events");
          if (docRes.error) softErrors.push("member documents");
          if (transferRes.error) softErrors.push("transfer requests");
          if (announcementRes.error) softErrors.push("announcements");
          if (newsletterRes.error) softErrors.push("newsletters");
          if (publicEventRes.error) softErrors.push("public events");
          if (departmentRes.error) softErrors.push("departments");

      // Create department lookup map
      const departmentById = new Map<string, string>(
        ((departmentRes.error ? [] : departmentRes.data) ?? [])
          .filter((row: any) => row.id != null && row.name != null)
          .map((row: any) => [String(row.id), String(row.name)])
      );

      const mappedMembers: MemberRow[] = ((memberRes.data ?? []) as any[]).map((row) => ({
        id: Number(row.id),
        member_no: row.member_no ?? null,
        first_name: String(row.first_name ?? ""),
        last_name: String(row.last_name ?? ""),
        email: row.email ?? null,
        phone: row.phone ?? null,
        dob: row.dob ?? null,
        membership_status: String(row.membership_status ?? "active"),
        membership_type: String(row.membership_type ?? "regular"),
        baptism_date: row.baptism_date ?? null,
        transfer_in_date: row.transfer_in_date ?? null,
        transfer_out_date: row.transfer_out_date ?? null,
        death_date: row.death_date ?? null,
        is_disciplined: Boolean(row.is_disciplined),
        created_at: String(row.created_at ?? new Date().toISOString()),
      }));

      setMembers(mappedMembers);
      const mappedEvents: ClerkEvent[] = (((eventRes.error ? [] : eventRes.data) ?? []) as any[]).map((row) => ({
        id: row.id,
        member_id: Number(row.member_id),
        event_type: String(row.event_type ?? "status_change"),
        event_date: String(row.event_date ?? ""),
        notes: row.notes ?? null,
        recorded_by: row.recorded_by ?? null,
        created_at: String(row.created_at ?? new Date().toISOString()),
      }));

      const mappedDocuments: MemberDocument[] = (((docRes.error ? [] : docRes.data) ?? []) as any[]).map((row) => ({
        id: row.id,
        member_id: Number(row.member_id),
        document_type: String(row.document_type ?? "record"),
        title: String(row.title ?? "Untitled"),
        file_url: row.file_url ?? null,
        notes: row.notes ?? null,
        uploaded_by: row.uploaded_by ?? null,
        created_at: String(row.created_at ?? new Date().toISOString()),
      }));

      const mappedTransfers: TransferRequest[] = (((transferRes.error ? [] : transferRes.data) ?? []) as any[]).map((row) => ({
        id: String(row.id),
        member_id: Number(row.member_id),
        from_church: String(row.from_church ?? ""),
        to_church: String(row.to_church ?? ""),
        reason: row.reason ?? null,
        status: String(row.status ?? "pending"),
        reviewer_notes: row.reviewer_notes ?? null,
        reviewed_by: row.reviewed_by ?? null,
        reviewed_at: row.reviewed_at ?? null,
        created_at: String(row.created_at ?? new Date().toISOString()),
      }));

      const mappedAnnouncements: AnnouncementRecord[] = (((announcementRes.error ? [] : announcementRes.data) ?? []) as any[]).map((row) => ({
        id: Number(row.id),
        title: String(row.title ?? "Untitled"),
        description: row.description ?? null,
        url: row.url ?? null,
        is_published: Boolean(row.is_published),
        published_at: String(row.published_at ?? row.created_at ?? new Date().toISOString()),
        created_at: String(row.created_at ?? new Date().toISOString()),
      }));

      const mappedNewsletters: NewsletterRecord[] = (((newsletterRes.error ? [] : newsletterRes.data) ?? []) as any[]).map((row) => ({
        id: Number(row.id),
        title: String(row.title ?? "Untitled"),
        content: row.content ?? null,
        issue_date: String(row.issue_date ?? ""),
        file_url: row.file_url ?? null,
        is_published: Boolean(row.is_published),
        published_at: String(row.published_at ?? row.created_at ?? new Date().toISOString()),
        created_at: String(row.created_at ?? new Date().toISOString()),
      }));

      const mappedPublicEvents: PublicEventRecord[] = (((publicEventRes.error ? [] : publicEventRes.data) ?? []) as any[]).map((row) => ({
        id: Number(row.id),
        name: String(row.name ?? "Untitled"),
        description: row.description ?? null,
        event_date: row.event_date ?? null,
        program_level: String(row.program_level ?? "local_church"),
        department_id: row.department_id ? String(row.department_id) : null,
        department_name: row.department_id ? departmentById.get(String(row.department_id)) || null : null,
        location: row.location ?? null,
        url: row.url ?? null,
        is_published: Boolean(row.is_published),
        created_at: String(row.start_date ?? new Date().toISOString()),
      }));

      setEvents(mappedEvents);
      setDocuments(mappedDocuments);
      setTransferRequests(mappedTransfers);
      setAnnouncements(mappedAnnouncements);
      setNewsletters(mappedNewsletters);
      setPublicEvents(mappedPublicEvents);
      const mappedDepartments = (((departmentRes.error ? [] : departmentRes.data) ?? []) as any[])
        .map((row) => ({
          id: String(row.id),
          name: String(row.name ?? "Department"),
          type: row.type ? String(row.type) : null,
        }))
        .filter((row) => !row.type || row.type.toLowerCase() === "ministry");

      setDepartments(mappedDepartments);

      if (softErrors.length > 0) {
        toast({
          title: "Some clerk sections could not load",
          description: `Loaded members successfully, but failed to load: ${softErrors.join(", ")}.`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to load clerk data",
        description: error?.message || "Could not load clerk portal data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const currentYear = new Date().getFullYear();

  const dashboardStats = useMemo(() => {
    const activeMembers = members.filter((m) => m.membership_status === "active").length;

    const baptismsThisYear = members.filter((m) => {
      if (!m.baptism_date) return false;
      return new Date(m.baptism_date).getFullYear() === currentYear;
    }).length;

    const transfersInThisYear = members.filter((m) => {
      if (!m.transfer_in_date) return false;
      return new Date(m.transfer_in_date).getFullYear() === currentYear;
    }).length;

    const transfersOutThisYear = members.filter((m) => {
      if (!m.transfer_out_date) return false;
      return new Date(m.transfer_out_date).getFullYear() === currentYear;
    }).length;

    const joinedThisYear = members.filter((m) => new Date(m.created_at).getFullYear() === currentYear).length;
    const deceasedThisYear = members.filter((m) => {
      if (!m.death_date) return false;
      return new Date(m.death_date).getFullYear() === currentYear;
    }).length;

    const netGrowth = joinedThisYear + transfersInThisYear - transfersOutThisYear - deceasedThisYear;

    return {
      activeMembers,
      baptismsThisYear,
      transfersInThisYear,
      transfersOutThisYear,
      netGrowth,
    };
  }, [members, currentYear]);

  const filteredMembers = useMemo(() => {
    const q = registryQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
      return (
        fullName.includes(q) ||
        String(m.member_no ?? "").toLowerCase().includes(q) ||
        String(m.membership_status ?? "").toLowerCase().includes(q) ||
        String(m.membership_type ?? "").toLowerCase().includes(q)
      );
    });
  }, [members, registryQuery]);

  const memberById = useMemo(() => {
    const map = new Map<number, MemberRow>();
    for (const member of members) {
      map.set(member.id, member);
    }
    return map;
  }, [members]);

  const statusDistribution = useMemo(() => {
    const map = new Map<string, number>();
    members.forEach((m) => {
      const key = m.membership_status || "unknown";
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [members]);

  const ageDistribution = useMemo(() => {
    const map = new Map<string, number>();
    members.forEach((m) => {
      const age = calculateAge(m.dob);
      const bucket = getAgeBucket(age);
      map.set(bucket, (map.get(bucket) ?? 0) + 1);
    });

    const order = ["0-17", "18-30", "31-45", "46-60", "61+", "Unknown"];
    return order
      .filter((key) => map.has(key))
      .map((key) => [key, map.get(key) ?? 0] as [string, number]);
  }, [members]);

  const exportStatusReport = () => {
    downloadCsv(
      `clerk-status-report-${new Date().toISOString().slice(0, 10)}.csv`,
      ["membership_status", "count"],
      statusDistribution.map(([status, count]) => [status, count])
    );
  };

  const exportAgeReport = () => {
    downloadCsv(
      `clerk-age-report-${new Date().toISOString().slice(0, 10)}.csv`,
      ["age_group", "count"],
      ageDistribution.map(([bucket, count]) => [bucket, count])
    );
  };

  const openMemberEdit = (member: MemberRow) => {
    setMemberForm({
      id: member.id,
      membership_status: member.membership_status || "active",
      membership_type: member.membership_type || "regular",
      baptism_date: member.baptism_date || "",
      transfer_in_date: member.transfer_in_date || "",
      transfer_out_date: member.transfer_out_date || "",
      death_date: member.death_date || "",
      is_disciplined: Boolean(member.is_disciplined),
    });
    setEditMemberOpen(true);
  };

  const saveMemberRegistry = async () => {
    if (!memberForm.id) return;

    const updatePayload = {
      membership_status: memberForm.membership_status,
      membership_type: memberForm.membership_type,
      baptism_date: memberForm.baptism_date || null,
      transfer_in_date: memberForm.transfer_in_date || null,
      transfer_out_date: memberForm.transfer_out_date || null,
      death_date: memberForm.death_date || null,
      is_disciplined: memberForm.is_disciplined,
    };

    const { error } = await supabase
      .from("members" as any)
      .update(updatePayload as any)
      .eq("id", memberForm.id);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }

    await supabase.from("clerk_member_events" as any).insert({
      member_id: memberForm.id,
      event_type: "status_change",
      event_date: new Date().toISOString().slice(0, 10),
      notes: `Updated status to ${memberForm.membership_status}, type to ${memberForm.membership_type}`,
      recorded_by: user?.id ?? null,
    });

    toast({ title: "Member registry updated" });
    setEditMemberOpen(false);
    await loadData();
  };

  const createEvent = async () => {
    if (!eventForm.member_id || !eventForm.event_type || !eventForm.event_date) {
      toast({ title: "Missing fields", description: "Member, event type and date are required.", variant: "destructive" });
      return;
    }

    const memberId = Number(eventForm.member_id);

    const { error } = await supabase.from("clerk_member_events" as any).insert({
      member_id: memberId,
      event_type: eventForm.event_type,
      event_date: eventForm.event_date,
      notes: eventForm.notes || null,
      recorded_by: user?.id ?? null,
    });

    if (error) {
      toast({ title: "Event creation failed", description: error.message, variant: "destructive" });
      return;
    }

    const memberPatch: Record<string, string | null> = {};
    if (eventForm.event_type === "baptism") memberPatch.baptism_date = eventForm.event_date;
    if (eventForm.event_type === "transfer_in") memberPatch.transfer_in_date = eventForm.event_date;
    if (eventForm.event_type === "transfer_out") memberPatch.transfer_out_date = eventForm.event_date;
    if (eventForm.event_type === "death") memberPatch.death_date = eventForm.event_date;

    if (Object.keys(memberPatch).length > 0) {
      await supabase.from("members").update(memberPatch as any).eq("id", memberId as any);
    }

    toast({ title: "Clerk event recorded" });
    setEventForm({ member_id: "", event_type: "baptism", event_date: "", notes: "" });
    setEventOpen(false);
    await loadData();
  };

  const createDocument = async () => {
    if (!documentForm.member_id || !documentForm.document_type || !documentForm.title.trim()) {
      toast({ title: "Missing fields", description: "Member, type and title are required.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("member_documents" as any).insert({
      member_id: Number(documentForm.member_id),
      document_type: documentForm.document_type,
      title: documentForm.title.trim(),
      file_url: documentForm.file_url.trim() || null,
      notes: documentForm.notes.trim() || null,
      uploaded_by: user?.id ?? null,
    });

    if (error) {
      toast({ title: "Document save failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Member record saved" });
    setDocumentForm({ member_id: "", document_type: "membership_certificate", title: "", file_url: "", notes: "" });
    setDocumentOpen(false);
    await loadData();
  };

  const reviewTransferRequest = async (requestId: string, decision: "approved" | "rejected") => {
    if (!user?.id) return;

    const request = transferRequests.find((row) => row.id === requestId);
    if (!request) return;

    setReviewingRequestId(requestId);
    try {
      const notes = (reviewNotes[requestId] || "").trim() || null;

      const { error: reviewError } = await supabase
        .from("member_transfer_requests" as any)
        .update({
          status: decision,
          reviewer_note: notes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        } as any)
        .eq("id", requestId);

      if (reviewError) throw reviewError;

      if (decision === "approved") {
        const today = new Date().toISOString().slice(0, 10);
        await supabase
          .from("members" as any)
          .update({
            membership_status: "transferred_out",
            transfer_out_date: today,
          } as any)
          .eq("id", request.member_id);

        await supabase.from("clerk_member_events" as any).insert({
          member_id: request.member_id,
          event_type: "transfer_out",
          event_date: today,
          notes: `Transfer approved to ${request.to_church}${notes ? ` - ${notes}` : ""}`,
          recorded_by: user.id,
        });
      }

      toast({ title: `Transfer request ${decision}` });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Transfer review failed",
        description: error?.message || "Could not process transfer request.",
        variant: "destructive",
      });
    } finally {
      setReviewingRequestId(null);
    }
  };

  const createAnnouncement = async () => {
    if (!announcementForm.title.trim()) {
      toast({ title: "Missing title", description: "Announcement title is required.", variant: "destructive" });
      return;
    }

    setCommunicationsBusy(true);
    try {
      const { error } = await supabase.from("announcements" as any).insert({
        title: announcementForm.title.trim(),
        description: announcementForm.description.trim() || null,
        url: announcementForm.url.trim() || null,
        is_published: announcementForm.is_published,
        published_at: announcementForm.is_published ? new Date().toISOString() : null,
        created_by: user?.id ?? null,
      } as any);

      if (error) throw error;

      toast({ title: "Announcement published" });
      setAnnouncementForm({ title: "", description: "", url: "", is_published: true });
      await loadData();
    } catch (error: any) {
      toast({ title: "Announcement save failed", description: error?.message || "Could not save announcement.", variant: "destructive" });
    } finally {
      setCommunicationsBusy(false);
    }
  };

  const createNewsletter = async () => {
    if (!newsletterForm.title.trim() || !newsletterForm.issue_date) {
      toast({ title: "Missing fields", description: "Newsletter title and issue date are required.", variant: "destructive" });
      return;
    }

    setCommunicationsBusy(true);
    try {
      const { error } = await supabase.from("newsletters" as any).insert({
        title: newsletterForm.title.trim(),
        content: newsletterForm.content.trim() || null,
        issue_date: newsletterForm.issue_date,
        file_url: newsletterForm.file_url.trim() || null,
        is_published: newsletterForm.is_published,
        published_at: newsletterForm.is_published ? new Date().toISOString() : null,
        created_by: user?.id ?? null,
      } as any);

      if (error) throw error;

      toast({ title: "Newsletter published" });
      setNewsletterForm({
        title: "",
        content: "",
        issue_date: new Date().toISOString().slice(0, 10),
        file_url: "",
        is_published: true,
      });
      await loadData();
    } catch (error: any) {
      toast({ title: "Newsletter save failed", description: error?.message || "Could not save newsletter.", variant: "destructive" });
    } finally {
      setCommunicationsBusy(false);
    }
  };

  const createPublicEvent = async () => {
    if (!publicEventForm.name.trim()) {
      toast({ title: "Missing event name", description: "Event name is required.", variant: "destructive" });
      return;
    }

    setCommunicationsBusy(true);
    try {
      const { error } = await supabase.from("events" as any).insert({
        name: publicEventForm.name.trim(),
        description: publicEventForm.description.trim() || null,
        event_date: publicEventForm.event_date || null,
        program_level: publicEventForm.program_level,
        department_id: publicEventForm.department_id || null,
        location: publicEventForm.location.trim() || null,
        url: publicEventForm.url.trim() || null,
        is_published: publicEventForm.is_published,
        created_by: user?.id ?? null,
      } as any);

      if (error) throw error;

      toast({ title: "Event published" });
      setPublicEventForm({ name: "", description: "", event_date: "", program_level: "local_church", department_id: "", location: "", url: "", is_published: true });
      await loadData();
    } catch (error: any) {
      toast({ title: "Event save failed", description: error?.message || "Could not save event.", variant: "destructive" });
    } finally {
      setCommunicationsBusy(false);
    }
  };

  const removeCommunication = async (tableName: "announcements" | "newsletters" | "events", id: number) => {
    setCommunicationsBusy(true);
    try {
      const { error } = await supabase.from(tableName as any).delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Entry deleted" });
      await loadData();
    } catch (error: any) {
      toast({ title: "Delete failed", description: error?.message || "Could not delete record.", variant: "destructive" });
    } finally {
      setCommunicationsBusy(false);
    }
  };

  return (
    <div className="space-y-5 pb-2 sm:space-y-6">
      <Tabs value={tab} onValueChange={(value) => setTab(value as ClerkTab)}>
        <TabsList className="mb-6 grid h-auto w-full grid-cols-2 gap-2 rounded-lg border border-primary/10 bg-background/80 p-1 md:grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="registry">Registry</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm">Active Members</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{dashboardStats.activeMembers}</CardContent></Card>
            <Card className="border-accent/40 bg-gradient-to-br from-accent/20 via-background to-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm">Baptisms ({currentYear})</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{dashboardStats.baptismsThisYear}</CardContent></Card>
            <Card className="border-secondary bg-gradient-to-br from-secondary/70 via-background to-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm">Transfers In ({currentYear})</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{dashboardStats.transfersInThisYear}</CardContent></Card>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm">Transfers Out ({currentYear})</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{dashboardStats.transfersOutThisYear}</CardContent></Card>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm">Net Growth ({currentYear})</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{dashboardStats.netGrowth}</CardContent></Card>
          </div>

          <Card className="border-primary/10 bg-background/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader><CardTitle className="text-base">Recent Clerk Events</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : events.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No events yet</TableCell></TableRow>
                  ) : (
                    events.slice(0, 10).map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>{formatDate(event.event_date)}</TableCell>
                        <TableCell>{memberById.get(event.member_id) ? `${memberById.get(event.member_id)?.first_name} ${memberById.get(event.member_id)?.last_name}` : `Member #${event.member_id}`}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{event.event_type.replace(/_/g, " ")}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{event.notes || "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="registry" className="space-y-4">
          <Card className="border-primary/10 bg-background/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Member Registry</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <Input
                  value={registryQuery}
                  onChange={(event) => setRegistryQuery(event.target.value)}
                  placeholder="Search by name, member no, status"
                  className="w-full sm:max-w-sm"
                />
                <Button onClick={() => setEventOpen(true)} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-1" /> Record Event
                </Button>
              </div>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Member No</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Baptism</TableHead>
                    <TableHead>Transfer In</TableHead>
                    <TableHead>Transfer Out</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Loading registry...</TableCell></TableRow>
                  ) : filteredMembers.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No members found</TableCell></TableRow>
                  ) : (
                    filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.first_name} {member.last_name}</TableCell>
                        <TableCell>{member.member_no || "—"}</TableCell>
                        <TableCell><Badge variant="secondary" className="capitalize">{member.membership_status.replace(/_/g, " ")}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{member.membership_type.replace(/_/g, " ")}</Badge></TableCell>
                        <TableCell>{formatDate(member.baptism_date)}</TableCell>
                        <TableCell>{formatDate(member.transfer_in_date)}</TableCell>
                        <TableCell>{formatDate(member.transfer_out_date)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openMemberEdit(member)}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          <Card className="border-primary/10 bg-background/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Announcements, Newsletters & Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="announcements" className="space-y-4">
                <TabsList className="grid grid-cols-1 md:grid-cols-2 gap-2 h-auto">
                  <TabsTrigger value="announcements">Announcements</TabsTrigger>
                  <TabsTrigger value="newsletters">Newsletters</TabsTrigger>
                </TabsList>

                <TabsContent value="announcements" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1 md:col-span-2">
                      <Label>Title</Label>
                      <Input value={announcementForm.title} onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Announcement title" />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label>Description</Label>
                      <Textarea value={announcementForm.description} onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Announcement details" />
                    </div>
                    <div className="space-y-1">
                      <Label>Link (optional)</Label>
                      <Input value={announcementForm.url} onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, url: event.target.value }))} placeholder="https://..." />
                    </div>
                    <div className="space-y-1">
                      <Label>Status</Label>
                      <Select value={announcementForm.is_published ? "published" : "draft"} onValueChange={(value) => setAnnouncementForm((prev) => ({ ...prev, is_published: value === "published" }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Button onClick={createAnnouncement} disabled={communicationsBusy}>Publish Announcement</Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Status</TableHead><TableHead>Published</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {announcements.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No announcements yet</TableCell></TableRow>
                      ) : (
                        announcements.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.title}</TableCell>
                            <TableCell><Badge variant={row.is_published ? "default" : "secondary"}>{row.is_published ? "Published" : "Draft"}</Badge></TableCell>
                            <TableCell>{formatDate(row.published_at)}</TableCell>
                            <TableCell className="text-right"><Button variant="outline" size="sm" disabled={communicationsBusy} onClick={() => removeCommunication("announcements", row.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </TabsContent>

                <TabsContent value="newsletters" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1 md:col-span-2">
                      <Label>Title</Label>
                      <Input value={newsletterForm.title} onChange={(event) => setNewsletterForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Newsletter title" />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label>Content</Label>
                      <Textarea value={newsletterForm.content} onChange={(event) => setNewsletterForm((prev) => ({ ...prev, content: event.target.value }))} placeholder="Newsletter summary/content" />
                    </div>
                    <div className="space-y-1">
                      <Label>Issue Date</Label>
                      <Input type="date" value={newsletterForm.issue_date} onChange={(event) => setNewsletterForm((prev) => ({ ...prev, issue_date: event.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>File URL (optional)</Label>
                      <Input value={newsletterForm.file_url} onChange={(event) => setNewsletterForm((prev) => ({ ...prev, file_url: event.target.value }))} placeholder="https://..." />
                    </div>
                    <div className="space-y-1">
                      <Label>Status</Label>
                      <Select value={newsletterForm.is_published ? "published" : "draft"} onValueChange={(value) => setNewsletterForm((prev) => ({ ...prev, is_published: value === "published" }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Button onClick={createNewsletter} disabled={communicationsBusy}>Publish Newsletter</Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Issue Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {newsletters.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No newsletters yet</TableCell></TableRow>
                      ) : (
                        newsletters.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.title}</TableCell>
                            <TableCell>{formatDate(row.issue_date)}</TableCell>
                            <TableCell><Badge variant={row.is_published ? "default" : "secondary"}>{row.is_published ? "Published" : "Draft"}</Badge></TableCell>
                            <TableCell className="text-right"><Button variant="outline" size="sm" disabled={communicationsBusy} onClick={() => removeCommunication("newsletters", row.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </TabsContent>

              </Tabs>
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-background/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Transfer Request Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Review Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading requests...</TableCell></TableRow>
                  ) : transferRequests.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No transfer requests submitted</TableCell></TableRow>
                  ) : (
                    transferRequests.map((request) => {
                      const member = memberById.get(request.member_id);
                      const locked = request.status !== "pending";
                      return (
                        <TableRow key={request.id}>
                          <TableCell>{formatDate(request.created_at)}</TableCell>
                          <TableCell>{member ? `${member.first_name} ${member.last_name}` : `Member #${request.member_id}`}</TableCell>
                          <TableCell>{request.from_church}</TableCell>
                          <TableCell>{request.to_church}</TableCell>
                          <TableCell>
                            <Badge
                              variant={request.status === "approved" ? "default" : request.status === "rejected" ? "destructive" : "secondary"}
                              className="capitalize"
                            >
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {locked ? (
                              <span className="text-sm text-muted-foreground">{request.reviewer_notes || "—"}</span>
                            ) : (
                              <Input
                                placeholder="Optional review note"
                                value={reviewNotes[request.id] ?? ""}
                                onChange={(event) =>
                                  setReviewNotes((prev) => ({
                                    ...prev,
                                    [request.id]: event.target.value,
                                  }))
                                }
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {locked ? (
                              <span className="text-xs text-muted-foreground">Reviewed {formatDate(request.reviewed_at)}</span>
                            ) : (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={reviewingRequestId === request.id}
                                  onClick={() => reviewTransferRequest(request.id, "rejected")}
                                >
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={reviewingRequestId === request.id}
                                  onClick={() => reviewTransferRequest(request.id, "approved")}
                                >
                                  Approve
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-background/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Certificates & Member Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Button onClick={() => setDocumentOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add Record
                </Button>
              </div>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading records...</TableCell></TableRow>
                  ) : documents.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No records uploaded</TableCell></TableRow>
                  ) : (
                    documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>{formatDate(doc.created_at)}</TableCell>
                        <TableCell>{memberById.get(doc.member_id) ? `${memberById.get(doc.member_id)?.first_name} ${memberById.get(doc.member_id)?.last_name}` : `Member #${doc.member_id}`}</TableCell>
                        <TableCell><Badge variant="outline">{doc.document_type}</Badge></TableCell>
                        <TableCell>{doc.title}</TableCell>
                        <TableCell>
                          {doc.file_url ? (
                            <a className="text-primary underline" href={doc.file_url} target="_blank" rel="noreferrer">Open</a>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{doc.notes || "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card className="border-primary/10 bg-background/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Calendar of Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <Label>Program Name</Label>
                  <Input value={publicEventForm.name} onChange={(event) => setPublicEventForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Program/Event title" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea value={publicEventForm.description} onChange={(event) => setPublicEventForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Event details" />
                </div>
                <div className="space-y-1">
                  <Label>Program Level</Label>
                  <Select value={publicEventForm.program_level} onValueChange={(value) => setPublicEventForm((prev) => ({ ...prev, program_level: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {programLevelOptions.map((level) => (
                        <SelectItem key={level} value={level}>{formatProgramLevel(level)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Department</Label>
                  <Select
                    value={publicEventForm.department_id || "__general__"}
                    onValueChange={(value) => setPublicEventForm((prev) => ({ ...prev, department_id: value === "__general__" ? "" : value }))}
                  >
                    <SelectTrigger><SelectValue placeholder="General (Church Board)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__general__">General (Church Board)</SelectItem>
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Leave as General for church-wide board programs, or choose a department as fallback.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Event Date</Label>
                  <Input type="date" value={publicEventForm.event_date} onChange={(event) => setPublicEventForm((prev) => ({ ...prev, event_date: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Location</Label>
                  <Input value={publicEventForm.location} onChange={(event) => setPublicEventForm((prev) => ({ ...prev, location: event.target.value }))} placeholder="Church Hall" />
                </div>
                <div className="space-y-1">
                  <Label>Link (optional)</Label>
                  <Input value={publicEventForm.url} onChange={(event) => setPublicEventForm((prev) => ({ ...prev, url: event.target.value }))} placeholder="https://..." />
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={publicEventForm.is_published ? "published" : "draft"} onValueChange={(value) => setPublicEventForm((prev) => ({ ...prev, is_published: value === "published" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Button onClick={createPublicEvent} disabled={communicationsBusy}>Save Calendar Event</Button>
                </div>
              </div>

              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Program</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {publicEvents.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No calendar events yet</TableCell></TableRow>
                  ) : (
                    publicEvents.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{formatProgramLevel(row.program_level)}</TableCell>
                        <TableCell>{row.department_name || "—"}</TableCell>
                        <TableCell>{formatDate(row.event_date)}</TableCell>
                        <TableCell><Badge variant={row.is_published ? "default" : "secondary"}>{row.is_published ? "Published" : "Draft"}</Badge></TableCell>
                        <TableCell className="text-right"><Button variant="outline" size="sm" disabled={communicationsBusy} onClick={() => removeCommunication("events", row.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="border-primary/10 bg-background/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <CardHeader><CardTitle className="text-base">Membership Status Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Status</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {statusDistribution.map(([status, count]) => (
                      <TableRow key={status}>
                        <TableCell className="capitalize">{status.replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-right">{count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={exportStatusReport}><Download className="h-4 w-4 mr-1" /> CSV</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => printReport(
                      "Membership Status Distribution",
                      statusDistribution.map(([status, count]) => `<tr><td>${status.replace(/_/g, " ")}</td><td>${count}</td></tr>`).join("")
                    )}
                  >
                    <FileText className="h-4 w-4 mr-1" /> PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/10 bg-background/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <CardHeader><CardTitle className="text-base">Age Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Age Group</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {ageDistribution.map(([bucket, count]) => (
                      <TableRow key={bucket}>
                        <TableCell>{bucket}</TableCell>
                        <TableCell className="text-right">{count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={exportAgeReport}><Download className="h-4 w-4 mr-1" /> CSV</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => printReport(
                      "Age Distribution",
                      ageDistribution.map(([bucket, count]) => `<tr><td>${bucket}</td><td>${count}</td></tr>`).join("")
                    )}
                  >
                    <FileText className="h-4 w-4 mr-1" /> PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={eventOpen} onOpenChange={setEventOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Clerk Event</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Member</Label>
              <Select value={eventForm.member_id} onValueChange={(value) => setEventForm((f) => ({ ...f, member_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={String(member.id)}>{member.first_name} {member.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Event Type</Label>
              <Select value={eventForm.event_type} onValueChange={(value) => setEventForm((f) => ({ ...f, event_type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {eventTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Event Date</Label>
              <Input type="date" value={eventForm.event_date} onChange={(event) => setEventForm((f) => ({ ...f, event_date: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={eventForm.notes} onChange={(event) => setEventForm((f) => ({ ...f, notes: event.target.value }))} placeholder="Optional notes" />
            </div>
            <Button className="w-full" onClick={createEvent}>Save Event</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={documentOpen} onOpenChange={setDocumentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Member Document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Member</Label>
              <Select value={documentForm.member_id} onValueChange={(value) => setDocumentForm((f) => ({ ...f, member_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={String(member.id)}>{member.first_name} {member.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Document Type</Label>
              <Input value={documentForm.document_type} onChange={(event) => setDocumentForm((f) => ({ ...f, document_type: event.target.value }))} placeholder="membership_certificate" />
            </div>
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={documentForm.title} onChange={(event) => setDocumentForm((f) => ({ ...f, title: event.target.value }))} placeholder="Membership Certificate" />
            </div>
            <div className="space-y-1">
              <Label>File URL</Label>
              <Input value={documentForm.file_url} onChange={(event) => setDocumentForm((f) => ({ ...f, file_url: event.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={documentForm.notes} onChange={(event) => setDocumentForm((f) => ({ ...f, notes: event.target.value }))} placeholder="Optional notes" />
            </div>
            <Button className="w-full" onClick={createDocument}>Save Document</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editMemberOpen} onOpenChange={setEditMemberOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Membership Registry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Membership Status</Label>
              <Select value={memberForm.membership_status} onValueChange={(value) => setMemberForm((f) => ({ ...f, membership_status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>{status.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Membership Type</Label>
              <Select value={memberForm.membership_type} onValueChange={(value) => setMemberForm((f) => ({ ...f, membership_type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeOptions.map((type) => (
                    <SelectItem key={type} value={type}>{type.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Baptism Date</Label><Input type="date" value={memberForm.baptism_date} onChange={(event) => setMemberForm((f) => ({ ...f, baptism_date: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Transfer In Date</Label><Input type="date" value={memberForm.transfer_in_date} onChange={(event) => setMemberForm((f) => ({ ...f, transfer_in_date: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Transfer Out Date</Label><Input type="date" value={memberForm.transfer_out_date} onChange={(event) => setMemberForm((f) => ({ ...f, transfer_out_date: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Death Date</Label><Input type="date" value={memberForm.death_date} onChange={(event) => setMemberForm((f) => ({ ...f, death_date: event.target.value }))} /></div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Discipline Flag</div>
                <div className="text-xs text-muted-foreground">Marks member as discipline-restricted</div>
              </div>
              <Button
                variant={memberForm.is_disciplined ? "default" : "outline"}
                size="sm"
                onClick={() => setMemberForm((f) => ({ ...f, is_disciplined: !f.is_disciplined }))}
              >
                {memberForm.is_disciplined ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <Button className="w-full" onClick={saveMemberRegistry}>Save Registry</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
