import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://upqwgwemuaqhnxskxbfr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcXdnd2VtdWFxaG54c2t4YmZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2Nzg4MTksImV4cCI6MjA4NzI1NDgxOX0.zTphCl9xqoEe2N55uYyeVczn09nO5BsdEcmLPZLYbUs";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyData() {
  console.log("📊 VERIFYING CALENDAR & ANNOUNCEMENTS DATA\n");
  console.log("=".repeat(50));

  try {
    // Check events
    console.log("\n1️⃣  EVENTS TABLE:");
    const { data: events, error: eventsError, count: eventsCount } = await supabase
      .from("events")
      .select("*", { count: "exact" });

    if (eventsError) {
      console.log("   ❌ Error:", eventsError.message);
    } else {
      console.log(`   ✅ Found ${eventsCount || events?.length || 0} events`);
      if (events && events.length > 0) {
        console.log("   Sample:", events[0]);
      }
    }

    // Check announcements
    console.log("\n2️⃣  ANNOUNCEMENTS TABLE:");
    const { data: announcements, error: announcementsError, count: announcementsCount } = await supabase
      .from("announcements")
      .select("*", { count: "exact" });

    if (announcementsError) {
      console.log("   ❌ Error:", announcementsError.message);
    } else {
      console.log(`   ✅ Found ${announcementsCount || announcements?.length || 0} announcements`);
      if (announcements && announcements.length > 0) {
        console.log("   Sample:", announcements[0]);
      }
    }

    // Check departments
    console.log("\n3️⃣  DEPARTMENTS TABLE:");
    const { data: departments, error: departmentsError, count: departmentsCount } = await supabase
      .from("departments")
      .select("*", { count: "exact" });

    if (departmentsError) {
      console.log("   ❌ Error:", departmentsError.message);
    } else {
      console.log(`   ✅ Found ${departmentsCount || departments?.length || 0} departments`);
      if (departments && departments.length > 0) {
        console.log("   Sample:", departments[0]);
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("\n📝 PAGE POPULATION STATUS:");

    const hasEvents = (eventsCount || events?.length || 0) > 0;
    const hasAnnouncements = (announcementsCount || announcements?.length || 0) > 0;

    if (hasEvents) {
      console.log("✅ Calendar page: WILL DISPLAY DATA");
    } else {
      console.log("⚠️  Calendar page: WILL BE EMPTY (no events)");
    }

    if (hasAnnouncements) {
      console.log("✅ Announcements page: WILL DISPLAY DATA");
    } else {
      console.log("⚠️  Announcements page: WILL BE EMPTY (no announcements)");
    }

    console.log("\n=".repeat(50));
  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
  }
}

verifyData();
