# Attacks THE LINE's database directly (bypassing the page) to prove the rules hold.
# Reads raw HTTP status + body so PowerShell's JSON quirks can't hide anything.
$u = "https://xmktoolywrjqlzalopze.supabase.co"
$k = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhta3Rvb2x5d3JqcWx6YWxvcHplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNjI5MDIsImV4cCI6MjEwNjgzODkwMn0.8f6U_cfvztbHlEL-45GdsDzUXLH9wRZ6jzsDD-NLQMU"
$script:pass = 0; $script:fail = 0

function Call([string]$method, [string]$path, [string]$tok, [string]$body) {
  $req = [Net.HttpWebRequest]::Create("$u$path")
  $req.Method = $method
  $req.Headers.Add("apikey", $k)
  $req.Headers.Add("Authorization", "Bearer $tok")
  $req.Headers.Add("Prefer", "return=representation")
  if ($body) {
    $req.ContentType = "application/json"
    $bytes = [Text.Encoding]::UTF8.GetBytes($body)
    $s = $req.GetRequestStream(); $s.Write($bytes, 0, $bytes.Length); $s.Close()
  }
  try { $resp = $req.GetResponse() } catch [Net.WebException] { $resp = $_.Exception.Response }
  $rd = New-Object IO.StreamReader($resp.GetResponseStream())
  $out = [pscustomobject]@{ status = [int]$resp.StatusCode; body = $rd.ReadToEnd() }
  $rd.Close(); $resp.Close()
  $out
}
function Rows($r, [string]$field) { [regex]::Matches($r.body, '"' + $field + '"\s*:').Count }
function Report([string]$name, [bool]$ok, [string]$detail) {
  if ($ok) { $script:pass++; "ok    $name   [$detail]" } else { $script:fail++; "FAIL  $name   -> $detail" }
}
function Short($r) { "$($r.status) " + $r.body.Substring(0, [Math]::Min(90, $r.body.Length)) }
function Expect-Refused([string]$name, $r) { Report $name ($r.status -ge 400 -and $r.body -notmatch "No API key") (Short $r) }

$A = (Call POST "/auth/v1/signup" $k '{"data":{}}').body | ConvertFrom-Json
$B = (Call POST "/auth/v1/signup" $k '{"data":{}}').body | ConvertFrom-Json
$tA = $A.access_token; $tB = $B.access_token
"Users A=$($A.user.id.Substring(0,8)) B=$($B.user.id.Substring(0,8))`n"

"Evidence wall"
Expect-Refused "visitor without an account cannot post" (Call POST "/rest/v1/evidence" $k '{"url":"https://x.org","stance":"support"}')
Expect-Refused "cannot post as someone else"            (Call POST "/rest/v1/evidence" $tA ('{"url":"https://x.org","stance":"support","author":"' + $B.user.id + '"}'))
Expect-Refused "javascript: link refused"               (Call POST "/rest/v1/evidence" $tA '{"url":"javascript:alert(1)","stance":"support"}')
Expect-Refused "201-character note refused"             (Call POST "/rest/v1/evidence" $tA ('{"url":"https://x.org","stance":"support","note":"' + ('a'*201) + '"}'))
Expect-Refused "made-up stance refused"                 (Call POST "/rest/v1/evidence" $tA '{"url":"https://x.org","stance":"hate"}')
$r = Call POST "/rest/v1/evidence" $tA '{"url":"https://example.org/security-test","stance":"support","hidden":true,"created_at":"2001-01-01T00:00:00Z"}'
Report "valid post accepted" ($r.status -eq 201) (Short $r)
$row = ($r.body | ConvertFrom-Json)[0]
Report "server forces hidden=false and a real timestamp" ($row.hidden -eq $false -and $row.created_at -like "2026*") "hidden=$($row.hidden) created=$($row.created_at)"
Expect-Refused "second post within 30 s refused" (Call POST "/rest/v1/evidence" $tA '{"url":"https://example.org/fast","stance":"support"}')
$r = Call DELETE "/rest/v1/evidence?id=eq.$($row.id)" $tB $null
Report "another user cannot delete it" ((Rows $r "id") -eq 0) (Short $r)
$r = Call PATCH "/rest/v1/evidence?id=eq.$($row.id)" $tA '{"url":"https://evil.example"}'
Report "posts cannot be edited after posting" ((Rows $r "id") -eq 0) (Short $r)
$r = Call GET "/rest/v1/evidence?id=eq.$($row.id)&select=id,url" $k $null
Report "post is still intact and public" ((Rows $r "id") -eq 1 -and $r.body -match "security-test") (Short $r)
$r = Call DELETE "/rest/v1/evidence?id=eq.$($row.id)" $tA $null
Report "author can delete own post" ((Rows $r "id") -eq 1) (Short $r)

"`nVotes"
Expect-Refused "visitor without an account cannot vote" (Call POST "/rest/v1/votes" $k '{"pos":3}')
Expect-Refused "cannot vote as someone else"            (Call POST "/rest/v1/votes" $tA ('{"pos":3,"voter":"' + $B.user.id + '"}'))
Expect-Refused "vote outside 0-8 refused"               (Call POST "/rest/v1/votes" $tA '{"pos":99}')
$r = Call POST "/rest/v1/votes" $tA '{"pos":3}'
Report "A can vote" ($r.status -eq 201) (Short $r)
Expect-Refused "A cannot add a second vote" (Call POST "/rest/v1/votes" $tA '{"pos":5}')
$r = Call GET "/rest/v1/votes?select=voter,pos" $tB $null
Report "B cannot see A's vote" ((Rows $r "voter") -eq 0) (Short $r)
$r = Call GET "/rest/v1/votes?select=voter,pos" $k $null
Report "public cannot see individual votes" ((Rows $r "voter") -eq 0) (Short $r)
$r = Call PATCH "/rest/v1/votes?voter=eq.$($A.user.id)" $tB '{"pos":0}'
Report "B cannot change A's vote" ((Rows $r "voter") -eq 0) (Short $r)
$r = Call POST "/rest/v1/rpc/vote_counts" $k '{}'
Report "public can read the totals" ($r.status -eq 200) (Short $r)

"`n$($script:pass) passed, $($script:fail) failed"
