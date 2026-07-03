Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('c:\Users\Haru\Desktop\1\heart-island-beta-0.9.1.zip')
foreach ($entry in $zip.Entries) { Write-Host $entry.FullName }
$zip.Dispose()
