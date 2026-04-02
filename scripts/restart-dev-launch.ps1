param(
  [Parameter(Mandatory = $true)]
  [string]$Root,

  [Parameter(Mandatory = $true)]
  [string]$WindowTitle,

  [Parameter(Mandatory = $true)]
  [string]$PidFile,

  [Parameter(Mandatory = $true)]
  [string]$RunCommand
)

$command = "title $WindowTitle && cd /d `"$Root`" && $RunCommand"
$process = Start-Process -FilePath "cmd.exe" -ArgumentList @("/k", $command) -WorkingDirectory $Root -PassThru
Set-Content -Path $PidFile -Value $process.Id -NoNewline
