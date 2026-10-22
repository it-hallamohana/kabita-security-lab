# Attack Plan - KABITA Security Lab

Dokumen ini mengikuti format skenario praktikum: kategori, target, tools, fase teknis, hasil, deteksi, dan mitigasi. Scope hanya satu Target Node lab yang diumumkan operator. Semua data/accounts adalah sintetis. IP pada contoh perintah ditulis `IP-TARGET`; ganti hanya dengan alamat Target Node saat sesi.

## Skenario 0: Reconnaissance terbatas

- **Kategori:** Discovery / Service Enumeration
- **Target:** IP Target Node saja; port yang direncanakan (22, 8080).
- **Tools:** Nmap.
- **Fase teknis:** Blue Team mengumumkan IP; Red Team memindai dua port yang disepakati dengan TCP connect scan dan version detection. Tidak memindai subnet atau host lain.
- **Contoh:** `nmap -Pn -sT -sV -p 22,8080 IP-TARGET -oN recon.txt`
- **Hasil yang dicatat:** port web 8080 terlihat; port SSH hanya tampak dari sumber admin yang diizinkan. Service/API 3000 dan DB 5432 tidak diekspos.
- **Deteksi:** Security Onion bila traffic sensor menerima scan; firewall/Nginx/journal sebagai bukti host.
- **Mitigasi:** allowlist UFW berdasarkan subnet lab dan alamat admin; pastikan service internal hanya loopback.
- **Batas:** ini pemeriksaan permukaan layanan, bukan eksploitasi. Jangan menjalankan scan terhadap seluruh subnet.

## Skenario 1: Akun aplikasi legacy demo

- **Kategori:** Authentication / Weak or Default Credentials (synthetic)
- **Target:** `POST /api/login` pada aplikasi lab.
- **Tools:** Browser atau `curl`; akun demo hanya saat mode vulnerable.
- **Fase teknis:** operator mengaktifkan mode vulnerable; Red Team mencoba satu kali akun legacy lab yang tercantum di README-LAB. Tidak ada wordlist atau percobaan berulang. Blue Team mengamati login sukses dan actor demo.
- **Hasil sebelum mitigasi:** HTTP 200 dan sesi akun sintetis.
- **Deteksi:** event `login_success` actor legacy; korelasikan alamat sumber dan timestamp.
- **Mitigasi/retest:** operator `sudo kabita-mode hardened`; ulangi satu login yang sama; ekspektasi HTTP 401 dan event penolakan. Login ulang karena perubahan mode membatalkan sesi.
- **Batas:** password ini bukan kredensial OS, database, Supabase, atau produksi.

## Skenario 2: IDOR / BOLA detail domba lintas peternak

- **Kategori:** Web/API Authorization; cross-user access
- **Target:** `GET /api/sheep/:id`.
- **Tools:** Browser developer tools, Burp Repeater, atau `curl` dengan cookie akun lab.
- **Fase teknis:** login sebagai peternak A, lalu satu kali meminta ID domba sintetis milik peternak B sesuai contoh di attack plan. Bandingkan respons di mode vulnerable/hardened menggunakan sesi yang valid pada masing-masing mode. Jangan menebak/menyapu daftar ID.
- **Hasil sebelum mitigasi:** mode vulnerable mengembalikan data dummy peternak B (HTTP 200).
- **Deteksi:** app log `sheep_detail`, `cross_owner=true`; catat endpoint, actor, source IP, status.
- **Mitigasi/retest:** mode hardened harus menyamarkan objek/menolak akses (HTTP 404) dan log `object_access_denied`. Pastikan listing tetap terbatas ke owner.

## Skenario 3: Ingest sensor tanpa autentikasi

- **Kategori:** Web/API/IoT; missing endpoint authorization
- **Target:** `POST /api/ingest`.
- **Tools:** `curl`, Postman, atau Burp Repeater.
- **Fase teknis:** kirim satu payload simulator dengan device ID sintetis dan angka yang valid tanpa token; jangan mengirim volume besar. Ulangi di mode hardened, lalu lakukan positive control satu kali memakai token dummy lab yang diberikan operator.
- **Hasil sebelum mitigasi:** mode vulnerable menerima satu record sintetis (HTTP 201).
- **Deteksi:** log `sensor_ingest` dengan status autentikasi, source IP, dan waktu.
- **Mitigasi/retest:** mode hardened menolak tanpa token (HTTP 401); positive control dengan token lab diterima. Batas validasi/rate tetap aktif.
- **Batas:** protokol demo adalah HTTP REST, bukan MQTT atau sensor fisik.

## Skenario 4: Debug export tanpa autentikasi

- **Kategori:** Sensitive Information Exposure / Unprotected endpoint
- **Target:** `GET /api/debug/export`.
- **Tools:** Browser atau `curl`.
- **Fase teknis:** satu request tanpa sesi di masing-masing mode. Data keluaran hanya inventori sintetis; jangan menguji path traversal atau mencoba membaca filesystem.
- **Hasil sebelum mitigasi:** mode vulnerable mengembalikan dataset dummy (HTTP 200).
- **Deteksi:** event `debug_export` atau `request_denied`, source IP dan timestamp.
- **Mitigasi/retest:** mode hardened menolak tanpa sesi (HTTP 401); operator Blue Team dengan role yang disetujui dapat mengakses fitur bila memang diperlukan.

## Skenario respons bersama

1. Blue Team mencatat event sebelum meminta operator menghentikan celah demo.
2. Operator mengubah mode dengan `sudo kabita-mode hardened` dan memastikan service aktif.
3. Red Team mengirim ulang request identik satu kali.
4. Blue Team membandingkan status HTTP, log aplikasi/Nginx, source, dan alert SOC.
5. Catat bukti menggunakan `docs/EVIDENCE-TEMPLATE.md`; jangan masukkan cookie/password/token.

## Skenario dari contoh yang tidak dijalankan

Brute force SSH, SQLmap/SQLi eksploitasi, RCE, penghapusan/manipulasi log, timestomping, obfuscation, serta traffic flooding/DoS dikeluarkan dari praktikum. Kontrol SSH diuji lewat konfigurasi, source allowlist, dan scan port terbatas; query SQL menggunakan parameter dan tidak dibuat rentan; visibilitas monitoring diuji melalui event/log yang sah. Ini memberi bukti defense tanpa risiko merusak VM atau jaringan rumah.
