# SingAlong

SingAlong menampilkan lirik lagu Spotify Desktop melalui overlay transparan di Windows. Baris aktif dan baris berikutnya mengikuti posisi lagu, sehingga kamu bisa bernyanyi sambil bermain game atau memakai aplikasi lain.

Versi saat ini **0.1.0**, tahap pengembangan awal. Sinkronisasi playback dan perpindahan fokus fullscreen masih dalam penyempurnaan.

## Menjalankan

Siapkan Windows 10 versi 1809 atau lebih baru, Spotify Desktop, Node.js 22.12 atau lebih baru, dan npm. Koneksi internet diperlukan untuk mengunduh dependensi dan mencari lirik di LRCLIB.

Jalankan dari folder proyek menggunakan PowerShell.

```powershell
npm.cmd install
npm.cmd start
```

Untuk instalasi ulang yang mengikuti versi dependensi dalam lockfile, gunakan `npm.cmd ci`.

Putar lagu di Spotify Desktop. SingAlong langsung membuka overlay dan mencari lirik bertimestamp berdasarkan judul serta artis. Jika lirik sinkron tidak ditemukan, overlay menampilkan “No Lyrics Available for this song”.

## Fitur

- Dua baris lirik dengan animasi fade dan geser singkat saat teks berubah.
- Slider posisi lagu dengan waktu berjalan dan durasi.
- Tombol lagu sebelumnya, play/pause, dan lagu berikutnya.
- Overlay yang bisa digeser, klik-tembus, serta efek redup saat hover.
- Pengaturan warna dan opacity background serta teks lirik secara terpisah.
- Mode Game otomatis saat jendela fullscreen mendapat fokus.
- Ikon system tray dan konfirmasi sebelum menutup aplikasi lewat tombol close.

## Menggunakan overlay

Klik **☰** untuk membuka pengaturan. Di bagian **Background**, atur warna dan opacity panel. Di bagian **Teks**, atur warna dan opacity lirik. Pengaturan diterapkan langsung dan kembali ke default saat aplikasi dijalankan ulang.

Tekan **Ctrl + Alt + L** untuk masuk atau keluar dari mode geser. Saat mode geser aktif, seret area lirik untuk memindahkan overlay. Jika posisinya sulit ditemukan, klik kanan ikon SingAlong di system tray lalu pilih **Pulihkan posisi overlay**.

| Kontrol | Fungsi |
| --- | --- |
| ☰ | Membuka pengaturan |
| ↻ | Memulai ulang pembacaan Spotify, waktu playback, dan pencarian lirik |
| ⏮ / ⏭ | Meminta Spotify berpindah ke lagu sebelumnya atau berikutnya |
| ▶ / ⏸ | Memutar kembali atau menjeda lagu |
| Slider waktu | Meminta Spotify berpindah posisi saat slider dilepas |
| Ctrl + Alt + L | Mengubah mode geser dan memunculkan kembali overlay |
| Ctrl + Alt + Q | Keluar langsung dari SingAlong |

Tombol dan slider mengikuti kemampuan kontrol yang dilaporkan Spotify. Saat Mode Game aktif, kontrol playback dan penggeseran overlay dikunci agar klik diteruskan ke game. Hover tetap dapat meredupkan overlay.

Mode Game berakhir saat fokus berpindah ke jendela biasa. Deteksi fullscreen juga dapat aktif pada aplikasi fullscreen lainnya.

## Menutup pengaturan dan aplikasi

Tombol **−** menutup jendela pengaturan. Overlay tetap aktif dan SingAlong tetap memiliki indikator di taskbar.

Tombol **×** di pengaturan atau **Close window** pada SingAlong di taskbar menampilkan “Close SingAlong?”. Pilih **Yes** untuk keluar sepenuhnya atau **No** untuk membatalkan.

Untuk langsung keluar, gunakan **Keluar dari SingAlong** di menu tray atau **Ctrl + Alt + Q**. Saat keluar, SingAlong menghentikan pembaca sesi media Windows.

## Cara kerja

SingAlong membaca sesi Spotify melalui Windows Media Control, mencari lirik bertimestamp di [LRCLIB](https://lrclib.net/docs), lalu memilih baris berdasarkan posisi playback. Jam lokal meneruskan waktu di antara pembaruan Windows dan dikoreksi saat posisi atau status berubah.

Perintah seek, play, pause, previous, dan next dikirim melalui kontrol media Windows. Aplikasi menggunakan Electron serta helper Windows PowerShell untuk membaca dan mengontrol sesi tersebut.

## Batasan saat ini

- Sumber playback saat ini khusus Spotify Desktop.
- Ketersediaan dan ketepatan timestamp bergantung pada data LRCLIB serta kecocokan versi lagu.
- Perubahan posisi dan status dapat terlambat mengikuti pembaruan sesi media Windows.
- Perilaku overlay saat Alt+Tab dan fullscreen masih perlu pengujian pada berbagai game. Level always-on-top dan pemulihan render sudah diterapkan.
- Kontrol playback langsung masih perlu pengujian lebih lanjut pada sesi Spotify nyata.
- Hotkey dapat gagal didaftarkan jika kombinasi yang sama digunakan aplikasi lain.
- Pengaturan dan posisi overlay belum disimpan antar sesi.
- Installer distribusi belum tersedia. Jalankan melalui npm.

## Pengembangan

```powershell
npm.cmd run check
```

Perintah ini memeriksa sintaks JavaScript. Verifikasi interaksi Spotify, fullscreen, dan tampilan dilakukan terpisah di Windows.

| File | Peran |
| --- | --- |
| `main.js` | Jendela Electron, state pengaturan, hotkey, tray, dan IPC |
| `preload.js` | Pembaruan tampilan dan interaksi overlay |
| `overlay.html`, `overlay.css` | Tampilan overlay |
| `controls.html`, `controls.css`, `controls-preload.js` | Pengaturan dengan toolbar custom |
| `playback.js` | Pembacaan snapshot media, permintaan lirik, dan kontrol playback |
| `playback-clock.js` | Perhitungan posisi playback lokal |
| `lyrics.js` | Pencarian LRCLIB dan parsing LRC |
| `spotify.ps1` | Akses sesi Spotify melalui Windows Media Control |
| `fullscreen.ps1` | Deteksi jendela fullscreen yang mendapat fokus |

Font lirik lokal dimuat dari `font/Spotify-Font.ttf`. Metadata file yang disediakan menyebut Gotham Bold.

## Changelog

### Unreleased

- Background blur melalui efek Acrylic pada Windows 11 build 22621 atau lebih baru.
- Tombol re-sync untuk membaca ulang Spotify, mereset jam playback, dan mencari ulang lirik.
- Tombol di samping re-sync untuk menyembunyikan atau menampilkan kontrol playback.
- Pemeriksaan konsistensi metadata dan timestamp saat lagu diganti cepat.
- Penundaan pencarian serta validasi respons lirik agar hasil lagu sebelumnya diabaikan.
- Pemilihan kandidat lirik dengan selisih durasi maksimal tiga detik.

### 0.1.0 — 18 November 2026

- Overlay lirik Spotify dengan baris aktif, baris berikutnya, font lokal, dan animasi pergantian teks.
- Slider timestamp serta kontrol previous, play/pause, dan next.
- Sinkronisasi pause, resume, seek, dan pergantian lagu melalui jam playback lokal.
- Mode Game otomatis, klik-tembus, efek hover, serta pemulihan overlay saat perpindahan fokus.
- Pengaturan warna dan opacity terpisah untuk background serta teks.
- Toolbar custom, system tray, hotkey, dan konfirmasi keluar.

Sinkronisasi langsung, kontrol playback, dan perilaku Alt+Tab fullscreen masih memerlukan pengujian lebih lanjut.

Riwayat lengkap tersedia di [CHANGELOG.md](CHANGELOG.md).
