$files = Get-ChildItem -Path "d:\DELED2026\API\DELED" -Filter *.cs -Recurse
foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    if ($content -match "DateTime\.Now") {
        $content = $content -replace "DateTime\.Now", "DELED.Helpers.TimeHelper.GetIST()"
        Set-Content -Path $file.FullName -Value $content
    }
}
