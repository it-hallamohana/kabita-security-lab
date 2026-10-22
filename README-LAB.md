# KABITA LAB

Replika Sahira Farm untuk praktikum TEK1314. Seluruh data adalah sintetis. Entry point aplikasi lab adalah `src/lab/app.tsx`. Lab berfokus pada login, isolasi data peternak, pencatatan domba dan bobot, grafik pertumbuhan, ingest sensor HTTP, serta status kontrol Blue Team. CMS company profile, RFID fisik, email activation, dan ML produksi tidak dioperasikan oleh replika ini.

## Akses

Alamat target: **http://IP-TARGET:8080**. IP DHCP dapat berubah setelah pindah Wi-Fi/hotspot. Periksa `hostname -I` di VM. Perangkat Red Team harus berada di jaringan lab yang sama, dan hotspot harus mengizinkan komunikasi antarklien.

- `blue@kabita.lab`: admin Blue Team, melihat semua data dan status kontrol.
- `peternak.a@kabita.lab`: hanya data peternak A.
- `peternak.b@kabita.lab`: hanya data peternak B.
- `legacy@kabita.lab` / `kabita123`: **khusus mode vulnerable**; dimatikan dalam mode hardened.

Password normal dan token perangkat dihasilkan acak saat instalasi, tersimpan root-only di `/etc/kabita-lab/app.env`. Jangan commit atau screenshot isi file tersebut. Akun lab tidak sama dengan akun Ubuntu atau PostgreSQL.

## Menjalankan praktikum

```bash
sudo kabita-mode vulnerable
# Jalankan langkah attack_plan.md dan catat bukti.
sudo kabita-mode hardened
# Ulangi permintaan yang sama; celah harus ditolak.
sudo kabita-evidence
```

Perubahan mode merestart layanan dan membatalkan seluruh sesi. Mode rentan sengaja membuka hanya V01-V04 di dokumen serangan; query SQL tetap berparameter, validasi ukuran input tetap aktif, dan tidak ada command execution/ransomware. HTTP digunakan untuk demonstrasi jaringan; TLS belum dipasang, jadi gunakan hanya akun dummy lab.

## Build dan tes

```bash
npm ci
npm run build
npm test
```

Backend manual ada di `server/app.mjs` dan `server/store.mjs`. PostgreSQL menyimpan record JSONB dengan primary key `(kind,id)` dan indeks `(kind,owner_id)`; versi ini tidak memakai Supabase API/RLS. Kepemilikan diverifikasi di API (kecuali detail endpoint V02 pada mode rentan). `kabita_app` tidak memiliki hak superuser, membuat database, atau membuat role.

## Deploy ulang

Build di laptop, kirim `dist/`, `server/`, `deploy/`, `package.json`, dan `package-lock.json` ke VM. Jalankan `sudo bash deploy/install.sh`. Installer mempertahankan secret yang sudah ada dan seed menggunakan `ON CONFLICT DO NOTHING`. Jangan menjalankannya pada host produksi.

- Aplikasi: `/opt/kabita-lab`; service `kabita-lab` sebagai user sistem tanpa shell.
- Nginx: port 8080; API internal `127.0.0.1:3000`; PostgreSQL loopback 5432.
- Log: `journalctl -u kabita-lab`, `/var/log/nginx/kabita-access.log`, `/var/log/kabita-lab/install.log`.
- Hanya tindakan maintenance lab tertentu didelegasikan melalui `/etc/sudoers.d/kabita-lab`; tidak ada akses sudo arbitrer tanpa password.
- SSH key pengelola diuji sebelum password SSH dinonaktifkan. Console VM tetap dapat digunakan untuk recovery.

## Pindah jaringan

Adapter 1 VirtualBox menggunakan Bridged ke adapter jaringan lab; adapter 2 NAT untuk koneksi keluar. Saat pindah jaringan, perbarui allowlist UFW dari console menggunakan subnet praktikum dan IP admin yang baru sebelum pengujian. Lihat `docs/OVA-HANDOFF.md`; jangan membuat port-forward pada router ke internet.

Security Onion belum terpasang pada target ini. Monitoring Node memerlukan sensor terpisah dan akses traffic melalui TAP/SPAN/mirror atau ingest log; hanya berada di Wi-Fi yang sama tidak menjamin sensor melihat lalu lintas unicast target.
