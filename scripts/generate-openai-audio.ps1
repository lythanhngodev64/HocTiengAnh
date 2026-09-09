param(
    [switch]$Force,
    [switch]$CedarSample,
    [switch]$ClearSample
)

Write-Host ''
Write-Host 'Copy only the OpenAI API key (starts with sk-) to the clipboard.'
[void](Read-Host 'Press Enter when the key is ready in the clipboard')

try {
    $taskApiKey = Get-Clipboard -Raw -ErrorAction Stop
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
    Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue
}
