import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/LoadingState";
import { useToast } from "@/hooks/use-toast";

type Role = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  scope_type: string | null;
};

const RolesPermissions = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("roles")
          .select("id, name, description, category, scope_type")
          .order("name", { ascending: true });

        if (error) throw error;
        setRoles((data ?? []) as Role[]);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load roles",
          variant: "destructive",
        });
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toast]);

  const getCategoryColor = (category: string | null) => {
    switch (category?.toUpperCase()) {
      case "SYSTEM":
        return "destructive";
      case "CHURCH":
        return "default";
      case "DEPARTMENT":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getScopeLabel = (scope: string | null) => {
    switch (scope?.toUpperCase()) {
      case "GLOBAL":
        return "Global Access";
      case "CHURCH":
        return "Church Level";
      case "DEPARTMENT":
        return "Department Level";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="View system roles and their access levels"
      />

      {loading ? (
        <LoadingState message="Loading roles..." />
      ) : roles.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No roles found in the system.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {roles.map((role) => (
            <Card key={role.id} className="border-primary/10">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                    {role.description && (
                      <CardDescription className="mt-1">{role.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {role.category && (
                      <Badge variant={getCategoryColor(role.category)}>
                        {role.category}
                      </Badge>
                    )}
                    {role.scope_type && (
                      <Badge variant="outline">
                        {getScopeLabel(role.scope_type)}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}

          <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <CardHeader>
              <CardTitle className="text-sm text-amber-900 dark:text-amber-100">
                Role Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Role assignments are managed through the User Management page. Roles are categorized by type (System, Church, Department) and scope (where they apply).
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RolesPermissions;
