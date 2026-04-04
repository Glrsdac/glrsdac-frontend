import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Music, CalendarDays, ListMusic, Megaphone, Pin } from "lucide-react";

type Rehearsal = {
  id: number;
  title: string;
  rehearsal_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
};

type Song = {
  id: number;
  title: string;
  composer: string | null;
  lyrics: string | null;
  notes: string | null;
};

type Announcement = {
  id: number;
  title: string;
  body: string;
  is_pinned: boolean;
  created_at: string;
};

const MemberChoirView = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) return;

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
    checkAccess();
  }, [user]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rehearsalsRes, songsRes, announcementsRes] = await Promise.all([
        supabase.from("choir_rehearsals" as any).select("id, title, rehearsal_date, start_time, end_time, location, notes").order("rehearsal_date", { ascending: false }).limit(50),
        supabase.from("choir_songs" as any).select("id, title, composer, lyrics, notes").eq("is_active", true).order("title", { ascending: true }),
        supabase.from("choir_announcements" as any).select("id, title, body, is_pinned, created_at").order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(20),
      ]);

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

  if (loading && !hasAccess) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading Choir...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <PageHeader title="Choir" description="Music ministry" />
        <Card>
          <CardContent className="py-12 text-center">
            <Music className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold">Access Restricted</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You must be an active choir member to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = new Date(new Date().toDateString());
  const upcoming = rehearsals.filter((r) => new Date(r.rehearsal_date) >= today);
  const past = rehearsals.filter((r) => new Date(r.rehearsal_date) < today);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Choir" description="Schedules, songs & announcements" />
        <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-primary/10 bg-gradient-to-br from-background to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Upcoming Rehearsals
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{upcoming.length}</p></CardContent>
        </Card>
        <Card className="border-primary/10 bg-gradient-to-br from-background to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ListMusic className="h-4 w-4" /> Songs
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{songs.length}</p></CardContent>
        </Card>
        <Card className="border-primary/10 bg-gradient-to-br from-background to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Megaphone className="h-4 w-4" /> Announcements
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{announcements.length}</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="songs">Songs</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
        </TabsList>

        {/* Schedule */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader><CardTitle>Rehearsal Schedule</CardTitle></CardHeader>
            <CardContent>
              {upcoming.length === 0 && past.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No rehearsals scheduled.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcoming.length > 0 && (
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
                            {upcoming.map((r) => (
                              <TableRow key={r.id}>
                                <TableCell className="font-medium">{new Date(r.rehearsal_date).toLocaleDateString()}</TableCell>
                                <TableCell>{r.title}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {r.start_time ? r.start_time.slice(0, 5) : "—"}
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
                  {past.length > 0 && (
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
                            {past.slice(0, 10).map((r) => (
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

        {/* Songs */}
        <TabsContent value="songs">
          <Card>
            <CardHeader><CardTitle>Song Library ({songs.length})</CardTitle></CardHeader>
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

        {/* Announcements */}
        <TabsContent value="announcements">
          <Card>
            <CardHeader><CardTitle>Announcements</CardTitle></CardHeader>
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
      </Tabs>
    </div>
  );
};

export default MemberChoirView;
