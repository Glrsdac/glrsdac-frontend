import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, FileMusic, Video, Music, Trash2, Download, Play, Eye, X,
} from "lucide-react";

type MediaItem = {
  id: number;
  song_id: number;
  file_type: string;
  voice_part: string | null;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
};

type Song = {
  id: number;
  title: string;
  composer: string | null;
};

const VOICE_PARTS = ["Soprano", "Alto", "Tenor", "Bass"];

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function SongMediaManager({ songs, isAdmin }: { songs: Song[]; isAdmin: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>("");

  // Upload form
  const [uploadSongId, setUploadSongId] = useState("");
  const [uploadFileType, setUploadFileType] = useState<"score" | "recording" | "video">("score");
  const [uploadVoicePart, setUploadVoicePart] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected song filter
  const [filterSongId, setFilterSongId] = useState<string>("all");

  const loadMedia = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase
      .from("choir_song_media" as any)
      .select("*")
      .order("created_at", { ascending: false }) as any);

    if (error) {
      console.error("Error loading media:", error);
    }
    setMedia((data ?? []) as MediaItem[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleUpload = async () => {
    if (!selectedFile || !uploadSongId) return;
    setUploading(true);

    try {
      const ext = selectedFile.name.split(".").pop() || "bin";
      const storagePath = `${uploadFileType}/${uploadSongId}/${Date.now()}_${selectedFile.name}`;

      const { error: storageError } = await supabase.storage
        .from("choir-media")
        .upload(storagePath, selectedFile, { contentType: selectedFile.type });

      if (storageError) throw storageError;

      const { data: publicData } = supabase.storage
        .from("choir-media")
        .getPublicUrl(storagePath);

      const { error: dbError } = await (supabase
        .from("choir_song_media" as any)
        .insert({
          song_id: Number(uploadSongId),
          file_type: uploadFileType,
          voice_part: uploadFileType === "recording" && uploadVoicePart ? uploadVoicePart : null,
          file_name: selectedFile.name,
          file_url: publicData.publicUrl,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          uploaded_by: user?.id,
        }) as any);

      if (dbError) throw dbError;

      toast({ title: "File uploaded successfully" });
      resetUploadForm();
      loadMedia();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteMedia = async (item: MediaItem) => {
    // Extract storage path from URL
    const urlParts = item.file_url.split("/choir-media/");
    if (urlParts.length > 1) {
      const storagePath = decodeURIComponent(urlParts[1]);
      await supabase.storage.from("choir-media").remove([storagePath]);
    }

    const { error } = await (supabase
      .from("choir_song_media" as any)
      .delete()
      .eq("id", item.id) as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "File deleted" });
    loadMedia();
  };

  const resetUploadForm = () => {
    setUploadDialog(false);
    setUploadSongId("");
    setUploadFileType("score");
    setUploadVoicePart("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getAcceptTypes = () => {
    switch (uploadFileType) {
      case "score": return ".pdf,.png,.jpg,.jpeg,.webp";
      case "recording": return ".mp3,.wav,.m4a,.ogg,.aac";
      case "video": return ".mp4,.webm,.mov";
      default: return "*";
    }
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case "score": return <FileMusic className="h-4 w-4" />;
      case "recording": return <Music className="h-4 w-4" />;
      case "video": return <Video className="h-4 w-4" />;
      default: return <FileMusic className="h-4 w-4" />;
    }
  };

  const getFileTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "score": return "default" as const;
      case "recording": return "secondary" as const;
      case "video": return "outline" as const;
      default: return "secondary" as const;
    }
  };

  const songNameMap = new Map(songs.map((s) => [s.id, s.title]));

  const filteredMedia = filterSongId === "all"
    ? media
    : media.filter((m) => String(m.song_id) === filterSongId);

  const scores = filteredMedia.filter((m) => m.file_type === "score");
  const recordings = filteredMedia.filter((m) => m.file_type === "recording");
  const videos = filteredMedia.filter((m) => m.file_type === "video");

  const fullRecordings = recordings.filter((r) => !r.voice_part);
  const partRecordings = recordings.filter((r) => !!r.voice_part);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-lg font-semibold">Song Media Library</h3>
          <Select value={filterSongId} onValueChange={setFilterSongId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by song" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Songs</SelectItem>
              {songs.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setUploadDialog(true)}>
            <Upload className="h-4 w-4 mr-1" /> Upload Media
          </Button>
        )}
      </div>

      <Tabs defaultValue="scores">
        <TabsList>
          <TabsTrigger value="scores">Scores ({scores.length})</TabsTrigger>
          <TabsTrigger value="recordings">Recordings ({recordings.length})</TabsTrigger>
          <TabsTrigger value="videos">Videos ({videos.length})</TabsTrigger>
        </TabsList>

        {/* Scores Tab */}
        <TabsContent value="scores">
          <Card>
            <CardContent className="pt-6">
              {scores.length === 0 ? (
                <EmptyState icon={<FileMusic />} label="No music scores uploaded yet." />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {scores.map((item) => (
                    <MediaCard
                      key={item.id}
                      item={item}
                      songName={songNameMap.get(item.song_id) ?? "Unknown"}
                      isAdmin={isAdmin}
                      onDelete={() => deleteMedia(item)}
                      onPreview={() => { setPreviewUrl(item.file_url); setPreviewType(item.mime_type ?? ""); }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recordings Tab */}
        <TabsContent value="recordings">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {recordings.length === 0 ? (
                <EmptyState icon={<Music />} label="No recordings uploaded yet." />
              ) : (
                <>
                  {fullRecordings.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Full Recordings</h4>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {fullRecordings.map((item) => (
                          <MediaCard
                            key={item.id}
                            item={item}
                            songName={songNameMap.get(item.song_id) ?? "Unknown"}
                            isAdmin={isAdmin}
                            onDelete={() => deleteMedia(item)}
                            onPreview={() => { setPreviewUrl(item.file_url); setPreviewType(item.mime_type ?? ""); }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {VOICE_PARTS.map((part) => {
                    const partFiles = partRecordings.filter((r) => r.voice_part === part);
                    if (partFiles.length === 0) return null;
                    return (
                      <div key={part}>
                        <h4 className="text-sm font-semibold mb-3">{part} Parts</h4>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {partFiles.map((item) => (
                            <MediaCard
                              key={item.id}
                              item={item}
                              songName={songNameMap.get(item.song_id) ?? "Unknown"}
                              isAdmin={isAdmin}
                              onDelete={() => deleteMedia(item)}
                              onPreview={() => { setPreviewUrl(item.file_url); setPreviewType(item.mime_type ?? ""); }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos">
          <Card>
            <CardContent className="pt-6">
              {videos.length === 0 ? (
                <EmptyState icon={<Video />} label="No video performances uploaded yet." />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {videos.map((item) => (
                    <MediaCard
                      key={item.id}
                      item={item}
                      songName={songNameMap.get(item.song_id) ?? "Unknown"}
                      isAdmin={isAdmin}
                      onDelete={() => deleteMedia(item)}
                      onPreview={() => { setPreviewUrl(item.file_url); setPreviewType(item.mime_type ?? ""); }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onOpenChange={(open) => { if (!open) resetUploadForm(); else setUploadDialog(true); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Upload Media</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Song</Label>
              <Select value={uploadSongId} onValueChange={setUploadSongId}>
                <SelectTrigger><SelectValue placeholder="Select song" /></SelectTrigger>
                <SelectContent>
                  {songs.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>File Type</Label>
              <Select value={uploadFileType} onValueChange={(v) => { setUploadFileType(v as any); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Music Score / Sheet</SelectItem>
                  <SelectItem value="recording">Audio Recording</SelectItem>
                  <SelectItem value="video">Video Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {uploadFileType === "recording" && (
              <div>
                <Label>Voice Part (optional — leave empty for full recording)</Label>
                <Select value={uploadVoicePart} onValueChange={setUploadVoicePart}>
                  <SelectTrigger><SelectValue placeholder="Full choir recording" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Choir (no specific part)</SelectItem>
                    {VOICE_PARTS.map((vp) => (
                      <SelectItem key={vp} value={vp}>{vp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>File</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept={getAcceptTypes()}
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {uploadFileType === "score" && "Accepted: PDF, PNG, JPG, WebP"}
                {uploadFileType === "recording" && "Accepted: MP3, WAV, M4A, OGG, AAC"}
                {uploadFileType === "video" && "Accepted: MP4, WebM, MOV (max 20MB)"}
              </p>
            </div>
            <Button className="w-full" onClick={handleUpload} disabled={uploading || !selectedFile || !uploadSongId}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => { if (!open) { setPreviewUrl(null); setPreviewType(""); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader><DialogTitle>Preview</DialogTitle></DialogHeader>
          {previewUrl && (
            <div className="space-y-3">
              {previewType.startsWith("image/") && (
                <img src={previewUrl} alt="Score preview" className="w-full rounded-md" />
              )}
              {previewType === "application/pdf" && (
                <iframe src={previewUrl} className="w-full h-[70vh] rounded-md border" />
              )}
              {previewType.startsWith("audio/") && (
                <audio controls className="w-full" src={previewUrl} />
              )}
              {previewType.startsWith("video/") && (
                <video controls className="w-full rounded-md" src={previewUrl} />
              )}
              <div className="flex justify-end">
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Download</Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Sub-components ── */

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="text-center py-8">
      <div className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3 flex items-center justify-center">{icon}</div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function MediaCard({
  item,
  songName,
  isAdmin,
  onDelete,
  onPreview,
}: {
  item: MediaItem;
  songName: string;
  isAdmin: boolean;
  onDelete: () => void;
  onPreview: () => void;
}) {
  const isAudio = item.mime_type?.startsWith("audio/");
  const isVideo = item.mime_type?.startsWith("video/");
  const isImage = item.mime_type?.startsWith("image/");

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant={item.file_type === "score" ? "default" : item.file_type === "recording" ? "secondary" : "outline"} className="shrink-0 text-xs">
            {item.file_type}
          </Badge>
          {item.voice_part && (
            <Badge variant="outline" className="shrink-0 text-xs">{item.voice_part}</Badge>
          )}
        </div>
        {isAdmin && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive shrink-0" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <p className="text-sm font-medium truncate">{item.file_name}</p>
      <p className="text-xs text-muted-foreground">{songName} · {formatSize(item.file_size)}</p>

      {/* Inline audio player */}
      {isAudio && (
        <audio controls className="w-full h-8" src={item.file_url} preload="none" />
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={onPreview}>
          {isAudio || isVideo ? <><Play className="h-3 w-3 mr-1" /> Play</> : <><Eye className="h-3 w-3 mr-1" /> View</>}
        </Button>
        <a href={item.file_url} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm" className="text-xs h-7"><Download className="h-3 w-3 mr-1" /> Download</Button>
        </a>
      </div>
    </div>
  );
}
