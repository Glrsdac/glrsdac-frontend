import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { LoadingState, EmptyState } from "@/components/LoadingState";

type AssignedClass = {
  id: number;
  class_name: string;
  class_language: string | null;
  age_group: string | null;
  is_children_class: boolean;
  department_id: string;
};

type LessonMaterial = {
  id: number;
  title: string;
  content: string | null;
  week_start: string;
  week_end: string | null;
  language: string | null;
  age_group: string | null;
  is_children: boolean;
  class_id: number | null;
  department_id: string | null;
  created_at: string;
};

type LessonComment = {
  id: number;
  material_id: number;
  member_id: number;
  comment_text: string;
  created_at: string;
  member_name: string;
  member_no: string | null;
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
};

const MemberSabbathLessons = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [materials, setMaterials] = useState<LessonMaterial[]>([]);
  const [memberId, setMemberId] = useState<number | null>(null);
  const [commentsByMaterialId, setCommentsByMaterialId] = useState<Record<number, LessonComment[]>>({});
  const [draftCommentByMaterialId, setDraftCommentByMaterialId] = useState<Record<number, string>>({});
  const [postingMaterialId, setPostingMaterialId] = useState<number | null>(null);

  const loadComments = async (materialIds: number[]) => {
    if (materialIds.length === 0) {
      setCommentsByMaterialId({});
      return;
    }

    try {
      const { data: commentRows, error: commentError } = await supabase
        .from("sabbath_school_material_comments" as any)
        .select("id, material_id, member_id, comment_text, created_at, members(first_name, last_name, member_no)")
        .in("material_id", materialIds)
        .order("created_at", { ascending: true });

      if (commentError) {
        console.warn("Sabbath school comments not available:", commentError.message);
        setCommentsByMaterialId({});
        return;
      }

      const grouped: Record<number, LessonComment[]> = {};
      for (const row of (commentRows ?? []) as any[]) {
        const material_id = Number(row.material_id);
        if (!grouped[material_id]) grouped[material_id] = [];

        const memberRow = Array.isArray(row.members) ? row.members[0] : row.members;
        const firstName = String(memberRow?.first_name ?? "").trim();
        const lastName = String(memberRow?.last_name ?? "").trim();
        const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Member";

        grouped[material_id].push({
          id: Number(row.id),
          material_id,
          member_id: Number(row.member_id),
          comment_text: String(row.comment_text ?? ""),
          created_at: String(row.created_at ?? ""),
          member_name: fullName,
          member_no: memberRow?.member_no ?? null,
        });
      }

      setCommentsByMaterialId(grouped);
    } catch (error: any) {
      console.warn("Error loading Sabbath school comments:", error?.message || error);
      setCommentsByMaterialId({});
    }
  };

  const handlePostComment = async (materialId: number) => {
    const commentText = String(draftCommentByMaterialId[materialId] ?? "").trim();
    
    if (!commentText) {
      toast({ 
        title: "Comment is empty", 
        description: "Write something before posting.", 
        variant: "destructive" 
      });
      return;
    }
    
    if (!memberId) {
      toast({ 
        title: "Missing member profile", 
        description: "Could not identify your member account.", 
        variant: "destructive" 
      });
      return;
    }

    setPostingMaterialId(materialId);
    
    try {
      const { error } = await supabase
        .from("sabbath_school_material_comments" as any)
        .insert({
          material_id: materialId,
          member_id: memberId,
          comment_text: commentText,
        });

      if (error) {
        toast({ 
          title: "Unable to post comment", 
          description: error.message || "An error occurred while posting your comment.", 
          variant: "destructive" 
        });
        setPostingMaterialId(null);
        return;
      }

      // Clear draft
      setDraftCommentByMaterialId((previous) => ({ ...previous, [materialId]: "" }));
      
      // Reload comments
      await loadComments(materials.map((item) => item.id));
      
      toast({ 
        title: "Success",
        description: "Your comment has been posted successfully" 
      });
    } catch (error: any) {
      toast({ 
        title: "Error posting comment", 
        description: error?.message || "An unexpected error occurred.", 
        variant: "destructive" 
      });
    } finally {
      setPostingMaterialId(null);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);

      const { data: memberRow } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!memberRow?.id) {
        setMemberId(null);
        setAssignedClasses([]);
        setMaterials([]);
        setCommentsByMaterialId({});
        setLoading(false);
        return;
      }

      setMemberId(Number(memberRow.id));

      try {
        // Query Sabbath School lessons
        const { data: lessonRows, error: lessonsError } = await supabase
          .from('sabbath_school_lessons')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (lessonsError) {
          console.warn("Sabbath lessons not available:", lessonsError.message);
          toast({
            title: "Note",
            description: "Sabbath school lesson materials could not be loaded.",
          });
          setAssignedClasses([]);
          setMaterials([]);
          setCommentsByMaterialId({});
          setLoading(false);
          return;
        }

        // Query member's Sabbath School assignment
        const { data: assignmentRows, error: assignmentError } = await supabase
          .from('sabbath_school_members')
          .select('id, member_id')
          .eq('member_id', memberRow.id);

        if (assignmentError) {
          console.warn("Sabbath assignment not available:", assignmentError.message);
        }

        const classes = assignmentRows && assignmentRows.length > 0 
          ? [{ id: 1, class_name: 'Sabbath School', class_language: null, age_group: null, is_children_class: false, department_id: '' }] 
          : [];
        setAssignedClasses(classes as AssignedClass[]);

        const lessons: LessonMaterial[] = (lessonRows ?? []).map((row: any) => ({
          id: Number(row.id ?? 0),
          title: String(row.title ?? row.lesson_title ?? 'Lesson'),
          content: row.content ?? null,
          week_start: String(row.week_start ?? row.lesson_date ?? ''),
          week_end: row.week_end ?? null,
          language: row.language ?? null,
          age_group: row.age_group ?? null,
          is_children: Boolean(row.is_children ?? false),
          class_id: Number(row.class_id ?? 0),
          department_id: String(row.department_id ?? ''),
          created_at: String(row.created_at ?? ''),
        }));

        setMaterials(lessons);
        await loadComments(lessons.map((item) => item.id));
        setLoading(false);
      } catch (error: any) {
        console.error("Sabbath school functionality error:", error?.message || error);
        toast({
          title: "Error",
          description: "Failed to load Sabbath school data. Please refresh the page.",
          variant: "destructive",
        });
        setAssignedClasses([]);
        setMaterials([]);
        setCommentsByMaterialId({});
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  const today = new Date().toISOString().slice(0, 10);

  const currentUpcoming = useMemo(
    () =>
      materials.filter((item) => {
        const end = item.week_end || item.week_start;
        return end >= today;
      }),
    [materials, today]
  );

  const past = useMemo(
    () =>
      materials.filter((item) => {
        const end = item.week_end || item.week_start;
        return end < today;
      }),
    [materials, today]
  );

  const renderMaterials = (rows: LessonMaterial[]) => {
    if (rows.length === 0) {
      return <div className="py-8 text-center text-sm text-muted-foreground">No lesson materials found.</div>;
    }

    return (
      <div className="space-y-3">
        {rows.map((item) => (
          <Card key={item.id} className="border-primary/10 bg-background/90">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-base">{item.title}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {item.language && <Badge variant="outline">{item.language}</Badge>}
                  {item.age_group && <Badge variant="outline">{item.age_group}</Badge>}
                  {item.is_children && <Badge>Children</Badge>}
                </div>
              </div>
              <CardDescription>
                Week: {formatDate(item.week_start)}{item.week_end ? ` - ${formatDate(item.week_end)}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.content ? (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.content}</p>
              ) : null}

              <div className="space-y-3">
                <div className="text-sm font-medium">Class Discussion</div>
                <div className="space-y-2">
                  {(commentsByMaterialId[item.id] ?? []).length === 0 ? (
                    <div className="text-xs text-muted-foreground">No comments yet. Start the discussion.</div>
                  ) : (
                    (commentsByMaterialId[item.id] ?? []).map((comment) => (
                      <div key={comment.id} className="rounded-md border border-primary/10 bg-muted/20 px-3 py-2">
                        <div className="text-xs text-muted-foreground">
                          {comment.member_name}
                          {comment.member_no ? ` (${comment.member_no})` : ""}
                          {comment.created_at ? ` • ${new Date(comment.created_at).toLocaleString()}` : ""}
                        </div>
                        <div className="mt-1 text-sm">{comment.comment_text}</div>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <Textarea
                    value={draftCommentByMaterialId[item.id] ?? ""}
                    onChange={(event) =>
                      setDraftCommentByMaterialId((previous) => ({
                        ...previous,
                        [item.id]: event.target.value,
                      }))
                    }
                    placeholder="Share your lesson insight or question..."
                    rows={3}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handlePostComment(item.id)}
                    disabled={postingMaterialId === item.id}
                  >
                    {postingMaterialId === item.id ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-2 sm:space-y-6">
      <PageHeader
        title="Sabbath School Lessons"
        description="Weekly study materials for your assigned Sabbath School class"
      />

      {loading ? (
        <LoadingState message="Loading lesson materials..." />
      ) : (
        <>
      <Card className="border-primary/10 bg-background/90">
        <CardHeader>
          <CardTitle className="text-base">Your Class Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading class assignments...</div>
          ) : assignedClasses.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              You have not been assigned to a Sabbath School class yet. Contact your Sabbath School manager.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {assignedClasses.map((item) => (
                <Badge key={item.id} variant="outline" className="px-2 py-1">
                  {item.class_name}
                  {item.class_language ? ` • ${item.class_language}` : ""}
                  {item.age_group ? ` • ${item.age_group}` : ""}
                  {item.is_children_class ? " • Children" : ""}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/10 bg-background/90">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lesson Materials</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="current" className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-2 rounded-lg border border-primary/10 bg-background/80 p-1">
              <TabsTrigger value="current">Current & Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
            <TabsContent value="current">{renderMaterials(currentUpcoming)}</TabsContent>
            <TabsContent value="past">{renderMaterials(past)}</TabsContent>
            <TabsContent value="all">{renderMaterials(materials)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
};

export default MemberSabbathLessons;