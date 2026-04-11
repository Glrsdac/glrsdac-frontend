import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getAdminUUID() {
  const adminEmail = "admin@glrsdac.com";
  
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  const adminUser = users.users.find(u => u.email === adminEmail);
  if (adminUser) {
    console.log(`Admin UUID: ${adminUser.id}`);
  } else {
    console.log('Admin not found');
  }
}

getAdminUUID();
