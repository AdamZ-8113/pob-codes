param(
  [Parameter(Mandatory = $true)]
  [string]$FlaskDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$pngFormat = [System.Drawing.Imaging.ImageFormat]::Png
$layerWidth = 78
$layerHeight = 156
$compositeWidth = $layerWidth * 3

$normalized = 0
$skipped = 0

Get-ChildItem -Path $FlaskDir -Filter *.png | ForEach-Object {
  $sourcePath = $_.FullName
  $sourceBitmap = [System.Drawing.Bitmap]::FromFile($sourcePath)

  try {
    if ($sourceBitmap.Width -ne $compositeWidth -or $sourceBitmap.Height -ne $layerHeight) {
      $skipped += 1
      return
    }

    $outputBitmap = New-Object System.Drawing.Bitmap -ArgumentList $layerWidth, $layerHeight
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($outputBitmap)
      try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        foreach ($sourceX in @(-156, -78, 0)) {
          $graphics.DrawImage($sourceBitmap, $sourceX, 0, $compositeWidth, $layerHeight)
        }
      } finally {
        $graphics.Dispose()
      }

      $tempPath = "$sourcePath.normalized.png"
      $outputBitmap.Save($tempPath, $pngFormat)
    } finally {
      $outputBitmap.Dispose()
    }
  } finally {
    $sourceBitmap.Dispose()
  }

  Move-Item -Path "$sourcePath.normalized.png" -Destination $sourcePath -Force
  $normalized += 1
}

Write-Output "Normalized layered flask art: $normalized; skipped: $skipped"
