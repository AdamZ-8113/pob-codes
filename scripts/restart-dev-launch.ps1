param(
  [Parameter(Mandatory = $true)]
  [string]$Root,

  [Parameter(Mandatory = $true)]
  [string]$WindowTitle,

  [Parameter(Mandatory = $true)]
  [string]$PidFile,

  [Parameter(Mandatory = $true)]
  [string]$RunCommand,

  [string]$StartDirectory
)

if (-not $StartDirectory) {
  $StartDirectory = $Root
}

$command = "title $WindowTitle && $RunCommand"
$process = Start-Process -FilePath "cmd.exe" -ArgumentList @("/k", $command) -WorkingDirectory $StartDirectory -PassThru
Set-Content -Path $PidFile -Value $process.Id -NoNewline
