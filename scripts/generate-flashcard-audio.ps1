$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$flashcardRoot = Split-Path -Parent $PSScriptRoot
$flashcardManifest = Get-Content -LiteralPath (Join-Path $flashcardRoot 'content/flashcards/manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$flashcardAudio = Join-Path $flashcardRoot 'public/audio/flashcards'
$flashcardWaves = Join-Path $flashcardRoot '.data/flashcard-content/wav'
New-Item -ItemType Directory -Path $flashcardAudio, $flashcardWaves -Force | Out-Null
$flashcardVoice = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $flashcardVoice.SelectVoice('Microsoft Zira Desktop')
    $flashcardVoice.Rate = -2
    foreach ($flashcardEntry in $flashcardManifest) {
        $flashcardWave = Join-Path $flashcardWaves ($flashcardEntry.slug + '.wav')
        $flashcardMp3 = Join-Path $flashcardAudio ($flashcardEntry.slug + '.mp3')
        $flashcardVoice.SetOutputToWaveFile($flashcardWave)
        $flashcardVoice.Speak($flashcardEntry.english)
        $flashcardVoice.SetOutputToNull()
        & ffmpeg -hide_banner -loglevel error -y -i $flashcardWave -af 'apad=pad_dur=0.15' -ar 24000 -ac 1 -b:a 64k $flashcardMp3
        if ($LASTEXITCODE -ne 0) { throw 'Flashcard audio conversion failed.' }
    }
} finally { $flashcardVoice.Dispose() }
Write-Output ('Generated ' + $flashcardManifest.Count + ' English pronunciation files.')
