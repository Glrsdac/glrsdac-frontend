import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Edit, Trash2, Building2, MapPin, Phone, Mail, Globe } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Organization = {
  id: string;
  name: string;
  type: 'conference' | 'union' | 'division' | 'association';
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  established_date?: string;
  is_active: boolean;
  created_at: string;
};

type Church = {
  id: string;
  name: string;
  address?: string;
  organization_id?: string;
  organization?: { name: string; type: string };
};

const ORGANIZATION_TYPES = [
  { value: 'conference', label: 'Conference' },
  { value: 'union', label: 'Union' },
  { value: 'division', label: 'Division' },
  { value: 'association', label: 'Association' },
];

const Organizations = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [churchMappingOpen, setChurchMappingOpen] = useState(false);
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "conference" as Organization['type'],
    code: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    established_date: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<typeof form>>({});
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchOrganizations = async () => {
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .order("type", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching organizations:", error);
      toast({ title: "Error loading organizations", description: error.message, variant: "destructive" });
    } else {
      setOrganizations(data || []);
    }
  };

  const fetchChurches = async () => {
    const { data, error } = await supabase
      .from("churches")
      .select(`
        id, name, address, organization_id,
        organizations:organization_id(name, type)
      `)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching churches:", error);
      toast({ title: "Error loading churches", description: error.message, variant: "destructive" });
    } else {
      setChurches(data || []);
    }
  };

  useEffect(() => {
    fetchOrganizations();
    fetchChurches();
  }, []);

  const validateForm = () => {
    const errors: Partial<typeof form> = {};

    if (!form.name.trim()) errors.name = "Organization name is required";
    if (!form.type) errors.type = "Organization type is required";
    if (!form.code.trim()) errors.code = "Organization code is required";

    // Check for duplicate code
    const duplicateCode = organizations.find(
      org => org.code.toLowerCase() === form.code.toLowerCase() && org.id !== editingId
    );
    if (duplicateCode) errors.code = "Organization code already exists";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const organizationData = {
      name: form.name.trim(),
      type: form.type,
      code: form.code.trim().toUpperCase(),
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      established_date: form.established_date || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("organizations")
        .update(organizationData)
        .eq("id", editingId);

      if (error) {
        toast({ title: "Error updating organization", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Organization updated successfully" });
        resetForm();
        setOpen(false);
        fetchOrganizations();
      }
    } else {
      const { error } = await supabase
        .from("organizations")
        .insert(organizationData);

      if (error) {
        toast({ title: "Error creating organization", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Organization created successfully" });
        resetForm();
        setOpen(false);
        fetchOrganizations();
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    // Check if organization has churches
    const churchesInOrg = churches.filter(c => c.organization_id === deleteId);
    if (churchesInOrg.length > 0) {
      toast({
        title: "Cannot delete organization",
        description: `This organization has ${churchesInOrg.length} church(es) assigned. Remove church assignments first.`,
        variant: "destructive"
      });
      setDeleteId(null);
      return;
    }

    const { error } = await supabase
      .from("organizations")
      .delete()
      .eq("id", deleteId);

    if (error) {
      toast({ title: "Error deleting organization", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Organization deleted successfully" });
      fetchOrganizations();
    }
    setDeleteId(null);
  };

  const handleChurchMapping = async (churchId: string, organizationId: string | null) => {
    const { error } = await supabase
      .from("churches")
      .update({ organization_id: organizationId })
      .eq("id", churchId);

    if (error) {
      toast({ title: "Error updating church organization", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Church organization updated successfully" });
      fetchChurches();
    }
    setChurchMappingOpen(false);
    setSelectedChurch(null);
  };

  const resetForm = () => {
    setForm({
      name: "",
      type: "conference",
      code: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      established_date: "",
    });
    setFormErrors({});
    setEditingId(null);
  };

  const startEdit = (org: Organization) => {
    setForm({
      name: org.name,
      type: org.type,
      code: org.code,
      address: org.address || "",
      phone: org.phone || "",
      email: org.email || "",
      website: org.website || "",
      established_date: org.established_date || "",
    });
    setEditingId(org.id);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Management"
        description="Manage SDA organizations and church assignments"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setChurchMappingOpen(true)} variant="outline">
              <MapPin className="w-4 h-4 mr-2" />
              Map Churches
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Organization
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit Organization" : "Add Organization"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Organization Name *</Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g., Ghana Conference of SDA"
                      />
                      {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Type *</Label>
                      <Select value={form.type} onValueChange={(value: Organization['type']) => setForm(f => ({ ...f, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ORGANIZATION_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.type && <p className="text-xs text-destructive">{formErrors.type}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="code">Code *</Label>
                      <Input
                        id="code"
                        value={form.code}
                        onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                        placeholder="e.g., GCSDA"
                      />
                      {formErrors.code && <p className="text-xs text-destructive">{formErrors.code}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="established_date">Established Date</Label>
                      <Input
                        id="established_date"
                        type="date"
                        value={form.established_date}
                        onChange={e => setForm(f => ({ ...f, established_date: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      placeholder="Organization address"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+233 XX XXX XXXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="info@organization.org"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={form.website}
                        onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                        placeholder="https://organization.org"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    {editingId ? "Update Organization" : "Create Organization"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Organizations
          </CardTitle>
          <CardDescription>
            Manage SDA organizations and their hierarchy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Churches</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map(org => {
                const churchCount = churches.filter(c => c.organization_id === org.id).length;
                return (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {org.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{org.code}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex flex-col gap-1">
                        {org.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {org.phone}
                          </div>
                        )}
                        {org.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {org.email}
                          </div>
                        )}
                        {org.website && (
                          <div className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              Website
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{churchCount} churches</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.is_active ? "default" : "secondary"}>
                        {org.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => startEdit(org)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setDeleteId(org.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{org.name}"? This action cannot be undone.
                                {churchCount > 0 && ` This organization has ${churchCount} church(es) assigned.`}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Church Mapping Dialog */}
      <Dialog open={churchMappingOpen} onOpenChange={setChurchMappingOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Map Churches to Organizations</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Church Name</TableHead>
                  <TableHead>Current Organization</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {churches.map(church => (
                  <TableRow key={church.id}>
                    <TableCell className="font-medium">{church.name}</TableCell>
                    <TableCell>
                      {church.organization ? (
                        <Badge variant="outline">
                          {church.organization.name} ({church.organization.type})
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={church.organization_id || ""}
                        onValueChange={(value) => handleChurchMapping(church.id, value || null)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Remove assignment</SelectItem>
                          {organizations.map(org => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name} ({org.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Organizations;