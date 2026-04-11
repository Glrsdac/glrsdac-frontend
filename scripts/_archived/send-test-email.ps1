$envRaw = Get-Content .env -Raw

function Get-EnvValue([string]$key) {
  $pattern = '(?m)^' + [regex]::Escape($key) + '=(?:"([^"]*)"|([^\r\n#]*))'
  $m = [regex]::Match($envRaw, $pattern)
  if ($m.Success) {
    if ($m.Groups[1].Value) { return $m.Groups[1].Value.Trim() }
    return $m.Groups[2].Value.Trim()
  }
  return ''
}

$supabaseUrl = Get-EnvValue 'VITE_SUPABASE_URL'
if (-not $supabaseUrl) { $supabaseUrl = Get-EnvValue 'SUPABASE_URL' }
$serviceRoleKey = Get-EnvValue 'SUPABASE_SERVICE_ROLE_KEY'

if (-not $supabaseUrl -or -not $serviceRoleKey) {
  Write-Error 'Missing SUPABASE URL or SERVICE ROLE KEY in .env'
  exit 1
}

$headers = @{
  Authorization = "Bearer $serviceRoleKey"
  'Content-Type' = 'application/json'
}

$payload = @{
  to = 'stanleyyeboa754@gmail.com'
  subject = 'GLRSDAC terminal email test'
  text = 'This is a terminal email test for signup flow verification.'
  html = '<p>This is a terminal email test for signup flow verification.</p>'
} | ConvertTo-Json -Depth 4

try {
  $response = Invoke-WebRequest -Method Post -Uri "$supabaseUrl/functions/v1/send-email" -Headers $headers -Body $payload
  Write-Output ("HTTP " + [int]$response.StatusCode)
  Write-Output $response.Content
} catch {
  if ($_.Exception.Response) {
    $resp = $_.Exception.Response
    Write-Output ("HTTP " + [int]$resp.StatusCode)
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $body = $reader.ReadToEnd()
    Write-Output $body
  } else {
    Write-Error $_
  }
  exit 1
}
