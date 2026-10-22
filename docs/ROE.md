# Rules of Engagement (ROE)

## Tujuan

Melakukan latihan terotorisasi Purple Team pada satu replika KABITA yang dimiliki kelompok, mengamati serangan aplikasi terbatas, menguji kontrol Blue Team, dan mencatat perbaikan.

## Ruang lingkup

- Target: satu VM Ubuntu Server 24.04.1 berisi aplikasi KABITA Security Lab.
- Layanan web: TCP/8080 pada IP Target Node yang diumumkan operator saat sesi.
- Sumber serangan: perangkat Kali milik anggota kelompok yang disetujui.
- Sensor: Security Onion milik kelompok.
- Dataset dan akun: sintetis, khusus laboratorium.

IP yang tercatat di dokumen adalah placeholder atau contoh lokal. Verifikasi alamat target pada hari praktikum; DHCP dapat mengubah IP.

## Diizinkan

- Pemeriksaan port terbatas hanya pada IP Target Node dan port yang direncanakan.
- Pengujian manual empat skenario V01–V04 menggunakan akun/dataset demo.
- Pengumpulan request/response yang tidak memuat password, cookie aktif, token, atau data pribadi.
- Perubahan mode vulnerable/hardened oleh operator VM serta retest terkontrol.
- Pengiriman log aplikasi ke Security Onion dan analisis alert.

## Tidak diizinkan

- Menyerang alamat selain Target Node, termasuk router, access point, host Security Onion, layanan publik, atau anggota lain.
- Brute force/password spraying, flooding/DoS, malware, persistence, privilege escalation, SQLmap atau payload SQLi destruktif, RCE, pencurian kredensial, penghapusan/manipulasi log, anti-forensics, atau tunnel penyamaran.
- Membuka PostgreSQL/API internal ke jaringan atau menonaktifkan firewall/monitoring untuk memudahkan serangan.
- Menyimpan password, cookie, token, atau secret dalam Git, screenshot, laporan, maupun log yang dibagikan.

Skenario SSH dinilai melalui konfigurasi dan pemindaian layanan terbatas; jangan mencoba login password massal. SQL injection, RCE, anti-forensics, dan DoS bukan bagian target lab karena implementasi mengunci query dengan parameter, service dibatasi, dan tujuan dapat dipenuhi dengan V01–V04.

## Aturan sesi dan penghentian

1. Operator menyebut IP target, subnet lab, mode aplikasi, dan waktu mulai.
2. Red Team menjalankan satu skenario pada satu waktu; Blue Team mencatat timestamp dan source IP.
3. Hentikan tes jika target tidak responsif, scope/IP tidak cocok, atau ada indikasi sistem di luar lab tersentuh.
4. Operator mengembalikan `hardened` sebelum menutup sesi.
5. Hapus cookie uji dari device Kali; jangan ekspor log dengan secret.
6. Semua anggota menyimpan bukti hanya di repo lab private/kanal kelompok yang disetujui.
