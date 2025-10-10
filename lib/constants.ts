// Indonesian language constants for the attendance system

export const NAVIGATION = {
  DASHBOARD: "Dashboard",
  ATTENDANCE: "Absensi",
  REPORTS: "Laporan",
  USERS: "Pengguna",
  PROFILE: "Profil",
  SETTINGS: "Pengaturan",
  LOGOUT: "Keluar",
  LOGIN: "Masuk",
  CHECK_IN: "Check In",
  CHECK_OUT: "Check Out",
  MY_ATTENDANCE: "Absensi Saya",
  ADMIN_PANEL: "Panel Admin",
  MANAGER_PANEL: "Panel Manager"
} as const

export const STATUS_LABELS = {
  present: "Hadir",
  late: "Terlambat",
  absent: "Tidak Hadir",
  half_day: "Setengah Hari"
} as const

export const ROLE_LABELS = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  USER: "Pengguna"
} as const

export const MESSAGES = {
  // Authentication
  LOGIN_SUCCESS: "Berhasil masuk",
  LOGIN_FAILED: "Gagal masuk. Periksa email dan password Anda.",
  LOGOUT_SUCCESS: "Berhasil keluar",
  SESSION_EXPIRED: "Sesi Anda telah berakhir. Silakan masuk kembali.",

  // Check-in/Check-out
  CHECK_IN_SUCCESS: "Check-in berhasil",
  CHECK_OUT_SUCCESS: "Check-out berhasil",
  CHECK_IN_FAILED: "Gagal melakukan check-in",
  CHECK_OUT_FAILED: "Gagal melakukan check-out",
  ALREADY_CHECKED_IN: "Anda sudah check-in hari ini",
  NOT_CHECKED_IN: "Anda belum check-in hari ini",
  OUTSIDE_WORK_HOURS: "Di luar jam kerja",
  LOCATION_INVALID: "Lokasi tidak valid",

  // Profile
  PROFILE_UPDATED: "Profil berhasil diperbarui",
  PASSWORD_CHANGED: "Password berhasil diubah",

  // Users
  USER_CREATED: "Pengguna berhasil dibuat",
  USER_UPDATED: "Pengguna berhasil diperbarui",
  USER_DELETED: "Pengguna berhasil dihapus",

  // Reports
  REPORT_GENERATED: "Laporan berhasil dibuat",
  EXPORT_SUCCESS: "Data berhasil diekspor",

  // General
  LOADING: "Memuat...",
  ERROR: "Terjadi kesalahan",
  SUCCESS: "Berhasil",
  CONFIRM: "Konfirmasi",
  CANCEL: "Batal",
  SAVE: "Simpan",
  EDIT: "Edit",
  DELETE: "Hapus",
  VIEW: "Lihat",
  SEARCH: "Cari",
  FILTER: "Filter",
  EXPORT: "Ekspor"
} as const

export const VALIDATION_MESSAGES = {
  REQUIRED: "Field ini wajib diisi",
  EMAIL_INVALID: "Format email tidak valid",
  PASSWORD_TOO_SHORT: "Password minimal 8 karakter",
  PASSWORD_MISMATCH: "Password tidak cocok",
  PHONE_INVALID: "Format nomor telepon tidak valid",
  NAME_REQUIRED: "Nama wajib diisi",
  DEPARTMENT_REQUIRED: "Departemen wajib diisi",
  POSITION_REQUIRED: "Posisi wajib diisi"
} as const

export const TIME_LABELS = {
  CHECK_IN_TIME: "Waktu Check-in",
  CHECK_OUT_TIME: "Waktu Check-out",
  WORK_HOURS: "Jam Kerja",
  OVERTIME_HOURS: "Lembur",
  LATE_MINUTES: "Terlambat (menit)",
  TODAY: "Hari Ini",
  THIS_WEEK: "Minggu Ini",
  THIS_MONTH: "Bulan Ini",
  DATE: "Tanggal",
  TIME: "Waktu",
  DURATION: "Durasi"
} as const

export const FORM_LABELS = {
  EMAIL: "Email",
  PASSWORD: "Password",
  CONFIRM_PASSWORD: "Konfirmasi Password",
  NAME: "Nama Lengkap",
  PHONE: "Nomor Telepon",
  DEPARTMENT: "Departemen",
  POSITION: "Posisi",
  ROLE: "Role",
  AVATAR: "Foto Profil",
  NOTES: "Catatan",
  START_DATE: "Tanggal Mulai",
  END_DATE: "Tanggal Akhir",
  STATUS: "Status",
  LOCATION: "Lokasi"
} as const

export const TABLE_HEADERS = {
  DATE: "Tanggal",
  USER: "Pengguna",
  CHECK_IN: "Check-in",
  CHECK_OUT: "Check-out",
  WORK_HOURS: "Jam Kerja",
  STATUS: "Status",
  LOCATION: "Lokasi",
  ACTIONS: "Aksi"
} as const

export const SETTINGS_KEYS = {
  OFFICE_LOCATION: "office_location",
  WORK_SCHEDULE: "work_schedule",
  GEOFENCING: "geofencing",
  NOTIFICATIONS: "notifications"
} as const

export const DEFAULT_SETTINGS = {
  OFFICE_LOCATION: {
    latitude: -6.2088,
    longitude: 106.8456,
    address: "Jakarta, Indonesia",
    radius: 100
  },
  WORK_SCHEDULE: {
    check_in_start: "06:00",
    check_in_end: "10:00",
    check_out_start: "14:00",
    check_out_end: "22:00",
    work_hours_min: 4,
    work_hours_max: 12,
    late_tolerance: 15
  },
  GEOFENCING: {
    enabled: true,
    radius_meters: 100,
    accuracy_threshold: 10
  },
  NOTIFICATIONS: {
    email_enabled: true,
    daily_summary: true,
    late_reminder: true
  }
} as const
