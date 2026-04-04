import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Trash2, Edit2, Lock, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface Department {
  id: string;
  name: string;
}

interface SharePointDocument {
  id: string;
  department_id: string;
  title: string;
  content: string;
  document_type: string;
  visibility: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  department_name?: string;
}

const DepartmentSharePoint = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [documents, setDocuments] = useState<SharePointDocument[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newDoc, setNewDoc] = useState({
    title: "",
    content: "",
    document_type: "GUIDELINE",
    visibility: "DEPARTMENT",
    department_id: "",
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchDocuments();
    }
  }, [selectedDepartment]);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("is_active", true);

      if (error) throw error;
      setDepartments(data || []);
      if (data && data.length > 0) {
        setSelectedDepartment(String(data[0].id));
        setNewDoc({ ...newDoc, department_id: String(data[0].id) });
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast({
        title: "Error",
        description: "Failed to load departments",
        variant: "destructive",
      });
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from("department_sharepoint" as any)
        .select("*, departments(name)")
        .eq("department_id", selectedDepartment)
        .order("created_at", { ascending: false }) as any);

      if (error) throw error;

      const docsWithDeptName = (data || []).map((doc: any) => ({
        ...doc,
        department_name: doc.departments?.name,
      }));

      setDocuments(docsWithDeptName);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDocument = async () => {
    if (!newDoc.title || !newDoc.content || !newDoc.department_id) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isEditing && editingId) {
        const { error } = await (supabase
          .from("department_sharepoint" as any)
          .update({
            title: newDoc.title,
            content: newDoc.content,
            document_type: newDoc.document_type,
            visibility: newDoc.visibility,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId) as any);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Document updated successfully",
        });
      } else {
        const { error } = await (supabase
          .from("department_sharepoint" as any)
          .insert([
            {
              title: newDoc.title,
              content: newDoc.content,
              document_type: newDoc.document_type,
              visibility: newDoc.visibility,
              department_id: newDoc.department_id,
              created_by: user?.id,
            },
          ]) as any);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Document created successfully",
        });
      }

      setNewDoc({
        title: "",
        content: "",
        document_type: "GUIDELINE",
        visibility: "DEPARTMENT",
        department_id: selectedDepartment,
      });
      setOpenDialog(false);
      setIsEditing(false);
      setEditingId(null);
      await fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save document",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const { error } = await (supabase
        .from("department_sharepoint" as any)
        .delete()
        .eq("id", id) as any);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
      await fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (doc: SharePointDocument) => {
    setNewDoc({
      title: doc.title,
      content: doc.content,
      document_type: doc.document_type,
      visibility: doc.visibility,
      department_id: String(doc.department_id),
    });
    setEditingId(doc.id as any);
    setIsEditing(true);
    setOpenDialog(true);
  };

  const departmentName = departments.find((d) => d.id === selectedDepartment)?.name;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department SharePoint"
        description="Share documents and resources across departments"
      />

      <Tabs defaultValue="browse" className="w-full">
        <TabsList>
          <TabsTrigger value="browse">Browse Documents</TabsTrigger>
          <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <Label htmlFor="dept-select">Select Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-64 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={String(dept.id)}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => {
                  setIsEditing(false);
                  setEditingId(null);
                  setNewDoc({
                    title: "",
                    content: "",
                    document_type: "GUIDELINE",
                    visibility: "DEPARTMENT",
                    department_id: selectedDepartment,
                  });
                }}>
                  <Plus className="h-4 w-4" />
                  Add Document
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {isEditing ? "Edit Document" : "Create New Document"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      placeholder="Document title"
                      value={newDoc.title}
                      onChange={(e) =>
                        setNewDoc({ ...newDoc, title: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>Department</Label>
                    <Select
                      value={newDoc.department_id}
                      onValueChange={(value) =>
                        setNewDoc({ ...newDoc, department_id: value })
                      }
                      disabled={isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={String(dept.id)}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Document Type</Label>
                    <Select
                      value={newDoc.document_type}
                      onValueChange={(value) =>
                        setNewDoc({ ...newDoc, document_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GUIDELINE">Guideline</SelectItem>
                        <SelectItem value="POLICY">Policy</SelectItem>
                        <SelectItem value="PROCEDURE">Procedure</SelectItem>
                        <SelectItem value="MINUTES">Meeting Minutes</SelectItem>
                        <SelectItem value="RESOURCE">Resource</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Visibility</Label>
                    <Select
                      value={newDoc.visibility}
                      onValueChange={(value) =>
                        setNewDoc({ ...newDoc, visibility: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEPARTMENT">Department Only</SelectItem>
                        <SelectItem value="PUBLIC">Church Wide</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Content</Label>
                    <Textarea
                      placeholder="Document content"
                      value={newDoc.content}
                      onChange={(e) =>
                        setNewDoc({ ...newDoc, content: e.target.value })
                      }
                      rows={8}
                    />
                  </div>

                  <Button onClick={handleSaveDocument} className="w-full">
                    {isEditing ? "Update Document" : "Create Document"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <p className="text-muted-foreground">Loading documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="flex justify-center items-center py-12">
                <p className="text-muted-foreground">
                  No documents shared yet for {departmentName}
                </p>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {documents.map((doc) => (
                  <Card key={doc.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{doc.title}</h4>
                          <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                            {doc.document_type}
                          </span>
                          {doc.visibility === "DEPARTMENT" ? (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <Globe className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {doc.content.substring(0, 150)}
                          {doc.content.length > 150 ? "..." : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Created {format(new Date(doc.created_at), "MMM dd, yyyy")}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(doc)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="guidelines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>How to Use SharePoint</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">📄 Creating Documents</h4>
                <p className="text-sm text-muted-foreground">
                  Each department can create and share guidelines, policies, procedures, and other resources. 
                  Click "Add Document" to create a new document for your department.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🔒 Document Types</h4>
                <p className="text-sm text-muted-foreground">
                  Choose from Guidelines, Policies, Procedures, Meeting Minutes, Resources, and Other categories 
                  to organize your documents effectively.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">👥 Sharing Levels</h4>
                <p className="text-sm text-muted-foreground">
                  Documents can be shared <Lock className="h-3 w-3 inline" /> within your department only, or
                  <Globe className="h-3 w-3 inline" /> shared church-wide for maximum visibility and accessibility.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">✏️ Managing Documents</h4>
                <p className="text-sm text-muted-foreground">
                  View all documents categorized by department. Edit or delete documents as needed. 
                  All changes are timestamped for audit purposes.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DepartmentSharePoint;
