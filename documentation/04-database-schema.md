# 🗄️ Database Schema & Data Models - Absensi Standalone

## 📋 Database Overview

### Database Technology
- **Database**: MySQL 8.0+
- **ORM**: Prisma
- **Connection**: Connection pooling dengan maksimal 20 koneksi
- **Encoding**: UTF-8 (utf8mb4)
- **Engine**: InnoDB

### Naming Conventions
- **Tables**: snake_case (e.g., `absensi_records`)
- **Columns**: snake_case (e.g., `user_id`, `check_in_time`)
- **Indexes**: `idx_` prefix (e.g., `idx_user_date`)
- **Foreign Keys**: `fk_` prefix (e.g., `fk_absensi_user`)
- **Primary Keys**: `id` (VARCHAR(36) UUID)

---

## 🏗️ Core Tables

### 1. Users Table
**Purpose**: Menyimpan data pengguna sistem

```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'manager', 'user') NOT NULL DEFAULT 'user',
  department VARCHAR(100),
  position VARCHAR(100),
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_department (department),
  INDEX idx_is_active (is_active),
  INDEX idx_created_at (created_at)
);
```

#### Column Descriptions
| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | VARCHAR(36) | Unique identifier | Primary Key, UUID |
| `email` | VARCHAR(255) | User email address | Unique, Not Null |
| `password` | VARCHAR(255) | Hashed password | Not Null, bcrypt |
| `name` | VARCHAR(255) | Full name | Not Null |
| `role` | ENUM | User role | admin, manager, user |
| `department` | VARCHAR(100) | Department name | Nullable |
| `position` | VARCHAR(100) | Job position | Nullable |
| `phone` | VARCHAR(20) | Phone number | Nullable |
| `avatar_url` | VARCHAR(500) | Avatar image URL | Nullable |
| `is_active` | BOOLEAN | Account status | Default: true |
| `last_login` | TIMESTAMP | Last login time | Nullable |
| `created_at` | TIMESTAMP | Creation time | Auto-generated |
| `updated_at` | TIMESTAMP | Last update time | Auto-updated |

### 2. Absensi Records Table
**Purpose**: Menyimpan data absensi harian karyawan

```sql
CREATE TABLE absensi_records (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  check_in_time TIMESTAMP NULL,
  check_out_time TIMESTAMP NULL,
  check_in_latitude DECIMAL(10, 8) NULL,
  check_in_longitude DECIMAL(11, 8) NULL,
  check_in_address TEXT NULL,
  check_in_accuracy DECIMAL(8, 2) NULL,
  check_out_latitude DECIMAL(10, 8) NULL,
  check_out_longitude DECIMAL(11, 8) NULL,
  check_out_address TEXT NULL,
  check_out_accuracy DECIMAL(8, 2) NULL,
  work_hours DECIMAL(4, 2) NULL,
  overtime_hours DECIMAL(4, 2) DEFAULT 0.00,
  late_minutes INT DEFAULT 0,
  status ENUM('present', 'late', 'absent', 'half_day') NOT NULL DEFAULT 'absent',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_user_date (user_id, date),
  INDEX idx_date (date),
  INDEX idx_status (status),
  INDEX idx_check_in_time (check_in_time),
  INDEX idx_work_hours (work_hours),
  INDEX idx_created_at (created_at),
  
  -- Constraints
  UNIQUE KEY unique_user_date (user_id, date),
  CHECK (work_hours >= 0 AND work_hours <= 24),
  CHECK (overtime_hours >= 0 AND overtime_hours <= 16),
  CHECK (late_minutes >= 0 AND late_minutes <= 1440)
);
```

#### Column Descriptions
| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | VARCHAR(36) | Unique identifier | Primary Key, UUID |
| `user_id` | VARCHAR(36) | Reference to users | Foreign Key, Not Null |
| `date` | DATE | Attendance date | Not Null |
| `check_in_time` | TIMESTAMP | Check-in timestamp | Nullable |
| `check_out_time` | TIMESTAMP | Check-out timestamp | Nullable |
| `check_in_latitude` | DECIMAL(10,8) | Check-in latitude | Nullable, GPS coord |
| `check_in_longitude` | DECIMAL(11,8) | Check-in longitude | Nullable, GPS coord |
| `check_in_address` | TEXT | Check-in address | Nullable, Reverse geocoded |
| `check_in_accuracy` | DECIMAL(8,2) | GPS accuracy (meters) | Nullable |
| `work_hours` | DECIMAL(4,2) | Total work hours | Nullable, 0-24 |
| `overtime_hours` | DECIMAL(4,2) | Overtime hours | Default: 0, 0-16 |
| `late_minutes` | INT | Late arrival minutes | Default: 0, 0-1440 |
| `status` | ENUM | Attendance status | present, late, absent, half_day |
| `notes` | TEXT | Additional notes | Nullable |
| `created_at` | TIMESTAMP | Creation time | Auto-generated |
| `updated_at` | TIMESTAMP | Last update time | Auto-updated |

### 3. Activity Logs Table
**Purpose**: Audit trail untuk semua aktivitas sistem

```sql
CREATE TABLE activity_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(36) NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created_at (created_at),
  INDEX idx_ip_address (ip_address)
);
```

#### Activity Types
| Action | Resource Type | Description |
|--------|---------------|-------------|
| `login` | `user` | User login |
| `logout` | `user` | User logout |
| `check_in` | `absensi_record` | Check-in action |
| `check_out` | `absensi_record` | Check-out action |
| `create_user` | `user` | Create new user |
| `update_user` | `user` | Update user data |
| `delete_user` | `user` | Delete user |
| `export_report` | `report` | Export report |
| `update_settings` | `settings` | Update system settings |

### 4. Settings Table
**Purpose**: Konfigurasi sistem yang dapat diubah

```sql
CREATE TABLE settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSON NOT NULL,
  description TEXT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_key (key),
  INDEX idx_is_public (is_public)
);
```

#### Default Settings
```json
{
  "office_location": {
    "latitude": -6.2088,
    "longitude": 106.8456,
    "address": "Jakarta, Indonesia",
    "radius": 100
  },
  "work_schedule": {
    "check_in_start": "06:00",
    "check_in_end": "10:00",
    "check_out_start": "14:00",
    "check_out_end": "22:00",
    "work_hours_min": 4,
    "work_hours_max": 12,
    "late_tolerance": 15
  },
  "geofencing": {
    "enabled": true,
    "radius_meters": 100,
    "accuracy_threshold": 10
  },
  "notifications": {
    "email_enabled": true,
    "daily_summary": true,
    "late_reminder": true
  }
}
```

---

## 🔗 Relationships

### Entity Relationship Diagram
```
Users (1) ──────── (N) AbsensiRecords
  │
  │
  └── (1) ──────── (N) ActivityLogs

Settings (1) ──────── (N) [Independent]
```

### Relationship Details

#### Users → AbsensiRecords
- **Type**: One-to-Many
- **Foreign Key**: `absensi_records.user_id → users.id`
- **Cascade**: DELETE CASCADE
- **Description**: Satu user dapat memiliki banyak record absensi

#### Users → ActivityLogs
- **Type**: One-to-Many
- **Foreign Key**: `activity_logs.user_id → users.id`
- **Cascade**: DELETE CASCADE
- **Description**: Satu user dapat memiliki banyak activity log

---

## 📊 Data Models (Prisma)

### Prisma Schema
```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  admin
  manager
  user
}

enum AttendanceStatus {
  present
  late
  absent
  half_day
}

model User {
  id          String    @id @default(uuid())
  email       String    @unique
  password    String
  name        String
  role        UserRole  @default(user)
  department  String?
  position    String?
  phone       String?
  avatarUrl   String?   @map("avatar_url")
  isActive    Boolean   @default(true) @map("is_active")
  lastLogin   DateTime? @map("last_login")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  // Relations
  absensiRecords AbsensiRecord[]
  activityLogs   ActivityLog[]

  @@map("users")
}

model AbsensiRecord {
  id                String            @id @default(uuid())
  userId            String            @map("user_id")
  date              DateTime          @db.Date
  checkInTime       DateTime?         @map("check_in_time")
  checkOutTime      DateTime?         @map("check_out_time")
  checkInLatitude   Decimal?          @map("check_in_latitude") @db.Decimal(10, 8)
  checkInLongitude  Decimal?          @map("check_in_longitude") @db.Decimal(11, 8)
  checkInAddress    String?           @map("check_in_address") @db.Text
  checkInAccuracy   Decimal?          @map("check_in_accuracy") @db.Decimal(8, 2)
  checkOutLatitude  Decimal?          @map("check_out_latitude") @db.Decimal(10, 8)
  checkOutLongitude Decimal?          @map("check_out_longitude") @db.Decimal(11, 8)
  checkOutAddress   String?           @map("check_out_address") @db.Text
  checkOutAccuracy  Decimal?          @map("check_out_accuracy") @db.Decimal(8, 2)
  workHours         Decimal?          @map("work_hours") @db.Decimal(4, 2)
  overtimeHours     Decimal          @default(0.00) @map("overtime_hours") @db.Decimal(4, 2)
  lateMinutes       Int              @default(0) @map("late_minutes")
  status            AttendanceStatus @default(absent)
  notes             String?          @db.Text
  createdAt         DateTime         @default(now()) @map("created_at")
  updatedAt         DateTime         @updatedAt @map("updated_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@map("absensi_records")
}

model ActivityLog {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  action       String
  resourceType String   @map("resource_type")
  resourceId   String?  @map("resource_id")
  details      Json?
  ipAddress    String?  @map("ip_address")
  userAgent    String?  @map("user_agent") @db.Text
  createdAt    DateTime @default(now()) @map("created_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("activity_logs")
}

model Setting {
  id          String   @id @default(uuid())
  key         String   @unique
  value       Json
  description String?
  isPublic    Boolean  @default(false) @map("is_public")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("settings")
}
```

---

## 🔍 Indexes & Performance

### Primary Indexes
```sql
-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Absensi records indexes
CREATE INDEX idx_absensi_user_date ON absensi_records(user_id, date);
CREATE INDEX idx_absensi_date ON absensi_records(date);
CREATE INDEX idx_absensi_status ON absensi_records(status);
CREATE INDEX idx_absensi_check_in_time ON absensi_records(check_in_time);
CREATE INDEX idx_absensi_work_hours ON absensi_records(work_hours);

-- Activity logs indexes
CREATE INDEX idx_activity_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_action ON activity_logs(action);
CREATE INDEX idx_activity_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX idx_activity_created_at ON activity_logs(created_at);
```

### Composite Indexes
```sql
-- For common query patterns
CREATE INDEX idx_absensi_user_date_status ON absensi_records(user_id, date, status);
CREATE INDEX idx_absensi_date_status ON absensi_records(date, status);
CREATE INDEX idx_activity_user_action ON activity_logs(user_id, action);
```

### Query Optimization Examples
```sql
-- Get user's attendance for date range
SELECT * FROM absensi_records 
WHERE user_id = ? AND date BETWEEN ? AND ?
ORDER BY date DESC;

-- Get today's attendance summary
SELECT status, COUNT(*) as count 
FROM absensi_records 
WHERE date = CURDATE() 
GROUP BY status;

-- Get user's monthly attendance
SELECT DATE(date) as date, status, work_hours 
FROM absensi_records 
WHERE user_id = ? AND YEAR(date) = ? AND MONTH(date) = ?
ORDER BY date;
```

---

## 🔒 Data Validation & Constraints

### Check Constraints
```sql
-- Work hours validation
ALTER TABLE absensi_records 
ADD CONSTRAINT chk_work_hours 
CHECK (work_hours >= 0 AND work_hours <= 24);

-- Overtime hours validation
ALTER TABLE absensi_records 
ADD CONSTRAINT chk_overtime_hours 
CHECK (overtime_hours >= 0 AND overtime_hours <= 16);

-- Late minutes validation
ALTER TABLE absensi_records 
ADD CONSTRAINT chk_late_minutes 
CHECK (late_minutes >= 0 AND late_minutes <= 1440);

-- GPS coordinates validation
ALTER TABLE absensi_records 
ADD CONSTRAINT chk_check_in_latitude 
CHECK (check_in_latitude >= -90 AND check_in_latitude <= 90);

ALTER TABLE absensi_records 
ADD CONSTRAINT chk_check_in_longitude 
CHECK (check_in_longitude >= -180 AND check_in_longitude <= 180);
```

### Triggers
```sql
-- Auto-calculate work hours on check-out
DELIMITER $$
CREATE TRIGGER tr_calculate_work_hours
BEFORE UPDATE ON absensi_records
FOR EACH ROW
BEGIN
  IF NEW.check_out_time IS NOT NULL AND OLD.check_out_time IS NULL THEN
    SET NEW.work_hours = TIMESTAMPDIFF(MINUTE, NEW.check_in_time, NEW.check_out_time) / 60.0;
    
    -- Calculate overtime (assuming 8 hours standard)
    IF NEW.work_hours > 8 THEN
      SET NEW.overtime_hours = NEW.work_hours - 8;
    END IF;
    
    -- Calculate late minutes (assuming 8:00 AM standard)
    IF NEW.check_in_time > CONCAT(CURDATE(), ' 08:00:00') THEN
      SET NEW.late_minutes = TIMESTAMPDIFF(MINUTE, CONCAT(CURDATE(), ' 08:00:00'), NEW.check_in_time);
    END IF;
    
    -- Determine status
    IF NEW.work_hours < 4 THEN
      SET NEW.status = 'half_day';
    ELSEIF NEW.late_minutes > 15 THEN
      SET NEW.status = 'late';
    ELSE
      SET NEW.status = 'present';
    END IF;
  END IF;
END$$
DELIMITER ;
```

---

## 📈 Data Migration & Seeding

### Initial Data Seeding
```sql
-- Insert default admin user
INSERT INTO users (id, email, password, name, role, department, position, is_active) 
VALUES (
  UUID(),
  'admin@company.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSyK8m2', -- password: admin123
  'System Administrator',
  'admin',
  'IT',
  'System Admin',
  true
);

-- Insert default settings
INSERT INTO settings (id, `key`, value, description, is_public) VALUES
(UUID(), 'office_location', '{"latitude": -6.2088, "longitude": 106.8456, "address": "Jakarta, Indonesia", "radius": 100}', 'Office location for geofencing', true),
(UUID(), 'work_schedule', '{"check_in_start": "06:00", "check_in_end": "10:00", "check_out_start": "14:00", "check_out_end": "22:00", "work_hours_min": 4, "work_hours_max": 12, "late_tolerance": 15}', 'Work schedule configuration', true),
(UUID(), 'geofencing', '{"enabled": true, "radius_meters": 100, "accuracy_threshold": 10}', 'Geofencing settings', false);
```

### Migration Scripts
```sql
-- Migration: Add overtime_hours column
ALTER TABLE absensi_records 
ADD COLUMN overtime_hours DECIMAL(4, 2) DEFAULT 0.00 AFTER work_hours;

-- Migration: Add late_minutes column
ALTER TABLE absensi_records 
ADD COLUMN late_minutes INT DEFAULT 0 AFTER overtime_hours;

-- Migration: Update existing records
UPDATE absensi_records 
SET overtime_hours = GREATEST(work_hours - 8, 0)
WHERE work_hours > 8;
```

---

## 🔄 Backup & Recovery

### Backup Strategy
```sql
-- Daily full backup
mysqldump --single-transaction --routines --triggers absensi_db > backup_$(date +%Y%m%d).sql

-- Weekly compressed backup
mysqldump --single-transaction --routines --triggers absensi_db | gzip > backup_$(date +%Y%m%d).sql.gz

-- Monthly archive backup
mysqldump --single-transaction --routines --triggers absensi_db | gzip > archive/backup_$(date +%Y%m).sql.gz
```

### Recovery Procedures
```sql
-- Restore from backup
mysql absensi_db < backup_20240101.sql

-- Point-in-time recovery (if binary logging enabled)
mysqlbinlog --start-datetime="2024-01-01 10:00:00" --stop-datetime="2024-01-01 11:00:00" mysql-bin.000001 | mysql absensi_db
```

---

## 📊 Monitoring & Maintenance

### Performance Monitoring
```sql
-- Check slow queries
SELECT * FROM mysql.slow_log 
WHERE start_time > DATE_SUB(NOW(), INTERVAL 1 DAY)
ORDER BY start_time DESC;

-- Check table sizes
SELECT 
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'absensi_db'
ORDER BY (data_length + index_length) DESC;

-- Check index usage
SELECT 
  object_schema,
  object_name,
  index_name,
  count_read,
  count_read / count_star * 100 as pct_read
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE object_schema = 'absensi_db'
ORDER BY count_read DESC;
```

### Maintenance Tasks
```sql
-- Weekly table optimization
OPTIMIZE TABLE users, absensi_records, activity_logs, settings;

-- Monthly index analysis
ANALYZE TABLE users, absensi_records, activity_logs, settings;

-- Quarterly data archiving (if needed)
-- Archive old activity logs (older than 1 year)
-- Archive old absensi records (older than 2 years)
```

---

*Dokumen ini akan diperbarui sesuai dengan perubahan schema dan feedback dari development team.*

