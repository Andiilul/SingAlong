# Changelog

Perubahan SingAlong dicatat di file ini. Versi **0.x** menandai tahap pengembangan awal, dengan perilaku dan fitur yang masih dapat berubah.

## [Unreleased]

## [0.3.0] - 2026-11-18

### Ditambahkan

- Pengaturan Position dengan anchor horizontal Left/Middle/Right dan vertikal Top/Middle/Bottom.
- Slider dan input angka padding per sumbu yang tersinkron dan langsung diterapkan.

### Diubah

- Padding nonaktif pada sumbu dengan anchor Middle. Kedua kontrol padding tersembunyi saat kedua sumbu Middle.
- Shortcut Ctrl + Alt + L dan mode drag dihapus.

### Dihapus

- Opsi background blur beserta integrasi Acrylic dan pembatasan region jendela.

### Diperbaiki

- Anchor mengacu ke batas layar penuh dan panel yang terlihat, sehingga padding nol menempel ke tepi layar. Padding angka diterapkan langsung saat diketik.
- Pemindahan overlay di Windows memakai SetWindowPos dengan SWP_NOSIZE untuk menghindari pertambahan ukuran saat drag berulang.
- Ukuran overlay dikunci dan penyesuaian ukuran otomatis dihapus agar proses drag tidak memperbesar jendela.
- Ikon sync, hide controller, dan menu menggunakan SVG dari React Icons dengan ukuran dan posisi tengah yang seragam.
- Jendela pengaturan diprioritaskan di atas overlay saat dibuka.

## [0.2.2] - 2026-11-18

### Diperbaiki

- Ikon SingAlong ditanamkan ke executable, installer, uninstaller, dan shortcut Windows melalui resource ikon multiukuran.

## [0.2.1] - 2026-11-18

### Diperbaiki

- Background jendela overlay dibuat transparan secara eksplisit dan tinggi jendela mengikuti isi agar tidak meninggalkan area kosong di bawah panel.
- Efek Acrylic hanya diubah saat opsi blur berubah, dengan pemulihan background transparan saat dimatikan.

## [0.2.0] - 2026-11-18

Localization English dan Indonesia.

### Ditambahkan

- Pilihan bahasa English dan Indonesia untuk overlay, pengaturan, tray, dan dialog keluar. Pilihan bahasa disimpan antar sesi.
- Paket bahasa runtime Electron untuk build berikutnya dibatasi ke English dan Indonesia.
- Build installer Windows melalui `npm run build:installer`, versi dari `build/config.json`, output per versi, dan pencegahan build duplikat.
- Opsi Background blur melalui efek Acrylic pada Windows 11 build 22621 atau lebih baru.
- Tombol di samping re-sync untuk menyembunyikan dan menampilkan kembali kontrol playback.
- Tombol sinkronisasi ulang di kiri atas overlay untuk memulai ulang pembaca Spotify, jam playback, dan pencarian lirik.

### Diperbaiki

- Pemeriksaan ulang metadata dan timeline Windows untuk membuang snapshot yang melintasi pergantian lagu.
- Penundaan pencarian lirik saat skip cepat serta validasi generasi permintaan sebelum hasil ditampilkan.
- Pergantian durasi lagu ikut mereset lirik dan kandidat dengan perbedaan durasi lebih dari tiga detik diabaikan.

## [0.1.0] - 2026-11-18

Rilis pengembangan awal yang merangkum implementasi pertama SingAlong.

### Ditambahkan

- Overlay Electron transparan dengan lirik aktif dan baris berikutnya.
- Deteksi lagu Spotify Desktop melalui sesi media Windows.
- Pencarian lirik bertimestamp melalui LRCLIB.
- Jam playback lokal untuk pause, resume, seek maju dan mundur, serta pergantian lagu.
- Slider timestamp dan tombol previous, play/pause, serta next.
- Mode geser dengan hotkey Ctrl + Alt + L dan pembatasan posisi ke area layar.
- Efek redup saat hover menggunakan posisi kursor Windows.
- Mode Game otomatis dengan notifikasi singkat ketika jendela fullscreen mendapat fokus.
- Pengaturan terpisah untuk warna dan opacity background serta teks.
- Toolbar pengaturan custom dengan tombol sembunyikan dan close.
- Ikon system tray, pemulihan posisi overlay, dan menu keluar.
- Konfirmasi keluar melalui tombol close pengaturan dan taskbar.
- Font lirik lokal serta animasi pergantian baris selama 200 ms.
- README dan pemeriksaan sintaks melalui npm.

### Disempurnakan

- Pemulihan always-on-top dan render overlay setelah perpindahan fokus fullscreen.
- Jendela pengaturan benar-benar ditutup melalui tombol sembunyikan, sementara indikator aplikasi tetap tersedia di taskbar.
- Pembatalan permintaan lirik lama saat lagu berganti dan penghentian helper saat aplikasi keluar.
- Pesan “No Lyrics Available for this song” ketika lirik sinkron tidak tersedia.

### Masih perlu pengujian

- Sinkronisasi langsung saat pause, resume, dan seek pada berbagai lagu.
- Kontrol playback Spotify melalui overlay.
- Visibilitas overlay selama Alt+Tab pada berbagai game fullscreen.
