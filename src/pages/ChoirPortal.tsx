import { useEffect, useState, useCallback } from "react";
import { SongMediaManager } from "@/components/choir/SongMediaManager";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw, Music, Users, CalendarDays, Megaphone, ListMusic, Plus, Pin, Trash2, Pencil,
} from "lucide-react";

/* ────────── types ────────── */

type ChoirMember = {
  id: number;
  choir_name: string;
  voice_part: string | null;
  is_active: boolean;
  joined_at: string;
  member: { first_name: string; last_name: string; member_no: string | null } | null;
};

type Rehearsal = {
  id: number;
  title: string;
  rehearsal_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  choir_name: string;
};

type Song = {
  id: number;
  title: string;
  composer: string | null;
  lyrics: string | null;
  notes: string | null;
  choir_name: string;
  is_active: boolean;
};

type Announcement = {
  id: number;
  title: string;
  body: string;
  choir_name: string;
  is_pinned: boolean;
  created_at: string;
};

/* ────────── component ────────── */

const ChoirPortal = ({ embedded = false }: { embedded?: boolean }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  const [members, setMembers] = useState<ChoirMember[]>([]);
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Dialog states
  const [rehearsalDialog, setRehearsalDialog] = useState(false);
  const [songDialog, setSongDialog] = useState(false);
  const [announcementDialog, setAnnouncementDialog] = useState(false);
  const [addMemberDialog, setAddMemberDialog] = useState(false);
  const [editMemberDialog, setEditMemberDialog] = useState<ChoirMember | null>(null);

  const [rehearsalForm, setRehearsalForm] = useState({ title: "", rehearsal_date: "", start_time: "", end_time: "", location: "", notes: "" });
  const [songForm, setSongForm] = useState({ title: "", composer: "", lyrics: "", notes: "" });
  const [announcementForm, setAnnouncementForm] = useState({ title: "", body: "", is_pinned: false });

  // Add member state
  const [availableMembers, setAvailableMembers] = useState<{ id: number; first_name: string; last_name: string; member_no: string | null }[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedVoicePart, setSelectedVoicePart] = useState<string>("");
  const [editVoicePart, setEditVoicePart] = useState<string>("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  /* ── access check ── */
  useEffect(() => {
    if (embedded) {
      setIsAdmin(true);
      setHasAccess(true);
      setLoading(false);
      return;
    }

    const init = async () => {
      if (!user) return;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role_id,roles(name)")
        .eq("user_id", user.id) as { data: any[] | null; error: any };

      const roleList = (roles ?? []).map((r: any) => r.roles?.name);
      const admin = roleList.includes("SuperAdmin");
      setIsAdmin(admin);

      if (admin) {
        setHasAccess(true);
        setLoading(false);
        return;
      }

      const { data: memberRow } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberRow?.id) {
        const { data: choirRow } = await (supabase
          .from("choir_members" as any)
          .select("id")
          .eq("member_id", memberRow.id)
          .eq("is_active", true)
          .limit(1) as any);

        setHasAccess((choirRow ?? []).length > 0);
      }

      setLoading(false);
    };
    init();
  }, [user, embedded]);

  /* ── data loading ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, rehearsalsRes, songsRes, announcementsRes] = await Promise.all([
        supabase.from("choir_members" as any).select("id, choir_name, voice_part, is_active, joined_at, member:members(first_name, last_name, member_no)").eq("is_active", true).order("joined_at", { ascending: true }),
        supabase.from("choir_rehearsals" as any).select("*").order("rehearsal_date", { ascending: false }).limit(50),
        supabase.from("choir_songs" as any).select("*").eq("is_active", true).order("title", { ascending: true }),
        supabase.from("choir_announcements" as any).select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(20),
      ]);

      setMembers(
        ((membersRes.data ?? []) as any[]).map((r) => ({
          ...r,
          member: Array.isArray(r.member) ? r.member[0] : r.member,
        }))
      );
      setRehearsals((rehearsalsRes.data ?? []) as any[]);
      setSongs((songsRes.data ?? []) as any[]);
      setAnnouncements((announcementsRes.data ?? []) as any[]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (hasAccess) loadData();
  }, [hasAccess, loadData]);

  /* ── create handlers ── */
  const addRehearsal = async () => {
    if (!rehearsalForm.title || !rehearsalForm.rehearsal_date) return;
    const { error } = await supabase.from("choir_rehearsals" as any).insert({
      title: rehearsalForm.title,
      rehearsal_date: rehearsalForm.rehearsal_date,
      start_time: rehearsalForm.start_time || null,
      end_time: rehearsalForm.end_time || null,
      location: rehearsalForm.location || null,
      notes: rehearsalForm.notes || null,
      choir_name: "Main Choir",
      created_by: user?.id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Rehearsal added" });
    setRehearsalDialog(false);
    setRehearsalForm({ title: "", rehearsal_date: "", start_time: "", end_time: "", location: "", notes: "" });
    loadData();
  };

  const addSong = async () => {
    if (!songForm.title) return;
    const { error } = await supabase.from("choir_songs" as any).insert({
      title: songForm.title,
      composer: songForm.composer || null,
      lyrics: songForm.lyrics || null,
      notes: songForm.notes || null,
      choir_name: "Main Choir",
      is_active: true,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Song added" });
    setSongDialog(false);
    setSongForm({ title: "", composer: "", lyrics: "", notes: "" });
    loadData();
  };

  const addAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.body) return;
    const { error } = await supabase.from("choir_announcements" as any).insert({
      title: announcementForm.title,
      body: announcementForm.body,
      is_pinned: announcementForm.is_pinned,
      choir_name: "Main Choir",
      created_by: user?.id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Announcement posted" });
    setAnnouncementDialog(false);
    setAnnouncementForm({ title: "", body: "", is_pinned: false });
    loadData();
  };

  /* ── member management ── */
  const loadAvailableMembers = async () => {
    const existingMemberIds = members.map((cm) => cm.member?.member_no).filter(Boolean);
    const { data: allMembers } = await supabase
      .from("members")
      .select("id, first_name, last_name, member_no")
      .eq("status", "ACTIVE")
      .order("first_name", { ascending: true });

    // Filter out members already in the choir
    const choirMemberIds = new Set(
      ((await supabase.from("choir_members" as any).select("member_id").eq("is_active", true)).data ?? []).map((r: any) => r.member_id)
    );
    setAvailableMembers((allMembers ?? []).filter((m: any) => !choirMemberIds.has(m.id)) as any);
  };

  const addChoirMember = async () => {
    if (!selectedMemberId) return;
    const { error } = await supabase.from("choir_members" as any).insert({
      member_id: Number(selectedMemberId),
      voice_part: selectedVoicePart || null,
      choir_name: "Main Choir",
      is_active: true,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Member added to choir" });
    setAddMemberDialog(false);
    setSelectedMemberId("");
    setSelectedVoicePart("");
    setMemberSearchQuery("");
    loadData();
  };

  const updateVoicePart = async () => {
    if (!editMemberDialog) return;
    const { error } = await supabase.from("choir_members" as any).update({ voice_part: editVoicePart || null }).eq("id", editMemberDialog.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Voice part updated" });
    setEditMemberDialog(null);
    loadData();
  };

  const removeChoirMember = async (memberId: number) => {
    const { error } = await supabase.from("choir_members" as any).update({ is_active: false }).eq("id", memberId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Member removed from choir" });
    loadData();
  };

  const voiceParts = ["Soprano", "Alto", "Tenor", "Bass"];

  const filteredAvailableMembers = availableMembers.filter((m) => {
    if (!memberSearchQuery) return true;
    const q = memberSearchQuery.toLowerCase();
    return m.first_name.toLowerCase().includes(q) || m.last_name.toLowerCase().includes(q) || (m.member_no?.toLowerCase().includes(q) ?? false);
  });

  /* ── render ── */

  if (loading && !hasAccess) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading Choir Portal...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <PageHeader title="Choir Portal" description="Music ministry choir management" />
        <Card>
          <CardContent className="py-12 text-center">
            <Music className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold">Access Restricted</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You must be a choir member or an administrator to view this portal.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const upcomingRehearsals = rehearsals.filter((r) => new Date(r.rehearsal_date) >= new Date(new Date().toDateString()));
  const pastRehearsals = rehearsals.filter((r) => new Date(r.rehearsal_date) < new Date(new Date().toDateString()));

  return (
    <div className={embedded ? "space-y-4" : "space-y-6"}>
      {!embedded && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <PageHeader title="Choir Portal" description="Rehearsal schedule, songs, and announcements" />
            <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-primary/10 bg-gradient-to-br from-background to-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Choir Members</CardTitle>
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">{members.length}</p></CardContent>
            </Card>
            <Card className="border-primary/10 bg-gradient-to-br from-background to-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Upcoming Rehearsals</CardTitle>
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">{upcomingRehearsals.length}</p></CardContent>
            </Card>
            <Card className="border-primary/10 bg-gradient-to-br from-background to-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><ListMusic className="h-4 w-4" /> Songs</CardTitle>
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">{songs.length}</p></CardContent>
            </Card>
            <Card className="border-primary/10 bg-gradient-to-br from-background to-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Megaphone className="h-4 w-4" /> Announcements</CardTitle>
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">{announcements.length}</p></CardContent>
            </Card>
          </div>
        </>
      )}

      {embedded && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Choir Management</h3>
          <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="schedule">
        <TabsList className="flex-wrap">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="songs">Songs</TabsTrigger>
          <TabsTrigger value="media">Media Library</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        {/* ── Schedule ── */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Rehearsal Schedule</CardTitle>
              {isAdmin && (
                <Button size="sm" onClick={() => setRehearsalDialog(true)}><Plus className="h-4 w-4 mr-1" /> Add Rehearsal</Button>
              )}
            </CardHeader>
            <CardContent>
              {upcomingRehearsals.length === 0 && pastRehearsals.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No rehearsals scheduled yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingRehearsals.length > 0 && (
                    <>
                      <h4 className="text-sm font-semibold text-foreground">Upcoming</h4>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Title</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead>Location</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {upcomingRehearsals.map((r) => (
                              <TableRow key={r.id}>
                                <TableCell className="font-medium">{new Date(r.rehearsal_date).toLocaleDateString()}</TableCell>
                                <TableCell>{r.title}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {r.start_time ? `${r.start_time.slice(0, 5)}` : "—"}
                                  {r.end_time ? ` – ${r.end_time.slice(0, 5)}` : ""}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{r.location ?? "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                  {pastRehearsals.length > 0 && (
                    <>
                      <h4 className="text-sm font-semibold text-muted-foreground mt-4">Past</h4>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Title</TableHead>
                              <TableHead>Location</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pastRehearsals.slice(0, 10).map((r) => (
                              <TableRow key={r.id} className="opacity-60">
                                <TableCell>{new Date(r.rehearsal_date).toLocaleDateString()}</TableCell>
                                <TableCell>{r.title}</TableCell>
                                <TableCell>{r.location ?? "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Songs ── */}
        <TabsContent value="songs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Song Library ({songs.length})</CardTitle>
              {isAdmin && (
                <Button size="sm" onClick={() => setSongDialog(true)}><Plus className="h-4 w-4 mr-1" /> Add Song</Button>
              )}
            </CardHeader>
            <CardContent>
              {songs.length === 0 ? (
                <div className="text-center py-8">
                  <ListMusic className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No songs in the library yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Composer</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {songs.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.title}</TableCell>
                          <TableCell className="text-muted-foreground">{s.composer ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{s.notes ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Media Library ── */}
        <TabsContent value="media">
          <SongMediaManager
            songs={songs.map((s) => ({ id: s.id, title: s.title, composer: s.composer }))}
            isAdmin={isAdmin}
          />
        </TabsContent>

        {/* ── Announcements ── */}
        <TabsContent value="announcements">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Announcements</CardTitle>
              {isAdmin && (
                <Button size="sm" onClick={() => setAnnouncementDialog(true)}><Plus className="h-4 w-4 mr-1" /> Post</Button>
              )}
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <div className="text-center py-8">
                  <Megaphone className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No announcements yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {announcements.map((a) => (
                    <div key={a.id} className="border rounded-lg p-4 space-y-1">
                      <div className="flex items-center gap-2">
                        {a.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                        <h4 className="font-semibold text-sm">{a.title}</h4>
                        <span className="text-xs text-muted-foreground ml-auto">{new Date(a.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Members ── */}
        <TabsContent value="members">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Choir Members ({members.length})</CardTitle>
              {isAdmin && (
                <Button size="sm" onClick={() => { loadAvailableMembers(); setAddMemberDialog(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add Member
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No choir members yet.</p>
                  {isAdmin && <p className="text-xs text-muted-foreground mt-1">Click "Add Member" to add church members to the choir.</p>}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Member No</TableHead>
                        <TableHead>Voice Part</TableHead>
                        <TableHead>Joined</TableHead>
                        {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((cm) => (
                        <TableRow key={cm.id}>
                          <TableCell className="font-medium">{cm.member?.first_name} {cm.member?.last_name}</TableCell>
                          <TableCell className="text-muted-foreground">{cm.member?.member_no ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{cm.voice_part ?? "Unassigned"}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{new Date(cm.joined_at).toLocaleDateString()}</TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditMemberDialog(cm); setEditVoicePart(cm.voice_part ?? ""); }}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeChoirMember(cm.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}

      {/* Add Rehearsal */}
      <Dialog open={rehearsalDialog} onOpenChange={setRehearsalDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Rehearsal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={rehearsalForm.title} onChange={(e) => setRehearsalForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Sabbath Preparation" /></div>
            <div><Label>Date</Label><Input type="date" value={rehearsalForm.rehearsal_date} onChange={(e) => setRehearsalForm((p) => ({ ...p, rehearsal_date: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Time</Label><Input type="time" value={rehearsalForm.start_time} onChange={(e) => setRehearsalForm((p) => ({ ...p, start_time: e.target.value }))} /></div>
              <div><Label>End Time</Label><Input type="time" value={rehearsalForm.end_time} onChange={(e) => setRehearsalForm((p) => ({ ...p, end_time: e.target.value }))} /></div>
            </div>
            <div><Label>Location</Label><Input value={rehearsalForm.location} onChange={(e) => setRehearsalForm((p) => ({ ...p, location: e.target.value }))} placeholder="e.g. Church Hall" /></div>
            <div><Label>Notes</Label><Textarea value={rehearsalForm.notes} onChange={(e) => setRehearsalForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <Button className="w-full" onClick={addRehearsal}>Save Rehearsal</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Song */}
      <Dialog open={songDialog} onOpenChange={setSongDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Song</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={songForm.title} onChange={(e) => setSongForm((p) => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Composer</Label><Input value={songForm.composer} onChange={(e) => setSongForm((p) => ({ ...p, composer: e.target.value }))} /></div>
            <div><Label>Lyrics</Label><Textarea value={songForm.lyrics} onChange={(e) => setSongForm((p) => ({ ...p, lyrics: e.target.value }))} rows={4} /></div>
            <div><Label>Notes</Label><Textarea value={songForm.notes} onChange={(e) => setSongForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <Button className="w-full" onClick={addSong}>Save Song</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post Announcement */}
      <Dialog open={announcementDialog} onOpenChange={setAnnouncementDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Post Announcement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={announcementForm.title} onChange={(e) => setAnnouncementForm((p) => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Message</Label><Textarea value={announcementForm.body} onChange={(e) => setAnnouncementForm((p) => ({ ...p, body: e.target.value }))} rows={4} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="pin-announcement" checked={announcementForm.is_pinned} onChange={(e) => setAnnouncementForm((p) => ({ ...p, is_pinned: e.target.checked }))} className="rounded" />
              <Label htmlFor="pin-announcement">Pin to top</Label>
            </div>
            <Button className="w-full" onClick={addAnnouncement}>Post Announcement</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Choir Member */}
      <Dialog open={addMemberDialog} onOpenChange={(open) => { setAddMemberDialog(open); if (!open) { setSelectedMemberId(""); setSelectedVoicePart(""); setMemberSearchQuery(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Choir Member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Search Member</Label>
              <Input
                placeholder="Search by name or member no..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <Label>Select Member</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a church member" />
                </SelectTrigger>
                <SelectContent>
                  {filteredAvailableMembers.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No available members found</div>
                  ) : (
                    filteredAvailableMembers.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.first_name} {m.last_name} {m.member_no ? `(${m.member_no})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Voice Part</Label>
              <Select value={selectedVoicePart} onValueChange={setSelectedVoicePart}>
                <SelectTrigger>
                  <SelectValue placeholder="Select voice part (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {voiceParts.map((vp) => (
                    <SelectItem key={vp} value={vp}>{vp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={addChoirMember} disabled={!selectedMemberId}>Add to Choir</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Voice Part */}
      <Dialog open={!!editMemberDialog} onOpenChange={(open) => { if (!open) setEditMemberDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Voice Part — {editMemberDialog?.member?.first_name} {editMemberDialog?.member?.last_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Voice Part</Label>
              <Select value={editVoicePart} onValueChange={setEditVoicePart}>
                <SelectTrigger>
                  <SelectValue placeholder="Select voice part" />
                </SelectTrigger>
                <SelectContent>
                  {voiceParts.map((vp) => (
                    <SelectItem key={vp} value={vp}>{vp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={updateVoicePart}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChoirPortal;
