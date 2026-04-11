param(
  [Parameter(Mandatory = $true)]
  [string]$Root
)

$targets = @(
  @{
    PathHint = "\apps\worker"
    CommandHint = "npm.cmd run dev"
  },
  @{
    PathHint = "\apps\web"
    CommandHint = "npm.cmd run dev"
  },
  @{
    PathHint = "\tmp\pob-browser-calcs-spike\browser-worker"
    CommandHint = "npm.cmd run dev"
  },
  @{
    PathHint = $null
    CommandHint = "npm.cmd run dev:worker"
  },
  @{
    PathHint = $null
    CommandHint = "npm.cmd run dev:web"
  }
)

Get-CimInstance Win32_Process -Filter "Name = 'cmd.exe'" |
  Where-Object {
    $commandLine = $_.CommandLine
    if (-not $commandLine -or -not $commandLine.Contains($Root)) {
      return $false
    }

    foreach ($target in $targets) {
      $pathMatch = -not $target.PathHint -or $commandLine.Contains($target.PathHint)
      $commandMatch = -not $target.CommandHint -or $commandLine.Contains($target.CommandHint)
      if ($pathMatch -and $commandMatch) {
        return $true
      }
    }

    return $false
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

$webDevDistDir = Join-Path $Root "apps\web\.next-dev"
if (Test-Path $webDevDistDir) {
  Remove-Item -LiteralPath $webDevDistDir -Recurse -Force -ErrorAction SilentlyContinue
}
