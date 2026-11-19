# SingAlong — Panduan Beta Testing

Terima kasih sudah mencoba SingAlong! Panduan ini membantu mengecek apakah overlay nyaman dan stabil saat mendengarkan Spotify, bermain game, dan berpindah aplikasi.

Isi hasil berdasarkan versi yang kamu terima. Tidak perlu memahami kode atau menjalankan seluruh tes. Tes inti memerlukan sekitar 20–30 menit; tes monitor tambahan bersifat opsional.

## Sebelum mulai

- Gunakan Spotify Desktop di Windows dan koneksi internet.
- Catat versi SingAlong yang diuji, misalnya versi installer atau commit jika memakai `npm start`.
- Siapkan lagu yang kamu kenal dan memiliki lirik, serta game yang biasa kamu mainkan.
- Untuk tes kontrol Spotify, mulai dari aplikasi desktop biasa, di luar Game Mode.

**Catatan:** tidak semua lagu memiliki lirik tersinkronisasi. Pesan “No Lyrics Available for this song” tidak otomatis berarti aplikasi rusak. Catat judul dan artis bila ingin melaporkan lirik yang tidak tersedia atau salah.

## Informasi perangkat

Salin dan isi:

```text
Versi SingAlong / commit:
Cara menjalankan: installer / npm start
Windows dan versinya:
Versi Spotify Desktop:
Jumlah monitor:
Resolusi dan scaling tiap monitor (contoh: 1920×1080, 125%):
Game dan mode layar: windowed / borderless / fullscreen
Tanggal tes:
```

## Cara mencatat hasil

Untuk setiap ID tes, pilih **Lulus**, **Gagal**, atau **Tidak diuji**. Jika gagal, sertakan ID tes dan langkah yang menyebabkan masalah. Tes yang tidak cocok dengan perangkatmu boleh dilewati.

```text
ID tes | Hasil | Catatan
L01    | Lulus | ...
L02    | Gagal | ...
M01    | Tidak diuji | Hanya punya satu monitor
```

## 1. Membuka aplikasi dan lirik

| ID | Yang dilakukan | Hasil yang diharapkan |
| --- | --- | --- |
| L01 | Buka SingAlong saat Spotify belum memutar lagu. Lalu putar lagu. | Overlay langsung terbuka; saat lagu diputar, judul/artis dan lirik yang tersedia muncul tanpa restart SingAlong. |
| L02 | Dengarkan lagu yang kamu kenal selama 1–2 menit. | Lirik utama mengikuti nyanyian dan baris berikutnya sesuai urutan. Catat perkiraan keterlambatan/kecepatan dalam detik jika terasa meleset. |
| L03 | Biarkan lagu berganti secara otomatis. | Judul, artis, durasi, dan lirik beralih ke lagu baru; lirik lama tidak menetap setelah pergantian selesai. |
| L04 | Coba beberapa lagu, termasuk lagu yang tidak tersedia liriknya. | Lagu tanpa lirik menampilkan pesan ketersediaan; lirik lagu sebelumnya tidak tertinggal. Lagu berikutnya yang memiliki lirik tetap bisa ditampilkan. |
| L05 | Ganti lagu dengan cepat 5–10 kali di Spotify, lalu berhenti pada satu lagu dan tunggu sekitar 10 detik. | Judul/artis, lirik, dan timestamp akhirnya mengacu pada lagu yang sama dengan Spotify. Catat berapa lama sampai sesuai atau apakah tetap salah. |

## 2. Sinkronisasi dan kontrol

| ID | Yang dilakukan | Hasil yang diharapkan |
| --- | --- | --- |
| S01 | Pause dari Spotify selama 10 detik, lalu resume. Ulangi 3 kali. | Timestamp dan lirik berhenti saat pause, lalu melanjutkan dari posisi yang sesuai. |
| S02 | Seek maju dan mundur lewat Spotify, termasuk mendekati awal dan akhir lagu. | Timestamp dan lirik mengikuti posisi baru, tanpa terus memakai posisi sebelumnya. |
| S03 | Gunakan previous, play/pause, dan next dari overlay. | Spotify merespons jika kontrol tersedia; overlay mengikuti hasilnya. Kontrol yang tidak tersedia tidak memberi kesan berhasil. |
| S04 | Geser slider waktu pada overlay ke beberapa posisi. | Setelah dilepas, posisi Spotify dan overlay sesuai. Jika permintaan gagal, ada pesan dan posisi tidak terus menampilkan hasil yang keliru. |
| S05 | Tekan re-sync saat lagu berjalan, lalu coba saat pause. | Aplikasi membaca ulang lagu dan posisi terkini. Re-sync tidak memaksa lagu yang sedang pause menjadi play. |
| S06 | Tutup Spotify, tunggu, lalu buka kembali dan putar lagu. | SingAlong bisa kembali membaca lagu tanpa harus ditutup dan dibuka ulang. |

## 3. Overlay, game, dan hotkey

| ID | Yang dilakukan | Hasil yang diharapkan |
| --- | --- | --- |
| G01 | Pindah antara Spotify, browser, dan aplikasi biasa dengan Alt+Tab sebanyak 5 kali. | Overlay tetap terlihat dan tidak membesar atau berpindah sendiri. |
| G02 | Masuk ke game fullscreen atau borderless. | Jika fullscreen terdeteksi, notifikasi Game Mode muncul. Overlay tetap terlihat; klik diteruskan ke game. Catat mode layar yang digunakan jika perilakunya berbeda. |
| G03 | Dari game, Alt+Tab langsung ke SingAlong, kembali ke game, lalu ke aplikasi biasa. Ulangi 5 kali. | Overlay tidak hilang permanen, berkedip terus, atau mengambil fokus berulang kali. |
| G04 | Aktifkan reduce opacity on hover, arahkan kursor ke panel, lalu menjauh. Ulangi di desktop dan game yang menampilkan kursor. | Panel meredup saat kursor berada di atasnya dan kembali normal setelah kursor menjauh. |
| G05 | Aktifkan click-through, lalu klik area lirik di atas aplikasi biasa. Matikan dan coba lagi. | Saat aktif, klik area lirik diteruskan ke aplikasi di belakang. Saat nonaktif, panel menerima klik tanpa bisa didrag atau membesar sendiri. Tombol toolbar tetap bisa dipakai di luar Game Mode. |
| G06 | Tekan Ctrl+Alt+H, tunggu 10 detik, pindah aplikasi, lalu tekan lagi. | Overlay tetap tersembunyi sampai ditampilkan kembali. Saat muncul, lirik mengikuti posisi lagu terkini. |
| G07 | Coba Hide/Show dari menu ikon tray. | Overlay bisa disembunyikan dan dikembalikan, termasuk jika hotkey berbenturan dengan aplikasi lain. |
| G08 | Sembunyikan/tampilkan controller lewat tombol di samping re-sync. | Tombol playback dan slider hilang/muncul; tinggi panel menyesuaikan dan posisi anchor tetap benar. |

## 4. Pengaturan tampilan dan ukuran

| ID | Yang dilakukan | Hasil yang diharapkan |
| --- | --- | --- |
| P01 | Buka settings lewat hamburger overlay. | Settings terlihat di depan overlay dan semua pengaturan dapat dijangkau dengan scroll. |
| P02 | Ubah warna dan opacity background, lalu warna dan opacity teks. | Background dan teks dapat diatur secara terpisah. Mengubah opacity background tidak ikut meredupkan teks. |
| P03 | Coba anchor kiri/tengah/kanan dan atas/tengah/bawah, termasuk padding 0. | Posisi mengikuti tepi layar monitor terpilih. Padding 0 menempelkan panel ke tepi layar; padding sumbu tengah nonaktif. Jika keduanya tengah, kontrol padding disembunyikan. |
| P04 | Ubah font ke 18, 26, dan 48 px memakai slider dan input angka. | Ukuran lirik berubah; baris berikutnya lebih kecil. Panel menyesuaikan tinggi, teks tidak bertumpuk dengan controller, dan anchor tetap benar. |
| P05 | Ubah lebar panel kecil/besar sebanyak 10 kali, termasuk saat font 48 px. | Lebar mengikuti nilai yang dipilih tanpa terus membesar sendiri. Lirik maksimal dua baris per bagian dan panel tetap pada anchor yang dipilih. |
| P06 | Coba nilai kosong, di bawah minimum, dan di atas maksimum pada input ukuran. Lalu masukkan nilai valid. | Aplikasi tidak crash atau menghasilkan panel yang tidak bisa dijangkau; nilai valid tetap bisa diterapkan. |
| P07 | Tekan Reset sizes. | Font kembali ke 26 px dan lebar ke 680 px, dibatasi lebar monitor jika layarnya lebih kecil. |
| P08 | Ganti bahasa Inggris/Indonesia; periksa settings, tooltip overlay, tray, dan konfirmasi keluar. Restart aplikasi. | Label mengikuti bahasa pilihan dan bahasa tetap tersimpan setelah restart. Lirik tidak diterjemahkan. |

**Perilaku versi saat ini:** pilihan bahasa disimpan. Pengaturan tampilan, ukuran, monitor, dan posisi masih kembali ke default setelah restart; catat sebagai masukan jika kamu ingin pengaturan ini ikut disimpan.

## 5. Multi-monitor — opsional

| ID | Yang dilakukan | Hasil yang diharapkan |
| --- | --- | --- |
| M01 | Pilih setiap monitor melalui dropdown. | Overlay berpindah ke monitor terpilih; nama/resolusi pilihan dapat dibedakan. |
| M02 | Pada monitor kedua, pilih anchor kanan/bawah dengan padding 0, lalu ubah ukuran. | Anchor mengacu pada monitor kedua, bukan monitor utama. Panel tetap di tepi yang dipilih saat ukuran berubah. |
| M03 | Jika tersedia, gunakan monitor dengan scaling berbeda, misalnya 100% dan 150%. Pindahkan overlay beberapa kali. | Ukuran sesuai pengaturan tanpa pertumbuhan berulang, posisi meleset jauh, atau teks terpotong. Catat scaling kedua monitor jika gagal. |
| M04 | Lepas/nonaktifkan monitor yang sedang dipilih, lalu sambungkan kembali. | Overlay kembali ke monitor utama dan tetap bisa digunakan. Monitor yang tersambung kembali tersedia di dropdown untuk dipilih lagi. |

## 6. Menutup dan instalasi

| ID | Yang dilakukan | Hasil yang diharapkan |
| --- | --- | --- |
| E01 | Tekan − pada settings, lalu buka lagi lewat hamburger atau tray. | Hanya settings yang ditutup. Overlay dan sinkronisasi tetap berjalan, dan settings bisa dibuka lagi. |
| E02 | Tekan power di overlay, pilih No; ulangi dan pilih Yes. | No membatalkan. Yes menutup seluruh SingAlong, menghilangkan ikon tray, dan menghentikan proses SingAlong beserta helper medianya. Spotify tetap berjalan. |
| E03 | Jalankan lagi; gunakan Close window dari taskbar. | Dialog konfirmasi custom muncul; No membatalkan dan Yes keluar sepenuhnya. |
| E04 | Jalankan lagi; coba Exit dari tray atau Ctrl+Alt+Q. | Seluruh SingAlong berhenti. Kedua cara ini memang keluar langsung tanpa dialog. |
| I01 | Jika memakai installer, jalankan wizard dan instal ke folder pilihan. | Wizard tampil terbaca, navigasi berfungsi, instalasi selesai, dan SingAlong dapat dibuka dari shortcut. |
| I02 | Jika punya versi lama, catat versinya lalu coba instal versi uji di atasnya. | Upgrade selesai dan aplikasi dapat dijalankan. Catat jika shortcut ganda, versi salah, atau instalasi gagal. |
| I03 | Setelah selesai tes installer, uninstall SingAlong. | Uninstall selesai; aplikasi dan shortcut yang dibuat installer dihapus. Catat bila ada proses yang tetap berjalan atau pesan gagal. |

Tes instalasi cukup dilakukan pada perangkat yang memang bersedia kamu gunakan untuk mencoba versi beta. Tester yang memakai `npm start` boleh melewati I01–I03.

## 7. Pemakaian sehari-hari

Gunakan SingAlong selama 30–60 menit sambil melakukan aktivitas biasa. Catat jika ada crash, overlay hilang, sinkronisasi makin meleset, gangguan fokus game, atau CPU/memori yang terus meningkat. Jika melaporkan penggunaan resource, sertakan angka awal dan akhir dari Task Manager beserta durasi pemakaian.

Jawab juga:

1. Apakah lirik mudah dibaca saat bermain?
2. Apakah tombol dan pengaturannya mudah dipahami?
3. Masalah apa yang paling mengganggu?
4. Apakah ada pengaturan yang sulit ditemukan atau tidak bekerja seperti yang kamu bayangkan?

## Format laporan bug

Satu laporan untuk satu masalah. Screenshot atau rekaman singkat sangat membantu; sembunyikan informasi pribadi sebelum membagikannya.

```text
Judul: [SingAlong versi ...] Overlay hilang setelah Alt+Tab dari game
ID tes: G03
Versi SingAlong / commit:
Cara menjalankan: installer / npm start
Windows:
Monitor, resolusi, scaling:
Game dan mode layar (jika terkait):
Judul lagu + artis / tautan Spotify (jika terkait):

Langkah mengulang:
1.
2.
3.

Hasil yang diharapkan:
Yang sebenarnya terjadi:
Frekuensi: selalu / kadang (... dari ... percobaan) / sekali
Apakah re-sync atau hide/show membantu?:
Screenshot / video / pesan error:
Dampak: crash / fitur tidak bisa dipakai / gangguan kecil / tampilan
```

## Ringkasan hasil untuk pengembang

```text
Versi yang diuji:
Lulus: ... tes
Gagal: ... tes
Tidak diuji: ... tes
ID tes yang gagal:
Masalah paling mengganggu:
Nyaman dipakai sehari-hari: ya / belum, karena ...
```

Hasil checklist ini menjadi bahan evaluasi sebelum rilis stabil. Tes yang belum dilakukan atau gagal tetap perlu ditinjau; jumlah tes lulus saja tidak menjamin aplikasi siap rilis 1.0.0.
