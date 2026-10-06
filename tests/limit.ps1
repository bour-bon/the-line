# Proves the 10-links-per-person cap: posts 10 links 31 s apart, then expects the 11th to be refused.
$u = "https://xmktoolywrjqlzalopze.supabase.co"
$k = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhta3Rvb2x5d3JqcWx6YWxvcHplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNjI5MDIsImV4cCI6MjEwNjgzODkwMn0.8f6U_cfvztbHlEL-45GdsDzUXLH9wRZ6jzsDD-NLQMU"
function Call([string]$method, [string]$path, [string]$tok, [string]$body) {
  $req = [Net.HttpWebRequest]::Create("$u$path"); $req.Method = $method
  $req.Headers.Add("apikey", $k); $req.Headers.Add("Authorization", "Bearer $tok"); $req.Headers.Add("Prefer", "return=representation")
  if ($body) { $req.ContentType = "application/json"; $b = [Text.Encoding]::UTF8.GetBytes($body); $s = $req.GetRequestStream(); $s.Write($b, 0, $b.Length); $s.Close() }
  try { $resp = $req.GetResponse() } catch [Net.WebException] { $resp = $_.Exception.Response }
  $rd = New-Object IO.StreamReader($resp.GetResponseStream()); $o = [pscustomobject]@{ status = [int]$resp.StatusCode; body = $rd.ReadToEnd() }; $rd.Close(); $resp.Close(); $o
}
$tester = (Call POST "/auth/v1/signup" $k '{"data":{}}').body | ConvertFrom-Json
$ids = @()
for ($i = 1; $i -le 10; $i++) {
  $r = Call POST "/rest/v1/evidence" $tester.access_token ('{"url":"https://example.org/limit-test-' + $i + '","stance":"support"}')
  "post $i -> $($r.status)"
  if ($r.status -eq 201) { $ids += ($r.body | ConvertFrom-Json)[0].id }
  Start-Sleep -Seconds 31
}
$r = Call POST "/rest/v1/evidence" $tester.access_token '{"url":"https://example.org/limit-test-11","stance":"support"}'
"post 11 -> $($r.status) $($r.body)"
if ($ids.Count -eq 10 -and $r.body -match "limit_reached") { "RESULT: ok - 10 accepted, 11th refused" } else { "RESULT: FAIL - accepted $($ids.Count), 11th: $($r.status)" }
foreach ($id in $ids) { $null = Call DELETE "/rest/v1/evidence?id=eq.$id" $tester.access_token $null }
"cleaned up $($ids.Count) test posts"
