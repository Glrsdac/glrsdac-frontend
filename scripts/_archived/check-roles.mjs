import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://upqwgwemuaqhnxskxbfr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcXdnd2VtdWFxaG54c2t4YmZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2Nzg4MTksImV4cCI6MjA4NzI1NDgxOX0.zTphCl9xqoEe2N55uYyeVczn09nO5BsdEcmLPZLYbUs";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRoles() {
  console.log("🔍 CHECKING YOUR ROLES\n");
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.log("❌ No authenticated user found");
      return;
    }

    const userId = session.user.id;
    console.log("User ID:", userId);
    console.log("Email:", session.user.email);
    console.log("");

    // Get all users to find Stanley
    const { data: users } = await supabase.from("members").select("id, user_id, first_name, last_name");
    
    if (!users || users.length === 0) {
      console.log("No members found");
      return;
    }

    console.log("All members:");
    users.slice(0, 10).forEach(m => {
      console.log(`  - ${m.first_name} ${m.last_name} (user_id: ${m.user_id})`);
    });

    // Find Stanley
    const stanley = users.find(m => m.first_name === "Stanley");
    
    if (stanley) {
      console.log("\n✅ Found Stanley:", stanley);
      
      if (stanley.user_id) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role_id, roles(name)")
          .eq("user_id", stanley.user_id);
        
        console.log("\nStanley's roles:", roles);
      }
    }

  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkRoles();
