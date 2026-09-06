Add-Type -AssemblyName System.Drawing
$iconDir = Join-Path $PSScriptRoot '../resources'
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null
$bitmap = [System.Drawing.Bitmap]::new(256,256)
$g = [System.Drawing.Graphics]::FromImage($bitmap)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(8,20,35))
$outer = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(89,144,184),3)
$bright = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(174,229,255),7)
$g.DrawEllipse($outer,25,25,206,206)
$g.DrawArc($bright,42,42,172,172,35,265)
$moon = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(171,225,250))
$cut = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(8,20,35))
$g.FillEllipse($moon,75,75,110,110)
$g.FillEllipse($cut,108,59,99,106)
$g.FillEllipse($moon,177,62,11,11)
$g.FillEllipse($moon,198,193,8,8)
$pngPath = Join-Path $iconDir 'icon.png'
$bitmap.Save($pngPath,[System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bitmap.Dispose()
$bytes = [System.IO.File]::ReadAllBytes($pngPath)
$stream = [System.IO.File]::Create((Join-Path $iconDir 'icon.ico'))
$writer = [System.IO.BinaryWriter]::new($stream)
$writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]1)
$writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0)
$writer.Write([uint16]1); $writer.Write([uint16]32)
$writer.Write([uint32]$bytes.Length); $writer.Write([uint32]22); $writer.Write($bytes)
$writer.Dispose()
Write-Output 'App PNG and ICO generated.'
