param(
    [switch]$Force,
    [switch]$CedarSample,
    [switch]$ClearSample,
    [switch]$Phonics,
    [string]$Theme
)

$taskOriginalKey = $env:OPENAI_API_KEY
try {
    $taskApiKey = $env:OPENAI_API_KEY
    if ([string]::IsNullOrWhiteSpace($taskApiKey)) {
        $taskApiKey = [Environment]::GetEnvironmentVariable('OPENAI_API_KEY', 'User')
    }
    if ([string]::IsNullOrWhiteSpace($taskApiKey)) {
        Write-Host 'Copy only the OpenAI API key (starts with sk-) to the clipboard.'
        [void](Read-Host 'Press Enter when the key is ready in the clipboard')
        $taskApiKey = Get-Clipboard -Raw -ErrorAction Stop
    }
    if ([string]::IsNullOrWhiteSpace($taskApiKey)) {
        throw 'The clipboard is empty. Copy the OpenAI API key, then run this command again.'
    }

    $env:OPENAI_API_KEY = $taskApiKey
    $taskArguments = @('scripts/generate-openai-audio.mjs')
    if ($Force) {
        $taskArguments += '--force'
    }
    if ($CedarSample) {
        $taskArguments += '--cedar-sample'
    }
    if ($ClearSample) {
        $taskArguments += '--clear-sample'
    }
    if ($Phonics) { $taskArguments += '--phonics' }
    if ($Theme) { $taskArguments += "--theme=$Theme" }

    & node @taskArguments
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}
finally {
    $env:OPENAI_API_KEY = $taskOriginalKey
}
