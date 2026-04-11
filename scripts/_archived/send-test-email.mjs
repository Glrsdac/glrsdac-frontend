import fs from "fs";

const envRaw = fs.readFileSync(".env", "utf8");

function getEnvValue(key) {
  const pattern = new RegExp(`^${key}=(?:\"([^\"]*)\"|([^\r\n#]*))`, "m");
  const match = envRaw.match(pattern);
  if (!match) return "";
  return (match[1] ?? match[2] ?? "").trim();
}

const supabaseUrl = getEnvValue("VITE_SUPABASE_URL") || getEnvValue("SUPABASE_URL");
const serviceRoleKey = getEnvValue("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE URL or SERVICE ROLE KEY in .env");
  process.exit(1);
}

const to = "stanleyyeboa754@gmail.com";

const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${serviceRoleKey}`,
  },
  body: JSON.stringify({
    to,
    subject: "GLRSDAC terminal email test",
    text: "This is a terminal email test for signup flow verification.",
    html: "<p>This is a terminal email test for signup flow verification.</p>",
  }),
});

const text = await response.text();
console.log("HTTP", response.status);
console.log(text);
