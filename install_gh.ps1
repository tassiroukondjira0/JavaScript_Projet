$url = "https://github.com/cli/cli/releases/download/v2.96.0/gh_2.96.0_windows_amd64.msi"
$out = Join-Path -Path $env:USERPROFILE -ChildPath "gh.msi"
Write-Host "Downloading GitHub CLI..."
$wc = New-Object System.Net.WebClient
$wc.DownloadFile($url, $out)
Write-Host "Download complete. Installing..."
Start-Process msiexec.exe -ArgumentList "/i $out /quiet /norestart" -Wait
Write-Host "Installation complete"
# Clean up
Remove-Item $out -ErrorAction SilentlyContinue
Write-Host "Done"

