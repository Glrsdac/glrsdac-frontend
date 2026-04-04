import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction } from "@/lib/call-edge-function";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, CheckCircle2, AlertCircle, Database, Layers, Zap } from "lucide-react";
import { toast } from "sonner";

type SyncDirection = "external_to_cloud" | "cloud_to_external" | "two_way";

interface EdgeFunction {
  name: string;
  deployed_at: string | null;
}

interface DeploymentResponse {
  success: boolean;
  functions: EdgeFunction[];
  message: string;
  errors?: string[];
}

interface SyncDetail {
  table: string;
  to_cloud: number;
  to_external: number;
  errors: string[];
}

interface SyncResponse {
  success: boolean;
  dry_run: boolean;
  direction: string;
  summary: {
    tables_processed: number;
    records_to_cloud: number;
    records_to_external: number;
    errors: number;
  };
  details: SyncDetail[];
}

interface SchemaChange {
  sql: string;
  description: string;
  auto_apply: boolean;
  applied?: boolean;
  error?: string | null;
}

interface SchemaResponse {
  success: boolean;
  dry_run: boolean;
  total_changes: number;
  applied: number;
  manual_required: number;
  no_changes: boolean;
  details: SchemaChange[];
}

export const DatabaseSync = () => {
  const [syncing, setSyncing] = useState(false);
  const [direction, setDirection] = useState<SyncDirection>("two_way");
  const [dryRun, setDryRun] = useState(true);
  const [lastResult, setLastResult] = useState<SyncResponse | null>(null);

  const [syncingSchema, setSyncingSchema] = useState(false);
  const [schemaDryRun, setSchemaDryRun] = useState(true);
  const [schemaResult, setSchemaResult] = useState<SchemaResponse | null>(null);

  const [deployingFunctions, setDeployingFunctions] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResponse | null>(null);


  const runSync = async () => {
    setSyncing(true);
    setLastResult(null);
    try {
      const data = await callEdgeFunction<SyncResponse>("sync-database", { direction, dry_run: dryRun });
      setLastResult(data);
      if (data?.success) {
        toast.success(
          dryRun
            ? `Dry run complete — ${data.summary.records_to_cloud + data.summary.records_to_external} records would sync`
            : `Sync complete — ${data.summary.records_to_cloud} to cloud, ${data.summary.records_to_external} to external`
        );
      } else {
        toast.error("Sync failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const runSchemaSync = async () => {
    setSyncingSchema(true);
    setSchemaResult(null);
    try {
      const data = await callEdgeFunction<SchemaResponse>("sync-schema", { dry_run: schemaDryRun });
      setSchemaResult(data);
      if (data?.success) {
        if (data.no_changes) {
          toast.success("Schemas are in sync — no changes needed");
        } else {
          toast.success(
            schemaDryRun
              ? `${data.total_changes} schema change(s) detected`
              : `${data.applied} change(s) applied, ${data.manual_required} require manual migration`
          );
        }
      } else {
        toast.error("Schema sync failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Schema sync failed");
    } finally {
      setSyncingSchema(false);
    }
  };

  const deployEdgeFunctions = async () => {
    setDeployingFunctions(true);
    setDeploymentResult(null);
    try {
      const data = await callEdgeFunction<DeploymentResponse>("list-edge-functions", {});
      setDeploymentResult(data);
      if (data?.success) {
        const count = data.functions?.length || 0;
        toast.success(`${count} edge function(s) are deployed and ready`);
      } else {
        toast.error(data?.message || "Failed to check edge functions");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to check edge functions");
    } finally {
      setDeployingFunctions(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Sync
        </CardTitle>
        <CardDescription>
          Synchronize schema and data between Lovable Cloud and your external database
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="data" className="space-y-4">
          <TabsList>
            <TabsTrigger value="data" className="flex items-center gap-1">
              <Database className="h-3.5 w-3.5" /> Data
            </TabsTrigger>
            <TabsTrigger value="schema" className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" /> Schema
            </TabsTrigger>
            <TabsTrigger value="functions" className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5" /> Functions
            </TabsTrigger>
          </TabsList>

          {/* ── Data sync tab ── */}
          <TabsContent value="data" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-2 flex-1">
                <Label>Direction</Label>
                <Select value={direction} onValueChange={(v) => setDirection(v as SyncDirection)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="two_way">Two-way sync</SelectItem>
                    <SelectItem value="external_to_cloud">External → Cloud</SelectItem>
                    <SelectItem value="cloud_to_external">Cloud → External</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch id="dry-run" checked={dryRun} onCheckedChange={setDryRun} />
                <Label htmlFor="dry-run">Dry run</Label>
              </div>
            </div>

            <Button onClick={runSync} disabled={syncing} className="w-full sm:w-auto">
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : dryRun ? "Preview Sync" : "Run Sync"}
            </Button>

            {lastResult && (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant={lastResult.dry_run ? "secondary" : "default"}>
                    {lastResult.dry_run ? "Dry Run" : "Executed"}
                  </Badge>
                  <Badge variant="outline">{lastResult.summary.tables_processed} tables</Badge>
                  <Badge variant="outline">↓ {lastResult.summary.records_to_cloud} to cloud</Badge>
                  <Badge variant="outline">↑ {lastResult.summary.records_to_external} to external</Badge>
                  {lastResult.summary.errors > 0 && (
                    <Badge variant="destructive">{lastResult.summary.errors} errors</Badge>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2">Table</th>
                        <th className="text-right p-2">↓ Cloud</th>
                        <th className="text-right p-2">↑ External</th>
                        <th className="text-center p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastResult.details.map((d) => (
                        <tr key={d.table} className="border-t">
                          <td className="p-2 font-mono text-xs">{d.table}</td>
                          <td className="p-2 text-right">{d.to_cloud}</td>
                          <td className="p-2 text-right">{d.to_external}</td>
                          <td className="p-2 text-center">
                            {d.errors.length > 0 ? (
                              <AlertCircle className="h-4 w-4 text-destructive inline" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Schema sync tab ── */}
          <TabsContent value="schema" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              External database is the source of truth. Missing tables, columns, and enums will be added to Cloud.
            </p>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch id="schema-dry-run" checked={schemaDryRun} onCheckedChange={setSchemaDryRun} />
                <Label htmlFor="schema-dry-run">Dry run</Label>
              </div>

              <Button onClick={runSchemaSync} disabled={syncingSchema} className="w-full sm:w-auto">
                <Layers className={`h-4 w-4 mr-2 ${syncingSchema ? "animate-spin" : ""}`} />
                {syncingSchema ? "Comparing..." : schemaDryRun ? "Compare Schemas" : "Apply Schema Changes"}
              </Button>
            </div>

            {schemaResult && (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant={schemaResult.dry_run ? "secondary" : "default"}>
                    {schemaResult.dry_run ? "Dry Run" : "Applied"}
                  </Badge>
                  {schemaResult.no_changes ? (
                    <Badge variant="outline" className="text-green-600">Schemas in sync ✓</Badge>
                  ) : (
                    <>
                      <Badge variant="outline">{schemaResult.total_changes} change(s)</Badge>
                      {schemaResult.applied > 0 && (
                        <Badge className="bg-green-600">{schemaResult.applied} applied</Badge>
                      )}
                      {schemaResult.manual_required > 0 && (
                        <Badge variant="destructive">{schemaResult.manual_required} manual</Badge>
                      )}
                    </>
                  )}
                </div>

                {schemaResult.details.length > 0 && (
                  <div className="max-h-80 overflow-y-auto border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-2">Change</th>
                          <th className="text-center p-2 w-24">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schemaResult.details.map((d, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2">
                              <div className="font-medium text-xs">{d.description}</div>
                              <pre className="text-[10px] text-muted-foreground mt-1 whitespace-pre-wrap break-all">
                                {d.sql}
                              </pre>
                            </td>
                            <td className="p-2 text-center">
                              {d.applied ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                              ) : d.error ? (
                                <span className="text-[10px] text-destructive">{d.error}</span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">pending</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Edge Functions tab ── */}
          <TabsContent value="functions" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Check and manage edge function deployments. Edge functions handle authentication, authorization, and secure data operations.
            </p>

            <Button onClick={deployEdgeFunctions} disabled={deployingFunctions} className="w-full sm:w-auto">
              <Zap className={`h-4 w-4 mr-2 ${deployingFunctions ? "animate-spin" : ""}`} />
              {deployingFunctions ? "Checking..." : "Check Functions"}
            </Button>

            {deploymentResult && (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {deploymentResult.success ? (
                    <Badge className="bg-green-600">All functions deployed</Badge>
                  ) : (
                    <Badge variant="destructive">Deployment check failed</Badge>
                  )}
                  <Badge variant="outline">{deploymentResult.functions?.length || 0} functions</Badge>
                </div>

                {deploymentResult.functions && deploymentResult.functions.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-2">Function Name</th>
                          <th className="text-left p-2">Deployed At</th>
                          <th className="text-center p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deploymentResult.functions.map((fn) => (
                          <tr key={fn.name} className="border-t">
                            <td className="p-2 font-mono text-xs">{fn.name}</td>
                            <td className="p-2 text-sm">
                              {fn.deployed_at ? new Date(fn.deployed_at).toLocaleString() : "—"}
                            </td>
                            <td className="p-2 text-center">
                              {fn.deployed_at ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-yellow-500 inline" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No functions found
                  </div>
                )}

                {deploymentResult.errors && deploymentResult.errors.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-medium text-destructive">Errors:</div>
                    <div className="bg-destructive/10 border border-destructive/20 rounded p-3 text-sm">
                      {deploymentResult.errors.map((err, i) => (
                        <div key={i} className="font-mono text-xs text-destructive">{err}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
