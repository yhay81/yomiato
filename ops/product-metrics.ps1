[CmdletBinding()]
param(
    [switch]$Local
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$SqlPath = Join-Path $PSScriptRoot "product-metrics.sql"
$Wrangler = Join-Path $RepoRoot "node_modules\.bin\wrangler.cmd"
$Target = if ($Local) { "--local" } else { "--remote" }
$Sql = (Get-Content $SqlPath) -join " "

$Output = & $Wrangler d1 execute yomiato $Target --json --command $Sql
if ($LASTEXITCODE -ne 0) {
    throw "D1 metrics query failed with exit code $LASTEXITCODE"
}

$Payload = ($Output -join [Environment]::NewLine) | ConvertFrom-Json
$Row = $Payload[0].results[0]
if (-not $Row) {
    throw "D1 metrics query returned no result"
}

function Get-Percent {
    param([int]$Numerator, [int]$Denominator)
    if ($Denominator -eq 0) { return $null }
    return [Math]::Round(($Numerator / $Denominator) * 100, 1)
}

$Users = [int]$Row.users
$Creators = [int]$Row.creators
$Sharers = [int]$Row.sharers
$Readers = [int]$Row.readers
$Reactors = [int]$Row.reactors
$Feedbackers = [int]$Row.feedbackers

[ordered]@{
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    service = "yomiato"
    environment = if ($Local) { "local" } else { "production" }
    funnel = [ordered]@{
        users = $Users
        creators = $Creators
        drafts_created = [int]$Row.drafts_created
        active_drafts = [int]$Row.active_drafts
        sharers = $Sharers
        readers = $Readers
        reactors = $Reactors
        reactions = [int]$Row.reactions
        feedbackers = $Feedbackers
        feedback_notes = [int]$Row.feedback_notes
        drafts_with_feedback = [int]$Row.drafts_with_feedback
        owners_checked = [int]$Row.owners_checked
        closed_drafts = [int]$Row.closed_drafts
        returned_users = [int]$Row.returned_users
        users_7d = [int]$Row.users_7d
        creators_7d = [int]$Row.creators_7d
        feedbackers_7d = [int]$Row.feedbackers_7d
    }
    rates = [ordered]@{
        exposure_to_creator_percent = Get-Percent $Creators $Users
        creator_to_share_percent = Get-Percent $Sharers $Creators
        reader_to_reaction_percent = Get-Percent $Reactors $Readers
        reader_to_feedback_percent = Get-Percent $Feedbackers $Readers
        draft_to_feedback_percent = Get-Percent ([int]$Row.drafts_with_feedback) ([int]$Row.drafts_created)
        return_percent = Get-Percent ([int]$Row.returned_users) $Users
    }
    safety = [ordered]@{
        reports = [int]$Row.reports
        hidden_drafts = [int]$Row.hidden_drafts
    }
} | ConvertTo-Json -Depth 4
