# Panduan Penggunaan External Attendance API

**Versi:** 1.0
**Terakhir diperbarui:** 2026-05-05
**Base URL:** `http://localhost:3004/api/external`

## Overview

External Attendance API memungkinkan aplikasi pihak ketiga (website QR scanner, mobile app, dsb.) untuk mengakses data absensi melalui HTTP API. API ini sudah mendukung **CORS** sehingga bisa dipanggil langsung dari browser.

### Yang bisa dilakukan

| Aksi | Endpoint | Method |
|---|---|---|
| Auto check-in (8 jam otomatis) | `/attendance/auto-checkin` | `POST` |
| Baca data absensi | `/attendance` | `GET` |

---

## Autentikasi

Semua request wajib menyertakan header:

```
x-api-key: <API_KEY_ANDA>
```

### Cara mendapatkan API Key

1. Login sebagai **admin** ke dashboard Absensi
2. Buka **Settings → Kunci API** (atau `/settings/api-keys`)
3. Klik **Buat Key**, isi nama dan scope
4. **Salin key yang muncul** — key hanya ditampilkan sekali

### Scope API Key

| Scope | Izin |
|---|---|
| `attendance:readwrite` | Read + Auto check-in |
| `attendance:read` | Read only |
| `attendance:auto-checkin` | Auto check-in only |

---

## CORS

API mendukung **Cross-Origin Resource Sharing** dengan header:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, x-api-key
```

Browser akan mengirim **preflight OPTIONS** yang dihandle otomatis oleh server. Tidak perlu konfigurasi tambahan di sisi client.

---

## Response Format

Semua response menggunakan format konsisten:

### Success

```json
{
  "success": true,
  "data": { ... }
}
```

### Error

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

### HTTP Status Codes

| Status | Makna |
|---|---|
| 200 | Success (GET) |
| 201 | Created (POST, auto check-in berhasil) |
| 400 | Bad request — body tidak valid |
| 401 | API key tidak ada atau invalid |
| 403 | API key tidak punya izin untuk endpoint ini |
| 404 | User tidak ditemukan |
| 409 | Sudah absen hari ini (duplicate) |
| 500 | Internal server error |

---

## 1. Auto Check-In

Registrasi absensi otomatis — check-in + checkout 8 jam tanpa perlu checkout manual.

### Request

```
POST /api/external/attendance/auto-checkin
Content-Type: application/json
x-api-key: api_live_...
```

### Body

```json
{
  "userId": "string (required)",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "accuracy": 12.5,
  "notes": "QR scan dari kantor pusat (optional)"
}
```

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `userId` | string | Ya | UUID user yang akan diabsen |
| `latitude` | number | Ya | Koordinat GPS (-90 s/d 90) |
| `longitude` | number | Ya | Koordinat GPS (-180 s/d 180) |
| `accuracy` | number | Ya | Akurasi GPS dalam meter (maks 5000) |
| `notes` | string | Tidak | Catatan tambahan (misal: via QR) |

### Success Response (201)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "checkInTime": "2026-05-05T08:00:00.000Z",
    "checkOutTime": "2026-05-05T16:00:00.000Z",
    "workHours": "8.00",
    "status": "present",
    "checkInAddress": "Jl. Sudirman, Jakarta"
  }
}
```

### Error Examples

**API key invalid:**
```json
{ "success": false, "error": "Invalid API key" }
```
HTTP 401

**Sudah absen hari ini:**
```json
{ "success": false, "error": "Attendance already exists for today" }
```
HTTP 409

**GPS tidak akurat:**
```json
{ "success": false, "error": "Akurasi GPS tidak mencukupi. Pastikan GPS aktif dan akurat." }
```
HTTP 400

---

## 2. Baca Data Absensi

Mengambil data absensi semua user dengan filter dan paginasi.

### Request

```
GET /api/external/attendance?date=2026-05-05&limit=50&offset=0
x-api-key: api_live_...
```

### Query Parameters

| Param | Type | Default | Deskripsi |
|---|---|---|---|
| `date` | ISO date | hari ini | Filter satu tanggal |
| `dateFrom` | ISO date | — | Awal rentang tanggal |
| `dateTo` | ISO date | — | Akhir rentang tanggal |
| `userId` | string | — | Filter per user |
| `limit` | number | 50 | Maks 200 per halaman |
| `offset` | number | 0 | Offset paginasi |

> **Catatan:** Jika `date` diberikan, `dateFrom`/`dateTo` diabaikan. Jika tidak ada filter tanggal, default ke hari ini.

### Success Response (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "John Doe",
      "date": "2026-05-05",
      "checkInTime": "2026-05-05T08:00:00.000Z",
      "checkOutTime": "2026-05-05T16:00:00.000Z",
      "checkInLatitude": "-6.20880000",
      "checkInLongitude": "106.84560000",
      "checkInAddress": "Jl. Sudirman, Jakarta",
      "checkOutLatitude": null,
      "checkOutLongitude": null,
      "checkOutAddress": null,
      "workHours": "8.00",
      "overtimeHours": "0.00",
      "lateMinutes": 0,
      "status": "present"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

| Field | Type | Deskripsi |
|---|---|---|
| `workHours` | string \| null | Jam kerja (Decimal jadi string) |
| `overtimeHours` | string | Jam lembur |
| `lateMinutes` | number | Menit keterlambatan |
| `status` | string | `present` \| `late` \| `absent` \| `half_day` |

---

## Contoh Integrasi

### JavaScript (Fetch API)

```javascript
const API_KEY = "api_live_xxxxxxxxxxxxx"
const BASE = "http://localhost:3004/api/external"

// Auto check-in
async function autoCheckIn(userId, lat, lng, acc) {
  const res = await fetch(`${BASE}/attendance/auto-checkin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({
      userId,
      latitude: lat,
      longitude: lng,
      accuracy: acc,
      notes: "QR scan",
    }),
  })
  return res.json()
}

// Baca data absensi hari ini
async function getTodayAttendance() {
  const res = await fetch(
    `${BASE}/attendance?limit=200`,
    { headers: { "x-api-key": API_KEY } }
  )
  return res.json()
}
```

### cURL

```bash
# Auto check-in
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-api-key: api_live_xxxxxxxxxxxxx" \
  -d '{"userId":"uuid","latitude":-6.2088,"longitude":106.8456,"accuracy":10}' \
  http://localhost:3004/api/external/attendance/auto-checkin

# Baca data absensi (filter tanggal)
curl -H "x-api-key: api_live_xxxxxxxxxxxxx" \
  "http://localhost:3004/api/external/attendance?date=2026-05-05&limit=50"

# Baca data absensi (rentang)
curl -H "x-api-key: api_live_xxxxxxxxxxxxx" \
  "http://localhost:3004/api/external/attendance?dateFrom=2026-05-01&dateTo=2026-05-05"
```

### PHP

```php
<?php
$apiKey = "api_live_xxxxxxxxxxxxx";
$base = "http://localhost:3004/api/external";

// Auto check-in
$ch = curl_init("$base/attendance/auto-checkin");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "x-api-key: $apiKey",
    ],
    CURLOPT_POSTFIELDS => json_encode([
        "userId" => "uuid",
        "latitude" => -6.2088,
        "longitude" => 106.8456,
        "accuracy" => 10,
    ]),
    CURLOPT_RETURNTRANSFER => true,
]);
$response = curl_exec($ch);
curl_close($ch);
echo $response;
```

---

## Best Practices

1. **Simpan API key di environment variable**, jangan hardcode di source code
2. **Gunakan scope minimal** — kalau cuma butuh auto check-in, jangan pakai `readwrite`
3. **Revoke key yang tidak terpakai** via dashboard `/settings/api-keys`
4. **Buat key terpisah per aplikasi** — jangan sharing key antar aplikasi
5. **GPS accuracy** — toleransi akurasi 5000m (cukup longgar). Untuk WiFi/indoor GPS bisa sampai 50-100m, outdoor ~5-10m
6. **Rate limiting** — belum ada. Hindari membuat request berlebihan

## Testing CORS (Browser)

Buka DevTools Console di website Anda dan jalankan:

```javascript
fetch("http://localhost:3004/api/external/attendance", {
  headers: { "x-api-key": "api_live_xxx" }
})
  .then(r => r.json())
  .then(console.log)
```

Jika berhasil, Anda akan melihat response JSON. Jika gagal dengan CORS error, pastikan server berjalan dan API key valid.

---

## Troubleshooting

| Error | Penyebab | Solusi |
|---|---|---|
| `Missing API key` | Header `x-api-key` tidak dikirim | Tambahkan header |
| `Invalid API key` | Key salah atau sudah direvoke | Cek ulang key, generate baru |
| `Insufficient API key scope` | Scope key tidak mencukupi | Generate key dengan scope yang tepat |
| `Attendance already exists for today` | User sudah absen hari ini | Tidak bisa double check-in |
| `User not found or inactive` | userId tidak valid | Cek UUID user di database |
| CORS error di browser | Server tidak jalan / origin diblok | Pastikan server running di port 3004 |
