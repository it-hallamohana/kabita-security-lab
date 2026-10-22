# KABITA Security Lab

Repo praktikum Blue Team/Red Team yang berdiri sendiri untuk replika monitoring domba KABITA. Target lab adalah Ubuntu Server 24.04.1 dengan Nginx, aplikasi React/TypeScript, Node.js API, dan PostgreSQL lokal. **Repo ini bukan bagian dari repo produksi Sahira Farm/KABITA dan tidak boleh dipush/di-merge ke repo produksi.** Tidak ada Git remote yang disalin dari sumber.

## Mulai cepat

1. Baca [Rules of Engagement](docs/ROE.md) dan [panduan OVA/topologi](docs/OVA-HANDOFF.md).
2. Lihat [tech stack target](docs/presentation-minggu9/tech_stack_declaration.md).
3. Jalankan [attack plan](docs/redteam/attack_plan.md) dari Kali hanya terhadap IP target yang diumumkan.
4. Blue Team gunakan [hardening checklist](docs/blueteam/hardening_checklist.md) dan catat hasil di [evidence template](docs/EVIDENCE-TEMPLATE.md).
5. Deploy ulang mengikuti [README-LAB.md](README-LAB.md).

## Struktur

- `src/lab/`, `server/`, `public/`: aplikasi lab manual PostgreSQL.
- `deploy/`: konfigurasi dan installer Ubuntu.
- `tests/`: tes aplikasi dan security scenarios.
- `docs/redteam/`: skenario dan batas pengujian.
- `docs/blueteam/`: checklist host/app dan bukti baseline.
- `docs/design/`: IP plan dan diagram jaringan.
- `docs/OVA-HANDOFF.md`: persiapan ekspor, first boot, skenario dan OVA handoff.
- `docs/purple-team-log.md`: log hasil yang sudah dilakukan dan pending.

## Batas penting

Semua akun/record adalah sintetis. Mode vulnerable hanya menyalakan demo V01–V04; query SQL tetap berparameter dan fitur OS tetap dibatasi. Tidak ada Supabase yang dibutuhkan untuk target ini. Jangan jalankan terhadap sistem produksi, jaringan rumah/umum, atau host yang bukan target lab.

## Status awal

Aplikasi target telah diuji dari laptop pengelola; pengujian dari Kali eksternal dan Security Onion masih pending. HTTPS/TLS dan backup-restore juga belum dinyatakan selesai. Lihat bukti terbaru sebelum memberi klaim bahwa suatu kontrol berhasil.
