# 🔧 Technical Specifications - Absensi Standalone

## 🏗️ System Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   (MySQL)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser       │    │   External      │    │   File Storage  │
│   (PWA)         │    │   Services      │    │   (Reports)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack Details

#### Frontend Stack
```typescript
// Core Framework
- Next.js 15 (App Router)
- TypeScript 5.0+
- React 18+

// Styling & UI
- Tailwind CSS 3.4+
- shadcn/ui components
- Radix UI primitives
- Framer Motion (animations)

// State Management
- Zustand (global state)
- React Query (server state)
- React Hook Form (forms)

// Maps & Location
- Leaflet
- leaflet (npm package)
- Geolocation API

// Utilities
- date-fns (date manipulation)
- zod (validation)
- clsx (conditional classes)
```

#### Backend Stack
```typescript
// API Layer
- Next.js API Routes
- NextAuth.js (authentication)
- Prisma ORM
- Zod (validation)

// Database
- MySQL 8.0+
- Prisma Client
- Connection pooling

// External Services
- OpenStreetMap Nominatim API
- Email service (SendGrid/Resend)
- File storage (AWS S3/Vercel Blob)

// Security
- bcrypt (password hashing)
- JWT tokens
- CORS configuration
- Rate limiting
```

## 🗄️ Database Design

### Core Tables

#### Users Table
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
  
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_department (department),
  INDEX idx_is_active (is_active)
);
```

#### Absensi Records Table
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
  status ENUM('present', 'late', 'absent', 'half_day') NOT NULL DEFAULT 'absent',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, date),
  INDEX idx_date (date),
  INDEX idx_status (status),
  INDEX idx_check_in_time (check_in_time),
  UNIQUE KEY unique_user_date (user_id, date)
);
```

#### Activity Logs Table
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
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created_at (created_at)
);
```

#### Settings Table
```sql
CREATE TABLE settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSON NOT NULL,
  description TEXT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_key (key),
  INDEX idx_is_public (is_public)
);
```

## 🔐 Authentication & Authorization

### Authentication Flow
```typescript
// NextAuth.js Configuration
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Validate credentials against database
        // Return user object or null
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      // Add user role and permissions to token
      return token;
    },
    async session({ session, token }) {
      // Add user data to session
      return session;
    }
  }
};
```

### Role-Based Access Control
```typescript
// Permission System
enum Permission {
  // User Management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  
  // Absensi Management
  ABSENSI_CREATE = 'absensi:create',
  ABSENSI_READ = 'absensi:read',
  ABSENSI_UPDATE = 'absensi:update',
  ABSENSI_DELETE = 'absensi:delete',
  
  // Reports
  REPORT_READ = 'report:read',
  REPORT_EXPORT = 'report:export',
  
  // Settings
  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update'
}

// Role Permissions Mapping
const rolePermissions = {
  admin: Object.values(Permission),
  manager: [
    Permission.USER_READ,
    Permission.ABSENSI_CREATE,
    Permission.ABSENSI_READ,
    Permission.ABSENSI_UPDATE,
    Permission.REPORT_READ,
    Permission.REPORT_EXPORT
  ],
  user: [
    Permission.ABSENSI_CREATE,
    Permission.ABSENSI_READ,
    Permission.REPORT_READ
  ]
};
```

## 📍 Location Services

### GPS Integration
```typescript
// Location Service Interface
interface LocationService {
  getCurrentPosition(): Promise<LocationData>;
  validateLocation(location: LocationData): Promise<boolean>;
  reverseGeocode(lat: number, lng: number): Promise<string>;
  calculateDistance(loc1: LocationData, loc2: LocationData): number;
}

// Location Data Structure
interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  accuracy: number;
  timestamp: Date;
  altitude?: number;
  heading?: number;
  speed?: number;
}

// Geofencing Configuration
interface GeofenceConfig {
  center: {
    latitude: number;
    longitude: number;
  };
  radius: number; // in meters
  tolerance: number; // accuracy tolerance
}
```

### Location Validation Logic
```typescript
// Location Validation Rules
const validateLocation = (location: LocationData, config: GeofenceConfig): boolean => {
  const distance = calculateDistance(
    location,
    { latitude: config.center.latitude, longitude: config.center.longitude }
  );
  
  return distance <= config.radius && 
         location.accuracy <= config.tolerance;
};
```

## 🚀 Performance Requirements

### Response Time Targets
- **Page Load**: < 2 seconds
- **API Response**: < 500ms
- **GPS Location**: < 5 seconds
- **Report Generation**: < 10 seconds
- **Data Export**: < 30 seconds

### Scalability Targets
- **Concurrent Users**: 1000+
- **Database Records**: 1M+ absensi records
- **File Storage**: 10GB+ reports
- **API Requests**: 10K+ per hour

### Optimization Strategies
```typescript
// Database Optimization
- Proper indexing on frequently queried columns
- Connection pooling (max 20 connections)
- Query optimization with EXPLAIN
- Pagination for large datasets

// Frontend Optimization
- Code splitting with dynamic imports
- Image optimization with Next.js Image
- Caching with React Query
- Service Worker for offline support

// API Optimization
- Response caching with Redis
- Rate limiting (100 req/min per user)
- Request compression (gzip)
- CDN for static assets
```

## 🔒 Security Specifications

### Data Encryption
```typescript
// Encryption at Rest
- Database: AES-256 encryption
- File Storage: Server-side encryption
- Backup: Encrypted backups

// Encryption in Transit
- HTTPS/TLS 1.3 for all communications
- Secure WebSocket connections
- API authentication with JWT

// Password Security
- bcrypt with salt rounds: 12
- Password policy: min 8 chars, mixed case, numbers
- Account lockout after 5 failed attempts
```

### Security Headers
```typescript
// Security Headers Configuration
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'"
};
```

## 📱 Mobile & PWA Specifications

### PWA Configuration
```json
{
  "name": "Absensi Standalone",
  "short_name": "Absensi",
  "description": "Employee attendance management system",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Offline Capabilities
```typescript
// Service Worker Strategy
- Cache first for static assets
- Network first for API calls
- Background sync for check-in/out
- Offline indicator UI

// Offline Data Storage
- IndexedDB for local data
- LocalStorage for user preferences
- Cache API for static resources
```

## 🧪 Testing Strategy

### Testing Pyramid
```
    ┌─────────────────┐
    │   E2E Tests     │ ← 10% (Critical user flows)
    ├─────────────────┤
    │ Integration     │ ← 20% (API & component integration)
    ├─────────────────┤
    │ Unit Tests      │ ← 70% (Functions & components)
    └─────────────────┘
```

### Test Coverage Targets
- **Unit Tests**: 90%+ coverage
- **Integration Tests**: 80%+ coverage
- **E2E Tests**: 100% critical paths

### Testing Tools
```typescript
// Testing Stack
- Jest (unit testing)
- React Testing Library (component testing)
- Playwright (E2E testing)
- MSW (API mocking)
- Testing Library (accessibility testing)
```

## 📊 Monitoring & Logging

### Application Monitoring
```typescript
// Metrics to Track
- Response times
- Error rates
- User activity
- GPS accuracy
- Database performance

// Tools
- Vercel Analytics
- Sentry (error tracking)
- LogRocket (session replay)
- Custom dashboards
```

### Logging Strategy
```typescript
// Log Levels
- ERROR: System errors, exceptions
- WARN: Performance issues, deprecated usage
- INFO: User actions, business events
- DEBUG: Development debugging

// Log Format
{
  timestamp: "2024-01-01T00:00:00Z",
  level: "INFO",
  message: "User checked in",
  userId: "user-123",
  action: "check_in",
  metadata: { location: {...}, device: "mobile" }
}
```

## 🚀 Deployment Strategy

### Environment Configuration
```typescript
// Environment Variables
DATABASE_URL="mysql://user:pass@host:port/db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://your-domain.com"
SENDGRID_API_KEY="your-sendgrid-key"
```

### Deployment Pipeline
```
Development → Staging → Production
     ↓           ↓         ↓
   Local     Vercel    Vercel
  Testing    Preview   Production
```

### CI/CD Configuration
```yaml
# GitHub Actions Workflow
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run build
      - uses: vercel/action@v1
```

---

*Dokumen ini akan diperbarui sesuai dengan perubahan teknis dan feedback dari development team.*

