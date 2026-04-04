import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/* =========================================================
   TYPES
========================================================= */

type UpdateItem = {
  id: string;
  title: string;
  body: string;
  date: string;
  link: string | null;
  source: "announcement" | "event" | "newsletter";
  program_level: string | null;
  department_name: string | null;
};

type SortOption = "date_desc" | "date_asc" | "title_asc" | "title_desc";
type DateFilter = "current" | "all" | "upcoming" | "past" | "this_month" | "next_90";

/* =========================================================
   HELPERS
========================================================= */

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const mapRecordToItem = (row: any, source: UpdateItem["source"]): UpdateItem => ({
  id: String(row.id ?? crypto.randomUUID()),
  title: row.title || row.name || "Untitled",
  body: row.description || row.message || row.content || "",
  date:
    row.event_date ||
    row.start_date ||
    row.published_at ||
    row.issue_date ||
    row.created_at ||
    "",
  link: row.url || row.link || row.file_url || null,
  source,
  program_level: row.program_level ?? null,
  department_name: row.departments?.name ?? null,
});

async function fetchOptionalTable(table: string, source: UpdateItem["source"]) {
  const db = supabase as any;
  const orderColumn = table === "announcements" ? "published_at" : "created_at";
  const { data, error } = await db
    .from(table)
    .select("*")
    .order(orderColumn, { ascending: false })
    .limit(50);

  if (error) return [];
  return (data ?? []).map((row: any) => mapRecordToItem(row, source));
}

async function fetchEvents() {
  const db = supabase as any;

  // Fetch events and departments separately to avoid relationship issues
  const [eventsRes, departmentsRes] = await Promise.all([
    db
      .from("events")
      .select("id, name, description, start_date, url, program_level, department_id")
      .eq("is_published", true)
      .order("start_date", { ascending: false })
      .limit(100),
    db
      .from("departments")
      .select("id, name")
      .eq("is_active", true)
  ]);

  if (eventsRes.error) return [];
  if (departmentsRes.error) return (eventsRes.data ?? []).map((row: any) => mapRecordToItem(row, "event"));

  // Create department lookup map
  const departmentById = new Map<string, string>(
    ((departmentsRes.data ?? []) as any[])
      .filter((row) => row.id != null && row.name != null)
      .map((row) => [String(row.id), String(row.name)])
  );

  // Map events with department names
  const eventsWithDepartments = (eventsRes.data ?? []).map((row: any) => ({
    ...row,
    departments: row.department_id ? { name: departmentById.get(String(row.department_id)) || null } : null
  }));

  return eventsWithDepartments.map((row: any) => mapRecordToItem(row, "event"));
}

const formatProgramLevel = (value: string | null | undefined) => {
  if (!value) return "Unspecified";
  return value.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
};

/* =========================================================
   FILTER LOGIC
========================================================= */

function applyItemFilters(
  items: UpdateItem[],
  filters: {
    query: string;
    dateFilter: DateFilter;
    levelFilter: string;
    departmentFilter: string;
    sortBy: SortOption;
  }
) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const recentStart = new Date(todayStart);
  recentStart.setDate(recentStart.getDate() - 30);
  const ninetyDays = new Date();
  ninetyDays.setDate(ninetyDays.getDate() + 90);

  const query = filters.query.trim().toLowerCase();

  return [...items]
    .filter((item) => {
      if (query) {
        const searchable = `${item.title} ${item.body} ${
          item.department_name ?? ""
        }`.toLowerCase();
        if (!searchable.includes(query)) return false;
      }

      const date = new Date(item.date);
      const hasDate = !Number.isNaN(date.getTime());

      if (filters.dateFilter === "current") {
        if (!hasDate) return false;
        const cutoff = item.source === "event" ? todayStart : recentStart;
        if (date < cutoff) return false;
      }

      if (filters.dateFilter === "upcoming" && (!hasDate || date < todayStart))
        return false;

      if (filters.dateFilter === "past") {
        if (!hasDate) return false;
        const cutoff = item.source === "event" ? todayStart : recentStart;
        if (date >= cutoff) return false;
      }

      if (filters.dateFilter === "this_month") {
        if (!hasDate) return false;
        if (date.getFullYear() !== now.getFullYear() || date.getMonth() !== now.getMonth()) {
          return false;
        }
      }

      if (filters.dateFilter === "next_90") {
        if (!hasDate) return false;
        if (date < todayStart || date > ninetyDays) return false;
      }

      if (item.source === "event") {
        if (
          filters.levelFilter !== "all" &&
          (item.program_level ?? "") !== filters.levelFilter
        )
          return false;

        if (
          filters.departmentFilter !== "all" &&
          (item.department_name ?? "") !== filters.departmentFilter
        )
          return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (filters.sortBy === "title_asc")
        return a.title.localeCompare(b.title);
      if (filters.sortBy === "title_desc")
        return b.title.localeCompare(a.title);

      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return filters.sortBy === "date_asc" ? timeA - timeB : timeB - timeA;
    });
}

/* =========================================================
   UI COMPONENTS
========================================================= */

function UpdatesList({
  items,
  emptyMessage,
}: {
  items: UpdateItem[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-10 text-center">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card
          key={item.id}
          className="hover:shadow-md transition-all duration-200 border-muted"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-base font-semibold">
                {item.title}
              </CardTitle>
              <Badge variant="secondary">
                {formatDate(item.date)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {item.body || "No details provided."}
            </p>

            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium underline"
              >
                Open attachment
              </a>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function MemberUpdates() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");

  const [announcements, setAnnouncements] = useState<UpdateItem[]>([]);
  const [events, setEvents] = useState<UpdateItem[]>([]);
  const [newsletters, setNewsletters] = useState<UpdateItem[]>([]);

  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("current");
  const [levelFilter, setLevelFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("date_asc");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [a, e] = await Promise.all([
          fetchOptionalTable("announcements", "announcement"),
          fetchEvents(),
        ]);
        setAnnouncements(a);
        setEvents(e);
        setNewsletters([]); // Newsletters table was dropped, set empty array
      } catch (error: any) {
        toast({
          title: "Unable to load updates",
          description: error?.message || String(error),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const filteredEvents = useMemo(
    () =>
      applyItemFilters(events, {
        query,
        dateFilter,
        levelFilter,
        departmentFilter,
        sortBy,
      }),
    [events, query, dateFilter, levelFilter, departmentFilter, sortBy]
  );

  const filteredAnnouncements = useMemo(
    () =>
      applyItemFilters(announcements, {
        query,
        dateFilter,
        levelFilter,
        departmentFilter,
        sortBy,
      }),
    [announcements, query, dateFilter, levelFilter, departmentFilter, sortBy]
  );

  const filteredNewsletters = useMemo(
    () =>
      applyItemFilters(newsletters, {
        query,
        dateFilter,
        levelFilter,
        departmentFilter,
        sortBy,
      }),
    [newsletters, query, dateFilter, levelFilter, departmentFilter, sortBy]
  );

  return (
    <div className="space-y-6">

      <Card className="shadow-sm border-0 bg-card/70 backdrop-blur">
        <CardContent className="p-6 space-y-6">

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading updates...
            </div>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >

              <div className="rounded-xl border bg-muted/40 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <div className="space-y-1 lg:min-w-[320px] lg:flex-1">
                    <Label>Search</Label>
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search titles or details..."
                    />
                  </div>

                  <div className="space-y-1 lg:w-[180px]">
                    <Label>Date</Label>
                    <Select
                      value={dateFilter}
                      onValueChange={(v) =>
                        setDateFilter(v as DateFilter)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">Current</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="past">Past</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 lg:w-[220px]">
                    <Label>Sort</Label>
                    <Select
                      value={sortBy}
                      onValueChange={(v) =>
                        setSortBy(v as SortOption)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date_desc">
                          Newest first
                        </SelectItem>
                        <SelectItem value="date_asc">
                          Oldest first
                        </SelectItem>
                        <SelectItem value="title_asc">
                          Title A-Z
                        </SelectItem>
                        <SelectItem value="title_desc">
                          Title Z-A
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                </div>
              </div>

              <TabsList className="grid grid-cols-3 md:grid-cols-3 gap-2 bg-muted/50 p-1 rounded-lg">
                <TabsTrigger value="upcoming">Programs</TabsTrigger>
                <TabsTrigger value="announcements">Announcements</TabsTrigger>
                <TabsTrigger value="newsletters">Newsletters</TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming">
                <UpdatesList
                  items={filteredEvents}
                  emptyMessage="No programs available."
                />
              </TabsContent>

              <TabsContent value="announcements">
                <UpdatesList
                  items={filteredAnnouncements}
                  emptyMessage="No announcements available."
                />
              </TabsContent>

              <TabsContent value="newsletters">
                <UpdatesList
                  items={filteredNewsletters}
                  emptyMessage="No newsletters available."
                />
              </TabsContent>

            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}