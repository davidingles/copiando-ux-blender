$intag = 'C:\Program Files\InTag\intag.exe'
& $intag --path 'D:\MisDevs\copiando-ux-blender' 2>&1 | Out-String
Write-Host "ExitCode: $LASTEXITCODE david ingles"