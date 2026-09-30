# Builds Architecture/scenario.docx without external Python dependencies.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$outDir = Join-Path $root "Architecture"
$zipPath = Join-Path $outDir "scenario.docx"
$temp = Join-Path $env:TEMP ("scenario-docx-" + [guid]::NewGuid().ToString())

New-Item -ItemType Directory -Path $temp | Out-Null
New-Item -ItemType Directory -Path (Join-Path $temp "_rels") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $temp "word") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $temp "word\_rels") | Out-Null

@'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
'@ | Out-File -LiteralPath (Join-Path $temp "[Content_Types].xml") -Encoding utf8

@'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
'@ | Out-File -FilePath (Join-Path $temp "_rels\.rels") -Encoding utf8

@'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>
'@ | Out-File -FilePath (Join-Path $temp "word\_rels\document.xml.rels") -Encoding utf8

function Escape-Xml([string]$text) {
    return [System.Security.SecurityElement]::Escape($text)
}

function Add-Heading([System.Text.StringBuilder]$sb, [string]$text, [int]$level) {
    $size = switch ($level) { 0 { "32" } 1 { "28" } default { "24" } }
    $escaped = Escape-Xml $text
    [void]$sb.Append("<w:p><w:pPr><w:pStyle w:val=""Heading$level""/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val=""$size""/></w:rPr><w:t>$escaped</w:t></w:r></w:p>")
}

function Add-Para([System.Text.StringBuilder]$sb, [string]$text) {
    $escaped = Escape-Xml $text
    [void]$sb.Append("<w:p><w:r><w:t xml:space=""preserve"">$escaped</w:t></w:r></w:p>")
}

function Add-Bullet([System.Text.StringBuilder]$sb, [string]$text) {
    $escaped = Escape-Xml $text
    [void]$sb.Append("<w:p><w:pPr><w:numPr><w:ilvl w:val=""0""/><w:numId w:val=""1""/></w:numPr></w:pPr><w:r><w:t>$escaped</w:t></w:r></w:p>")
}

$body = New-Object System.Text.StringBuilder
Add-Heading $body "MiniRiskers - Complete System Usage Scenario" 0
Add-Para $body "This document describes how the MiniRiskers financial-crime risk assessment workbench is used end-to-end by each role."

Add-Heading $body "1. Purpose" 1
Add-Para $body "MiniRiskers helps a bank assess AML/financial-crime risk for new products or changes. It combines structured intake, quantitative scoring, regulatory evidence (RAG), AI-drafted assessment, analyst review, committee sign-off, and tamper-evident audit logging."

Add-Heading $body "2. Roles" 1
Add-Bullet $body "Business Owner - creates requests, completes intake, submits for review, submits condition evidence."
Add-Bullet $body "Risk Analyst - runs risk pipeline, reviews/overrides ratings, verifies condition evidence."
Add-Bullet $body "Risk Committee - final approve / approve-with-conditions / defer / reject decisions."
Add-Bullet $body "Auditor - read-only access to all data and audit exports."
Add-Bullet $body "Admin - superset access for support and testing."

Add-Heading $body "3. End-to-End Workflow" 1

Add-Heading $body "Step 1: Create change request (Business Owner)" 2
Add-Bullet $body "Log in, open Dashboard, then New Request."
Add-Bullet $body "Enter title, description, product type, business unit, customer segment."
Add-Bullet $body "System assigns request number (e.g. CR-2025-001)."
Add-Bullet $body "Notification: Request CR-XXXX created."
Add-Bullet $body "Complete intake: product, customer, geography, transactions, channels, vendors, controls."
Add-Bullet $body "Optional: upload BRD and run AI extraction."

Add-Heading $body "Step 2: Submit for analyst (Business Owner)" 2
Add-Bullet $body "Intake must be 100% complete."
Add-Bullet $body "Submit for Analyst Review - status becomes SUBMITTED."
Add-Bullet $body "Notification: Risk Analysts receive New request CR-XXXX submitted."
Add-Bullet $body "48-hour intake-to-decision SLA clock starts."

Add-Heading $body "Step 3: Risk assessment pipeline (Risk Analyst)" 2
Add-Bullet $body "Open request from Assessments queue."
Add-Bullet $body "Run: Generate Risk Factors, Calculate Risk, Regulatory Evidence, AI Assessment."
Add-Bullet $body "SLA: 12-hour target for risk assessment stage."
Add-Bullet $body "Notification at 9 hours: Risk assessment due within 3h."
Add-Bullet $body "Notification if overdue: Risk assessment overdue on CR-XXXX."

Add-Heading $body "Step 4: Analyst review (Risk Analyst)" 2
Add-Bullet $body "Accept or override AI/system rating with written justification."
Add-Bullet $body "Large downgrades escalate - committee must acknowledge."
Add-Bullet $body "Submit review - stage becomes COMMITTEE_REVIEW."
Add-Bullet $body "Notification: Committee receives Request CR-XXXX ready for committee."

Add-Heading $body "Step 5: Committee decision (Risk Committee)" 2
Add-Bullet $body "Approve, Approve with Conditions, Defer, or Reject with rationale."
Add-Bullet $body "Notification: Business Owner receives decision with request number."
Add-Bullet $body "Defer to Business Owner reopens intake (SLA pauses)."
Add-Bullet $body "Defer to Analyst returns request for reassessment."

Add-Heading $body "Step 6: Approval conditions (if applicable)" 2
Add-Bullet $body "Business Owner submits evidence per condition."
Add-Bullet $body "Analyst verifies or rejects (cannot verify own submission)."
Add-Bullet $body "Notifications at each step; overdue conditions trigger alerts."

Add-Heading $body "Step 7: Audit and compliance" 2
Add-Bullet $body "Export examiner pack (PDF/JSON/CSV) from assessment page."
Add-Bullet $body "Verify tamper-evident audit hash chain."
Add-Bullet $body "Analytics page shows portfolio SLA metrics."

Add-Heading $body "4. Notification Events" 1
Add-Bullet $body "Request created - Business Owner"
Add-Bullet $body "Request submitted - Risk Analyst"
Add-Bullet $body "Risk assessment SLA warning/overdue - Risk Analyst"
Add-Bullet $body "Analyst review submitted - Risk Committee"
Add-Bullet $body "Override escalated - Risk Committee"
Add-Bullet $body "Committee decision - Business Owner"
Add-Bullet $body "Condition opened/evidence/verified/overdue - BO or Analyst"
Add-Bullet $body "Methodology pending approval - Risk Committee"
Add-Bullet $body "Overall SLA at risk/breached - Analyst and Committee"

Add-Heading $body "5. SLA Targets" 1
Add-Bullet $body "Overall intake-to-decision: 48 hours"
Add-Bullet $body "Awaiting analyst: 8 hours | Risk assessment: 12 hours"
Add-Bullet $body "Analyst review: 12 hours | Committee review: 16 hours"
Add-Bullet $body "At-risk threshold: 75% of each target"

Add-Heading $body "6. Getting Started Locally" 1
Add-Bullet $body "Backend: uvicorn backend.main:app --reload (port 8000)"
Add-Bullet $body "Frontend: npm run dev in frontend/ (port 5173)"
Add-Bullet $body "Seed accounts: business_owner, risk_analyst, risk_committee, auditor, admin"
Add-Bullet $body "Use the bell icon in the top bar for real-time notifications"

$documentXml = @"
<?xml version=""1.0"" encoding=""UTF-8"" standalone=""yes""?>
<w:document xmlns:w=""http://schemas.openxmlformats.org/wordprocessingml/2006/main"">
  <w:body>
    $($body.ToString())
    <w:sectPr><w:pgSz w:w=""12240"" w:h=""15840""/><w:pgMar w:top=""1440"" w:right=""1440"" w:bottom=""1440"" w:left=""1440""/></w:sectPr>
  </w:body>
</w:document>
"@

$documentXml | Out-File -FilePath (Join-Path $temp "word\document.xml") -Encoding utf8

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($temp, $zipPath)
Remove-Item $temp -Recurse -Force
Write-Host "Created $zipPath"
