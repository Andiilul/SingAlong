param(
    [uint32]$SingAlongProcessId,
    [long]$SeekPosition = -1,
    [string]$ExpectedTitle,
    [string]$ExpectedArtist,
    [ValidateSet('', 'play', 'pause', 'next', 'previous')]
    [string]$MediaAction = ''
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
. (Join-Path $PSScriptRoot 'fullscreen.ps1')
Add-Type -AssemblyName System.Runtime.WindowsRuntime

$managerType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime]
$mediaType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType=WindowsRuntime]
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
        $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1
$managerTask = $asTask.MakeGenericMethod($managerType)
$mediaTask = $asTask.MakeGenericMethod($mediaType)
$manager = $null
try {
    $manager = $managerTask.Invoke($null, @($managerType::RequestAsync())).GetAwaiter().GetResult()
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
}

if ($SeekPosition -ge 0 -or $MediaAction) {
    if (!$manager) { throw 'Sesi media Windows tidak tersedia' }
    $session = $manager.GetSessions() | Where-Object { $_.SourceAppUserModelId -match 'Spotify' } | Select-Object -First 1
    if (!$session) { throw 'Spotify Desktop tidak tersedia' }
    $media = $mediaTask.Invoke($null, @($session.TryGetMediaPropertiesAsync())).GetAwaiter().GetResult()
    if ($media.Title -cne $ExpectedTitle -or $media.Artist -cne $ExpectedArtist) { throw 'Lagu sudah berganti. Coba lagi.' }
    if ($MediaAction) {
        switch ($MediaAction) {
            'play' { $operation = $session.TryPlayAsync() }
            'pause' { $operation = $session.TryPauseAsync() }
            'next' { $operation = $session.TrySkipNextAsync() }
            'previous' { $operation = $session.TrySkipPreviousAsync() }
        }
    } else {
        $timeline = $session.GetTimelineProperties()
        if (!$session.GetPlaybackInfo().Controls.IsPlaybackPositionEnabled) { throw 'Spotify tidak mengizinkan seek pada lagu ini' }
        if ($SeekPosition -gt $timeline.EndTime.TotalMilliseconds) { throw 'Posisi di luar durasi lagu' }
        $operation = $session.TryChangePlaybackPositionAsync([long]($SeekPosition * 10000))
    }
    $success = $asTask.MakeGenericMethod([bool]).Invoke($null, @($operation)).GetAwaiter().GetResult()
    if (!$success) { throw 'Spotify menolak perubahan posisi' }
    'ok'
    exit
}

while ($true) {
    $track = $null
    try {
        $session = $null
        if ($manager) {
            $session = $manager.GetSessions() | Where-Object { $_.SourceAppUserModelId -match 'Spotify' } | Select-Object -First 1
        }
        if ($session) {
            $media = $mediaTask.Invoke($null, @($session.TryGetMediaPropertiesAsync())).GetAwaiter().GetResult()
            $timeline = $session.GetTimelineProperties()
            $playback = $session.GetPlaybackInfo()
            # Metadata and timeline are separate reads. Discard samples crossing a track change.
            $confirmedMedia = $mediaTask.Invoke($null, @($session.TryGetMediaPropertiesAsync())).GetAwaiter().GetResult()
            $confirmedTimeline = $session.GetTimelineProperties()
            $consistent = $media.Title -ceq $confirmedMedia.Title -and
                $media.Artist -ceq $confirmedMedia.Artist -and
                $media.AlbumTitle -ceq $confirmedMedia.AlbumTitle -and
                $timeline.EndTime -eq $confirmedTimeline.EndTime -and
                $timeline.LastUpdatedTime -eq $confirmedTimeline.LastUpdatedTime
            $playbackStatus = $playback.PlaybackStatus.ToString()
            if ($consistent -and $media.Title -and $playbackStatus -in @('Playing', 'Paused')) {
                $track = @{
                    title = $media.Title
                    artist = $media.Artist
                    album = $media.AlbumTitle
                    playing = $playbackStatus -eq 'Playing'
                    canSeek = $playback.Controls.IsPlaybackPositionEnabled
                    canPlay = $playback.Controls.IsPlayEnabled
                    canPause = $playback.Controls.IsPauseEnabled
                    canNext = $playback.Controls.IsNextEnabled
                    canPrevious = $playback.Controls.IsPreviousEnabled
                    position = $timeline.Position.TotalMilliseconds
                    duration = $timeline.EndTime.TotalMilliseconds
                    updatedAt = $timeline.LastUpdatedTime.ToUnixTimeMilliseconds()
                }
            }
        }
    } catch {
        [Console]::Error.WriteLine($_.Exception.Message)
    }
    ConvertTo-Json -Compress -InputObject @{
        track = $track
        mediaAvailable = $null -ne $manager
        fullscreen = [ForegroundWindow]::IsFullscreen($SingAlongProcessId)
    }
    Start-Sleep -Milliseconds 500
}
