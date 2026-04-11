import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const get = (key) => {
  const match = env.match(new RegExp(`${key}="([^"]*)"`));
  return match ? match[1] : "";
};

const supabaseUrl = get("VITE_SUPABASE_URL") || get("SUPABASE_URL");
const serviceRoleKey = get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE URL or SERVICE ROLE KEY in .env");
  process.exit(1);
}

const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${serviceRoleKey}`,
  },
  body: JSON.stringify({
    to: "test@example.com",
    subject: "GLRSDAC Delivery Probe",
    text: "Probe",
  }),
});

const text = await response.text();
console.log("HTTP", response.status);
console.log(text);
