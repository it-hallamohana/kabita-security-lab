# Checklist hardening

Status harus didukung bukti; jangan mencentang berdasarkan rencana saja. Bukti installer di `/var/log/kabita-lab/install.log`, snapshot hasil `sudo kabita-evidence`, dan tes aplikasi sebelum/sesudah ada di direktori evidence. Kontrol OS tidak dimatikan ketika mode aplikasi vulnerable dipilih.

| ID | Kategori | Kontrol | Status awal dokumentasi | Bukti/verifikasi |
|---|---|---|---|---|
| A1 | Access | SSH root login no | Selesai; diuji live | `sshd -T`: `permitrootlogin no`; percobaan root ditolak |
| A2 | Access | SSH key-only, password no | Selesai; diuji live | kunci pengelola berhasil; password-only dan SSH root ditolak |
| A3 | Access | Fail2ban SSH | Sebagian | jail `sshd` aktif dan membaca journald; pemicu ban belum diuji |
| A4 | Access | Akun legacy aplikasi dinonaktifkan | Selesai; uji live | V01 sebelum 200, sesudah 401 |
| B1 | Service | UFW whitelist port dan sumber | Selesai; uji dari laptop pengelola | web 8080 terbuka di subnet; 22 hanya sumber pengelola/NAT; Nmap dari perangkat red team belum dilakukan |
| B2 | Service | API 3000 dan DB 5432 loopback | Selesai; diuji live | `ss -lntp`; koneksi host ke 3000/5432 tertutup |
| B3 | Service | App user kabita tanpa shell, sandbox systemd | Selesai; diuji live | user service `kabita`, `NoNewPrivileges=yes`, `ProtectSystem=strict`, `MemoryMax=384M` |
| B4 | Service | Versi paket terpasang dan patch OS | Sebagian | paket layanan terbaru saat install; full OS upgrade belum dijalankan |
| C1 | Data | Secret di env root-only, tidak dalam repo/frontend | Selesai; diuji live | mode file 600; tidak dicetak di output |
| C2 | Data | DB least privilege dan query parameter | Selesai; konfigurasi diterapkan | role `kabita_app` bukan superuser; hanya SELECT/INSERT/UPDATE; query memakai `$1…$4` |
| C3 | App | Input validasi dan batas ukuran | Sebagian; validasi diuji live | berat 999 ditolak 400; tanggal/batas body diuji otomatis, belum dari device Red Team |
| C4 | App | Owner check untuk detail objek | Selesai; uji live | V02 200 menjadi 404; login ulang; daftar dan penulisan lintas owner ditolak |
| C5 | App | Token sensor | Selesai; uji live | V03 201 tanpa token menjadi 401; token valid 201 |
| C6 | App | Logging keamanan dan header | Selesai; uji live | JSON logs berisi peristiwa, IP dan mode; tanpa kredensial; CSP/X-Frame-Options |
| C7 | App | Rate-limit login/API | Sebagian | login ke-11/menit diuji otomatis dan ditolak 429; load test lintas perangkat belum dilakukan |
| C8 | Data | Backup dan restore | Belum | lakukan pg_dump dan restore ke DB uji, jangan klaim backup teruji sebelum dilakukan |
| C9 | App | TLS / cookie Secure | Belum | HTTP lab, COOKIE_SECURE=false; aktifkan setelah TLS tersedia |
| M1 | Monitoring | Security Onion dan alert rules | Belum | Monitoring Node terpisah belum disiapkan |

Aturan deteksi yang disarankan: login_success actor legacy; sheep_detail cross_owner=true; sensor_ingest authenticated=false; device_auth_denied berulang; debug_export; login_failed/rate_limit. Peristiwa API sudah terekam di journald; korelasi Nginx access log dengan alert masih perlu dikonfigurasi. App menerima X-Real-IP dari reverse proxy lokal.

Security Onion: gunakan log ingestion atau sensor dengan port mirroring. Contoh aturan HTTP IDS untuk V02/V03 perlu mengamati URI dan status respons; HTTPS membutuhkan visibilitas di titik terminasi atau korelasi log, bukan menganggap payload dapat dibaca sensor jaringan.
