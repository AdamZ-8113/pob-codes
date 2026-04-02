param(
  [Parameter(Mandatory = $true)]
  [string]$Root
)

Get-CimInstance Win32_Process -Filter "Name = 'cmd.exe'" |
  Where-Object {
    $_.CommandLine -and
    $_.CommandLine.Contains($Root) -and
    (
      $_.CommandLine.Contains("npm.cmd run dev:web") -or
      $_.CommandLine.Contains("npm.cmd run dev:worker")
    )
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }
