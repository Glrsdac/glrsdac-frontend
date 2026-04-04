import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useCurrentChurch } from "@/hooks/use-current-church";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Crown, Users, MapPin } from "lucide-react";

type Church = {
  id: string;
  name: string;
  address?: string;
  organization_id?: string;
  organization?: { name: string; type: string };
};

type UserChurchContext = {
  church_id: string;
  is_default: boolean;
  church: Church;
};

interface ChurchSwitcherProps {
  currentChurchId?: string;
  onChurchChange?: (churchId: string) => void;
  compact?: boolean;
}

export const ChurchSwitcher = ({ currentChurchId, onChurchChange, compact = false }: ChurchSwitcherProps) => {
  const [churches, setChurches] = useState<Church[]>([]);
  const [userContexts, setUserContexts] = useState<UserChurchContext[]>([]);
  const { currentChurch } = useCurrentChurch();
  const [selectedChurchId, setSelectedChurchId] = useState<string>(currentChurchId || "");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchChurches = async () => {
    const { data, error } = await supabase
      .from("churches")
      .select("id, name, address, organization_id")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching churches:", error);
    } else {
      // Fetch organizations separately for display
      const orgIds = [...new Set((data || []).map(c => c.organization_id).filter(Boolean))];
      let orgMap = new Map<string, { name: string; type: string }>();
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase.from("organizations").select("id, name, type").in("id", orgIds);
        (orgs ?? []).forEach((o: any) => orgMap.set(o.id, { name: o.name, type: o.type }));
      }
      const enriched = (data || []).map(c => ({
        ...c,
        organization: c.organization_id ? orgMap.get(c.organization_id) : undefined,
      }));
      setChurches(enriched as any);
    }
  };

  const fetchUserContexts = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("user_church_context")
      .select("church_id, is_default")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching user contexts:", error);
    } else {
      // Enrich with church data
      const contexts = (data || []).map((ctx: any) => ({
        ...ctx,
        church: churches.find(c => c.id === ctx.church_id) || { id: ctx.church_id, name: "Unknown" },
      }));
      setUserContexts(contexts as any);
    }
  };

  useEffect(() => {
    fetchChurches();
    fetchUserContexts();
  }, [user?.id]);

  useEffect(() => {
    if (currentChurch?.id) {
      setSelectedChurchId(currentChurch.id);
    } else if (currentChurchId) {
      setSelectedChurchId(currentChurchId);
    }
  }, [currentChurchId, currentChurch?.id]);

  const handleChurchChange = async (churchId: string) => {
    if (!user?.id || !churchId) return;

    setLoading(true);
    try {
      // First clear any existing selected context for this user.
      const { error: clearError } = await supabase
        .from("user_church_context")
        .update({ is_default: false })
        .eq("user_id", user.id);

      if (clearError) {
        console.error("Error clearing previous church context:", clearError);
      }

      // Upsert selected church context as default
      const { error } = await (supabase
        .from("user_church_context") as any)
        .upsert(
          {
            user_id: user.id,
            church_id: churchId,
            is_default: true
          },
          { onConflict: "user_id,church_id" }
        );

      if (error) {
        toast({
          title: "Error switching church",
          description: error.message,
          variant: "destructive"
        });
      } else {
        // Force refresh of current church context so other pages update immediately.
        window.dispatchEvent(new Event("church-context-updated"));
        setSelectedChurchId(churchId);
        setIsOpen(false); // Close dropdown after selection
        onChurchChange?.(churchId);

        const selectedChurch = churches.find(c => c.id === churchId);
        toast({
          title: "Church switched",
          description: `Now managing: ${selectedChurch?.name}`,
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to switch church context",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedChurch = churches.find(c => c.id === selectedChurchId);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <Select value={selectedChurchId} onValueChange={handleChurchChange} open={isOpen} onOpenChange={setIsOpen} disabled={loading}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select church" />
          </SelectTrigger>
          <SelectContent>
            {churches.map(church => (
              <SelectItem key={church.id} value={church.id}>
                <div className="flex flex-col">
                  <span>{church.name}</span>
                  {church.organization && (
                    <span className="text-xs text-muted-foreground">
                      {church.organization.name}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Church Management Context
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Select value={selectedChurchId} onValueChange={handleChurchChange} open={isOpen} onOpenChange={setIsOpen} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select church to manage" />
              </SelectTrigger>
              <SelectContent>
                {churches.map(church => (
                  <SelectItem key={church.id} value={church.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <div>
                        <div className="font-medium">{church.name}</div>
                        {church.organization && (
                          <div className="text-xs text-muted-foreground">
                            {church.organization.name} ({church.organization.type})
                          </div>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => handleChurchChange(selectedChurchId)}
            disabled={loading || !selectedChurchId}
          >
            {loading ? "Switching..." : "Switch Context"}
          </Button>
        </div>

        {selectedChurch && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{selectedChurch.name}</h3>
                {selectedChurch.address && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3" />
                    {selectedChurch.address}
                  </div>
                )}
                {selectedChurch.organization && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">
                      {selectedChurch.organization.name}
                    </Badge>
                    <Badge variant="secondary">
                      {selectedChurch.organization.type}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {userContexts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Churches</h4>
            <div className="space-y-1">
              {userContexts.slice(0, 3).map(context => (
                <div
                  key={context.church_id}
                  className="flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-muted/50"
                  onClick={() => handleChurchChange(context.church_id)}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{context.church.name}</span>
                    {context.is_default && (
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChurchSwitcher;