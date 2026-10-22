# Deklarasi tech stack

| Lapisan | Target Node (OVA praktikum) |
|---|---|
| OS | Ubuntu Server 24.04.1 LTS |
| Web/proxy | Nginx 1.24, static frontend + reverse proxy; HTTP lab TCP/8080 |
| Frontend | React 19, TypeScript 5.9, Vite 7, Recharts, Lucide; CSS lokal |
| API | Node.js 24, Node built-in HTTP API, ES modules, `pg` 8.x; JSON REST di balik Nginx (`127.0.0.1:3000`) |
| Database | PostgreSQL 16 lokal (`127.0.0.1:5432`), record JSONB; role aplikasi non-superuser |
| Authentication | Scrypt password verification; HttpOnly/SameSite cookie; owner authorization di API Node |
| Runtime/ops | systemd service sebagai user `kabita` tanpa shell; UFW; Fail2ban; journald + Nginx logs |
| Monitoring | Security Onion belum terhubung; rencana log forwarding/syslog dan/atau traffic sensor via TAP/SPAN |

Akses web target: `http://IP-TARGET:8080`. API dan database tidak boleh dipublikasikan langsung ke LAN. Protokol pada latihan adalah HTTP/JSON REST; RFID fisik/MQTT tidak dijalankan oleh replika ini.

## Bedanya dengan proyek asal

Proyek Sahira Farm/KABITA yang jadi acuan memakai React/TypeScript/Vite dan Supabase (PostgreSQL terkelola, Supabase Auth/RLS, serta Edge Function RFID). Pada VM ini Supabase diganti Node API + PostgreSQL manual sesuai pilihan kelompok. Jadi sebut sebagai **replika praktikum dengan backend lokal**, bukan backend identik, dan jangan menyimpulkan hasil demo sebagai bukti kerentanan proyek asli. Semua data ternak dan akun merupakan dummy. Foto/gaya visual mengacu pada repo awal.
