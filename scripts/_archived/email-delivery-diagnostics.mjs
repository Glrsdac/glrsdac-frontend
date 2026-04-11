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

let sendgridApiKey = "";
if (fs.existsSync("sendgrid.env")) {
  const buffer = fs.readFileSync("sendgrid.env");
  let sgRaw = buffer.toString("utf8");
  if (sgRaw.includes("\u0000") || (buffer.length > 1 && buffer[0] === 0xff && buffer[1] === 0xfe)) {
    sgRaw = buffer.toString("utf16le");
  }
  const line = sgRaw
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find((value) => value.includes("SENDGRID_API_KEY"));

  if (line) {
    const rhs = line.split("=").slice(1).join("=").trim();
    sendgridApiKey = rhs.replace(/^['\"]|['\"]$/g, "").trim();
  }
}

console.log("SendGrid key detected:", sendgridApiKey ? `yes (length ${sendgridApiKey.length})` : "no");

const recipients = [
  "stanleyyeboa754@gmail.com",
  "stanleyyeboah754@gmail.com",
];

async function probeSendEmail(recipient) {
  const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      to: recipient,
      subject: `GLRSDAC delivery probe ${new Date().toISOString()}`,
      text: `Delivery probe for ${recipient}`,
      html: `<p>Delivery probe for <strong>${recipient}</strong></p>`,
    }),
  });

  const bodyText = await response.text();
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = bodyText;
  }

  return { status: response.status, body };
}

async function checkSuppression(recipient) {
  if (!sendgridApiKey) {
    return { available: false, reason: "No SENDGRID_API_KEY in sendgrid.env" };
  }

  const paths = [
    `bounces/${encodeURIComponent(recipient)}`,
    `blocks/${encodeURIComponent(recipient)}`,
    `invalid_emails/${encodeURIComponent(recipient)}`,
    `spam_reports/${encodeURIComponent(recipient)}`,
  ];

  const results = {};
  for (const path of paths) {
    const endpoint = `https://api.sendgrid.com/v3/suppression/${path}`;
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${sendgridApiKey}`,
      },
    });

    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }

    results[path] = {
      status: response.status,
      payload,
    };
  }

  return { available: true, results };
}

for (const recipient of recipients) {
  console.log(`\n=== Recipient: ${recipient} ===`);
  const sendProbe = await probeSendEmail(recipient);
  console.log("send-email response:", JSON.stringify(sendProbe, null, 2));

  const suppression = await checkSuppression(recipient);
  if (!suppression.available) {
    console.log("suppression check:", suppression.reason);
  } else {
    console.log("suppression check:", JSON.stringify(suppression.results, null, 2));
  }
}
