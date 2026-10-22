# Purple Team Log

Pengujian otomatis lokal lulus: enam test untuk V01-V04 dalam dua mode, isolasi data normal, validasi, rate-limit, dan konfigurasi startup. Pengujian live dari laptop Blue Team (`IP-ADMIN`) ke target (`IP-TARGET:8080`) juga lulus. Empat skenario membuahkan status yang diharapkan sebelum dan setelah mitigasi, akses positif tetap bekerja, dan pengukuran uji bertahan setelah service restart PostgreSQL. Bukti HTTP, hasil, dan log ada di `docs/redteam/evidence/`; snapshot OS ada di `docs/blueteam/evidence/`.

| Skenario | 1. Serang baseline | 2. Deteksi | 3. Root cause | 4. Respons | 5. Retest |
|---|---|---|---|---|---|
| V01 default account | Unit/live: 200 | login_success legacy | akun demo lemah diaktifkan | hardened meniadakan akun + restart sesi | Unit/live: 401 |
| V02 IDOR | Unit/live: 200 cross-owner | sheep_detail cross_owner=true | owner predicate dilewati pada detail | aktifkan owner predicate | Unit/live: 404 setelah login ulang |
| V03 spoof sensor | Unit/live: 201 tanpa token | sensor_ingest authenticated=false | token perangkat tidak diwajibkan | wajibkan X-Device-Token | Unit/live: 401; token benar 201 |
| V04 debug export | Unit/live: 200 tanpa sesi | debug_export | ekspor inventori tidak memeriksa role | admin-only | Unit/live: 401 tanpa sesi |

Waktu UTC pengujian: `2026-10-22T19:17Z` (23 Oktober, WIB). Pengujian dilakukan dari host laptop Blue Team; serangan dari perangkat anggota Red Team dan alert Security Onion belum dijalankan. Log dan evidence membuktikan loop simulasi aplikasi, bukan sensor SOC yang sudah lengkap.
