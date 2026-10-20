# Run locally once after migration and function deployment. Never put this key in frontend files.
$ErrorActionPreference='Stop'
$projectUrl='https://wxgtrydzkrlimmlnvhdk.supabase.co'
$email=Read-Host 'Administrator email'
$displayName=Read-Host 'Administrator display name'
$passwordSecure=Read-Host 'Strong initial password (12+ characters, upper/lower/number/symbol)' -AsSecureString
$serviceSecure=Read-Host 'Legacy service_role key (Settings > API Keys > Legacy; local use only)' -AsSecureString
$passwordPlain=[System.Net.NetworkCredential]::new('', $passwordSecure).Password
$servicePlain=[System.Net.NetworkCredential]::new('', $serviceSecure).Password
try {
 if($displayName.Trim().Length -lt 1 -or $displayName.Trim().Length -gt 80){throw 'Display name must contain 1–80 characters'}
 if($passwordPlain.Length -lt 12 -or $passwordPlain.Length -gt 128 -or $passwordPlain -cnotmatch '[A-Z]' -or $passwordPlain -cnotmatch '[a-z]' -or $passwordPlain -notmatch '[0-9]' -or $passwordPlain -notmatch '[^A-Za-z0-9\s]'){throw 'Password does not meet requirements'}
 $headers=@{apikey=$servicePlain;Authorization="Bearer $servicePlain"}
 $body=@{email=$email.Trim();password=$passwordPlain;email_confirm=$true}|ConvertTo-Json
 $created=Invoke-RestMethod -Uri "$projectUrl/auth/v1/admin/users" -Method Post -Headers $headers -ContentType 'application/json' -Body $body
 try {
  $profile=@{id=$created.id;display_name=$displayName.Trim();role='admin';active=$true;must_change_password=$true}|ConvertTo-Json
  Invoke-RestMethod -Uri "$projectUrl/rest/v1/chat_profiles" -Method Post -Headers $headers -ContentType 'application/json' -Body $profile | Out-Null
 }catch {
  Invoke-RestMethod -Uri "$projectUrl/auth/v1/admin/users/$($created.id)" -Method Delete -Headers $headers | Out-Null
  throw 'Administrator profile failed; newly created Auth account removed. Check migration and retry.'
 }
 Write-Host 'Administrator created. No email sent. Log in to Student Chat and change the initial password.'
} finally {
 $passwordPlain=$null; $servicePlain=$null; $body=$null; $headers=$null; $profile=$null
 $passwordSecure.Dispose();$serviceSecure.Dispose()
}
