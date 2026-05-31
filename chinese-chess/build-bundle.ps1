# Build script: bundle all ES modules into a single non-module JS file
$src = "D:\ClaudeWorkspace\chinese-chess\www\js"
$out = "$src\bundle.js"

function Get-FileContent($path) {
    $content = Get-Content $path -Raw
    $content = $content -replace "'use strict';?\r?\n?", ""
    $content = $content -replace "^\xEF\xBB\xBF", ""
    return $content
}

function Remove-ExportKeyword($content) {
    $content = $content -replace '(?m)^\s*export\s+function\s+', 'function '
    $content = $content -replace '(?m)^\s*export\s+async\s+function\s+', 'async function '
    $content = $content -replace '(?m)^\s*export\s+const\s+', 'const '
    $content = $content -replace '(?m)^\s*export\s+let\s+', 'let '
    $content = $content -replace '(?m)^\s*export\s+var\s+', 'var '
    $content = $content -replace '(?m)^export\s+\{[^}]+\};?\r?\n?', ''
    return $content
}

function Remove-ImportLines($content) {
    $content = $content -replace '(?m)^import\s+\{[^}]+\}\s+from\s+''[^'']+'';\r?\n?', ''
    $content = $content -replace '(?m)^import\s+\*\s+as\s+\w+\s+from\s+''[^'']+'';\r?\n?', ''
    return $content
}

# ============ 1. board.js ============
Write-Host "Processing board.js..."
$board = Get-FileContent "$src\board.js"
$board = Remove-ExportKeyword $board

# ============ 2. checkmate.js ============
Write-Host "Processing checkmate.js..."
$checkmate = Get-FileContent "$src\checkmate.js"
$checkmate = Remove-ImportLines $checkmate
$checkmate = Remove-ExportKeyword $checkmate
# Remove duplicate isRed function
$checkmate = $checkmate -replace '(?ms)^function isRed\(color\)\s*\{.*?^\}', '// isRed from board.js'

# ============ 3. opening-book.js ============
Write-Host "Processing opening-book.js..."
$opening = Get-FileContent "$src\opening-book.js"
$opening = Remove-ImportLines $opening
$opening = Remove-ExportKeyword $opening

# ============ 4. sound.js ============
Write-Host "Processing sound.js..."
$sound = Get-FileContent "$src\sound.js"
$sound = Remove-ExportKeyword $sound

# ============ 5. ai.js ============
Write-Host "Processing ai.js..."
$ai = Get-FileContent "$src\ai.js"
$ai = Remove-ImportLines $ai
$ai = Remove-ExportKeyword $ai
# Rename analyzePosition to wukongAnalyzePosition (avoid conflict with analysis-engine.js)
$ai = $ai -replace '(?m)^function analyzePosition\b', 'function wukongAnalyzePosition'

# ============ 6. online.js ============
Write-Host "Processing online.js..."
$online = Get-FileContent "$src\online.js"
$online = Remove-ExportKeyword $online

# ============ 7. analysis-engine.js ============
Write-Host "Processing analysis-engine.js..."
$analysis = Get-FileContent "$src\analysis-engine.js"
$analysis = Remove-ImportLines $analysis
$analysis = Remove-ExportKeyword $analysis
# Fix import.meta.url
$analysis = $analysis -replace "new URL\('\./engine/stockfish\.js', import\.meta\.url\)\.href", "'js/engine/stockfish.js'"
# Fix dynamic import line
$analysis = $analysis -replace "var ai = await import\('\./ai\.js'\);?", ""
# Fix remaining ai.analyzePosition reference
$analysis = $analysis -replace "wukongAnalyze = ai\.analyzePosition;", "wukongAnalyze = wukongAnalyzePosition;"
# Rename engine -> fsfEngine carefully (only standalone variable, not in strings or URLs)
# Replace var/let engine = with fsfEngine
$analysis = $analysis -replace '(?<!\w)(var|let|const)\s+engine(\s*[=;])', '$1 fsfEngine$2'
# Replace engine.xxx (method calls)
$analysis = $analysis -replace '(?<![$\w])engine\.', 'fsfEngine.'
# Replace engine = (assignment)
$analysis = $analysis -replace '(?<![$\w])engine(\s*=\s*)', 'fsfEngine$1'
# Replace engine; and engine) and engine,
$analysis = $analysis -replace '(?<![$\w])engine([;)\),])', 'fsfEngine$1'
# Replace engine !== null etc
$analysis = $analysis -replace '(?<![$\w])engine(\s*[!<>=]+\s*)', 'fsfEngine$1'
# Rename functions
$analysis = $analysis -replace '(?m)^function stopEngine\b', 'function fsfStopEngine'
$analysis = $analysis -replace '(?m)^function destroyEngine\b', 'function fsfDestroyEngine'

# ============ 8. game.js ============
Write-Host "Processing game.js..."
$game = Get-FileContent "$src\game.js"
$game = Remove-ImportLines $game
$game = Remove-ExportKeyword $game

# ============ 9. Inline UI code ============
Write-Host "Processing inline UI code..."
$html = Get-Content "D:\ClaudeWorkspace\chinese-chess\www\index.html" -Raw
$match = [regex]::Match($html, '<script type="module">(.*?)</script>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
$inline = ""
if ($match.Success) {
    $inline = $match.Groups[1].Value
    $inline = $inline -replace '(?m)^import\s+\{[^}]+\}\s+from\s+''[^'']+'';\r?\n?', ''
}

# ============ Assemble ============
Write-Host "Assembling bundle.js..."
$parts = @()
$parts += "// bundle.js - Chinese Chess non-module bundle"
$parts += "'use strict';"
$parts += ""
$parts += "// ============ board.js ============"
$parts += $board
$parts += ""
$parts += "// ============ checkmate.js ============"
$parts += $checkmate
$parts += ""
$parts += "// ============ opening-book.js ============"
$parts += $opening
$parts += ""
$parts += "// ============ sound.js ============"
$parts += $sound
$parts += ""
$parts += "// ============ ai.js ============"
$parts += $ai
$parts += ""
$parts += "// ============ online.js ============"
$parts += $online
$parts += ""
$parts += "// ============ analysis-engine.js ============"
$parts += $analysis
$parts += ""
$parts += "// ============ game.js ============"
$parts += $game
$parts += ""
$parts += "// ============ UI Event Bindings ============"
$parts += $inline

$bundle = $parts -join "`r`n"

Write-Host "Writing bundle.js ($($bundle.Length) bytes)..."
Set-Content -Path $out -Value $bundle -Encoding UTF8 -NoNewline
$fSize = (Get-Item $out).Length
# Count remaining imports/exports
$imports = [regex]::Matches($bundle, '(?m)^import\s').Count
$exports = [regex]::Matches($bundle, '(?m)^export\s').Count
Write-Host "Done! Bundle: $([math]::Round($fSize/1KB, 1))KB"
Write-Host "Remaining import statements: $imports"
Write-Host "Remaining export statements: $exports"
