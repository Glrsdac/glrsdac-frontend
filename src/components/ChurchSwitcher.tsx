import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
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
  const [selectedChurchId, setSelectedChurchId] = useState<string>(currentChurchId || "");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

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
    } else {
      setChurches(data || []);
    }
  };

  const fetchUserContexts = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("user_church_context")
      .select(`
        church_id, is_default,
        church:churches(id, name, address, organization_id, organizations:organization_id(name, type))
      `)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching user contexts:", error);
    } else {
      setUserContexts(data || []);
    }
  };

  useEffect(() => {
    fetchChurches();
    fetchUserContexts();
  }, [user?.id]);

  useEffect(() => {
    if (currentChurchId) {
      setSelectedChurchId(currentChurchId);
    }
  }, [currentChurchId]);

  const handleChurchChange = async (churchId: string) => {
    if (!user?.id || !churchId) return;

    setLoading(true);
    try {
      // Update or insert user church context
      const { error } = await supabase
        .from("user_church_context")
        .upsert({
          user_id: user.id,
          church_id: churchId,
          is_default: false // Could be made configurable later
        });

      if (error) {
        toast({
          title: "Error switching church",
          description: error.message,
          variant: "destructive"
        });
      } else {
        setSelectedChurchId(churchId);
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
        <Select value={selectedChurchId} onValueChange={handleChurchChange} disabled={loading}>
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
            <Select value={selectedChurchId} onValueChange={handleChurchChange} disabled={loading}>
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