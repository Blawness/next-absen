# 🚀 Development Workflow & Best Practices - Absensi Standalone

## 📋 Development Overview

### Development Philosophy
1. **Quality First**: Code quality dan testing adalah prioritas utama
2. **Collaborative**: Team collaboration dan knowledge sharing
3. **Iterative**: Development berbasis feedback dan continuous improvement
4. **Documentation**: Comprehensive documentation untuk maintainability
5. **Security**: Security-first approach dalam setiap development

### Development Principles
- **Clean Code**: Readable, maintainable, dan well-structured code
- **Test-Driven Development**: Write tests before implementation
- **Code Review**: All code must be reviewed before merging
- **Continuous Integration**: Automated testing dan deployment
- **Performance**: Optimize for speed dan efficiency

---

## 🏗️ Project Structure

### Directory Structure
```
project-absensi/
├── .github/                 # GitHub workflows dan templates
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── cd.yml
│   │   └── security.yml
│   └── ISSUE_TEMPLATE/
├── docs/                    # Documentation
│   ├── 01-project-overview.md
│   ├── 02-technical-specifications.md
│   ├── 03-feature-requirements.md
│   ├── 04-database-schema.md
│   ├── 05-api-specifications.md
│   ├── 06-ui-ux-guidelines.md
│   └── 07-development-workflow.md
├── src/                     # Source code
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/          # Auth routes
│   │   ├── (dashboard)/     # Dashboard routes
│   │   ├── api/             # API routes
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/          # Reusable components
│   │   ├── ui/              # Base UI components
│   │   ├── forms/           # Form components
│   │   ├── layout/          # Layout components
│   │   └── features/        # Feature-specific components
│   ├── lib/                 # Utilities dan configurations
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── utils.ts
│   │   └── validations.ts
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript type definitions
│   ├── constants/           # Application constants
│   └── styles/              # Global styles
├── prisma/                  # Database schema dan migrations
│   ├── schema.prisma
│   └── migrations/
├── public/                  # Static assets
│   ├── icons/
│   ├── images/
│   └── manifest.json
├── tests/                   # Test files
│   ├── __mocks__/
│   ├── components/
│   ├── pages/
│   └── utils/
├── .env.local              # Environment variables
├── .env.example            # Environment template
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── jest.config.js
├── next.config.js
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

### File Naming Conventions
```
# Components
- PascalCase: UserProfile.tsx, AttendanceCard.tsx
- Index files: index.tsx
- Types: types.ts, interfaces.ts

# Pages
- kebab-case: attendance-records.tsx, user-management.tsx
- Route groups: (auth), (dashboard)

# Utilities
- camelCase: formatDate.ts, validateInput.ts
- Constants: UPPER_SNAKE_CASE: API_ENDPOINTS.ts

# Tests
- Component tests: UserProfile.test.tsx
- Integration tests: attendance.test.ts
- E2E tests: attendance-flow.spec.ts
```

---

## 🔧 Development Environment Setup

### Prerequisites
```bash
# Required software
- Node.js 18.17+ (LTS)
- npm 9.0+ atau yarn 1.22+
- MySQL 8.0+
- Git 2.30+

# Recommended tools
- VS Code dengan extensions
- Postman untuk API testing
- MySQL Workbench untuk database management
```

### Environment Setup
```bash
# 1. Clone repository
git clone https://github.com/company/absensi-standalone.git
cd absensi-standalone

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env.local
# Edit .env.local dengan konfigurasi yang sesuai

# 4. Setup database
npx prisma migrate dev
npx prisma db seed

# 5. Start development server
npm run dev
```

### Environment Variables
```bash
# Database
DATABASE_URL="mysql://user:password@localhost:3306/absensi_db"

# Authentication
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# External APIs
SENDGRID_API_KEY="your-sendgrid-api-key"

# Application
NODE_ENV="development"
PORT=3000
```

---

## 🛠️ Development Tools & Configuration

### Code Editor Setup (VS Code)
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

### Recommended Extensions
```json
// .vscode/extensions.json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "prisma.prisma",
    "ms-vscode.vscode-json",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-github-actions"
  ]
}
```

### ESLint Configuration
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error",
    "no-var": "error",
    "no-console": "warn",
    "react-hooks/exhaustive-deps": "warn"
  },
  "ignorePatterns": ["node_modules/", ".next/", "out/"]
}
```

### Prettier Configuration
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "endOfLine": "lf"
}
```

### TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

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

### Testing Tools
```json
// package.json testing dependencies
{
  "devDependencies": {
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@playwright/test": "^1.40.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0",
    "msw": "^2.0.0"
  }
}
```

### Jest Configuration
```javascript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
```

### Test Examples

#### Unit Test Example
```typescript
// src/lib/utils.test.ts
import { formatDate, calculateWorkHours } from './utils';

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2024-01-01T08:00:00Z');
    expect(formatDate(date)).toBe('01/01/2024');
  });
});

describe('calculateWorkHours', () => {
  it('should calculate work hours correctly', () => {
    const checkIn = new Date('2024-01-01T08:00:00Z');
    const checkOut = new Date('2024-01-01T17:00:00Z');
    expect(calculateWorkHours(checkIn, checkOut)).toBe(9);
  });
});
```

#### Component Test Example
```typescript
// src/components/AttendanceCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AttendanceCard } from './AttendanceCard';

const mockUser = {
  id: '1',
  name: 'John Doe',
  position: 'Developer',
};

const mockRecord = {
  id: '1',
  status: 'present',
  workHours: 8,
  checkInTime: new Date('2024-01-01T08:00:00Z'),
};

describe('AttendanceCard', () => {
  it('renders user information correctly', () => {
    render(
      <AttendanceCard
        user={mockUser}
        record={mockRecord}
        onCheckIn={jest.fn()}
        onCheckOut={jest.fn()}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  it('calls onCheckIn when check in button is clicked', () => {
    const mockOnCheckIn = jest.fn();
    render(
      <AttendanceCard
        user={mockUser}
        record={{ ...mockRecord, checkInTime: null }}
        onCheckIn={mockOnCheckIn}
        onCheckOut={jest.fn()}
      />
    );

    fireEvent.click(screen.getByText('Check In'));
    expect(mockOnCheckIn).toHaveBeenCalledTimes(1);
  });
});
```

#### Integration Test Example
```typescript
// tests/api/attendance.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '../../src/app/api/attendance/check-in/route';

describe('/api/attendance/check-in', () => {
  it('should create attendance record on check-in', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        latitude: -6.2088,
        longitude: 106.8456,
        accuracy: 5.2,
        address: 'Office Building',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    expect(JSON.parse(res._getData())).toMatchObject({
      success: true,
      data: {
        record: expect.objectContaining({
          checkInTime: expect.any(String),
          status: 'present',
        }),
      },
    });
  });
});
```

#### E2E Test Example
```typescript
// tests/e2e/attendance-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Attendance Flow', () => {
  test('user can check in and check out', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'user@company.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');

    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard');

    // Check in
    await page.click('[data-testid=check-in-button]');
    await expect(page.locator('[data-testid=check-in-success]')).toBeVisible();

    // Check out
    await page.click('[data-testid=check-out-button]');
    await expect(page.locator('[data-testid=check-out-success]')).toBeVisible();
  });
});
```

---

## 🔄 Git Workflow

### Branch Strategy
```
main                    # Production branch
├── develop            # Development branch
├── feature/           # Feature branches
│   ├── feature/auth-system
│   ├── feature/gps-tracking
│   └── feature/reporting
├── hotfix/            # Hotfix branches
│   └── hotfix/security-patch
└── release/           # Release branches
    └── release/v1.0.0
```

### Commit Convention
```bash
# Format: type(scope): description
# Types: feat, fix, docs, style, refactor, test, chore

# Examples:
feat(auth): add login functionality
fix(gps): resolve location accuracy issue
docs(api): update authentication endpoints
style(ui): improve button hover effects
refactor(db): optimize attendance queries
test(auth): add unit tests for login
chore(deps): update dependencies
```

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Tests pass locally
```

### Code Review Guidelines
```markdown
## Review Checklist

### Code Quality
- [ ] Code is readable and well-structured
- [ ] Functions are small and focused
- [ ] No code duplication
- [ ] Error handling is appropriate
- [ ] Performance considerations addressed

### Security
- [ ] No sensitive data exposed
- [ ] Input validation implemented
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection

### Testing
- [ ] Adequate test coverage
- [ ] Tests are meaningful and not flaky
- [ ] Edge cases covered
- [ ] Error scenarios tested

### Documentation
- [ ] Code is self-documenting
- [ ] Complex logic is commented
- [ ] API documentation updated
- [ ] README updated if needed
```

---

## 🚀 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: .next/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Environment Configuration
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
      - name: Deploy to Staging
        run: |
          echo "Deploying to staging environment"
          # Staging deployment commands
      
  deploy-production:
    runs-on: ubuntu-latest
    environment: production
    needs: deploy-staging
    
    steps:
      - name: Deploy to Production
        run: |
          echo "Deploying to production environment"
          # Production deployment commands
```

---

## 📊 Code Quality & Monitoring

### Code Quality Tools
```json
// package.json scripts
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "build": "next build",
    "start": "next start",
    "dev": "next dev"
  }
}
```

### Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### Performance Monitoring
```typescript
// src/lib/analytics.ts
import { Analytics } from '@vercel/analytics/react';

export const trackEvent = (event: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined') {
    Analytics.track(event, properties);
  }
};

// Usage in components
const handleCheckIn = async () => {
  try {
    await checkIn(locationData);
    trackEvent('check_in_success', {
      location: locationData.address,
      accuracy: locationData.accuracy,
    });
  } catch (error) {
    trackEvent('check_in_error', {
      error: error.message,
    });
  }
};
```

---

## 🔒 Security Best Practices

### Security Checklist
```markdown
## Security Review Checklist

### Authentication & Authorization
- [ ] JWT tokens properly implemented
- [ ] Password hashing with bcrypt
- [ ] Session management secure
- [ ] Role-based access control
- [ ] Account lockout mechanism

### Input Validation
- [ ] All inputs validated
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] File upload validation

### Data Protection
- [ ] Sensitive data encrypted
- [ ] Environment variables secure
- [ ] Database credentials protected
- [ ] API keys secured
- [ ] PII data handling

### Network Security
- [ ] HTTPS enforced
- [ ] Security headers set
- [ ] CORS configured
- [ ] Rate limiting implemented
- [ ] Request size limits
```

### Security Headers
```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

---

## 📚 Documentation Standards

### Code Documentation
```typescript
/**
 * Calculates work hours between check-in and check-out times
 * @param checkIn - Check-in timestamp
 * @param checkOut - Check-out timestamp
 * @returns Work hours as decimal number
 * @example
 * const workHours = calculateWorkHours(
 *   new Date('2024-01-01T08:00:00Z'),
 *   new Date('2024-01-01T17:00:00Z')
 * ); // Returns 9
 */
export const calculateWorkHours = (
  checkIn: Date,
  checkOut: Date
): number => {
  const diffInMs = checkOut.getTime() - checkIn.getTime();
  return diffInMs / (1000 * 60 * 60); // Convert to hours
};
```

### API Documentation
```typescript
/**
 * @api {post} /api/attendance/check-in Check In
 * @apiName CheckIn
 * @apiGroup Attendance
 * @apiVersion 1.0.0
 * 
 * @apiDescription User check-in with GPS location
 * 
 * @apiParam {Number} latitude GPS latitude
 * @apiParam {Number} longitude GPS longitude
 * @apiParam {Number} accuracy GPS accuracy in meters
 * @apiParam {String} address Reverse geocoded address
 * 
 * @apiSuccess {Boolean} success Success status
 * @apiSuccess {Object} data Response data
 * @apiSuccess {Object} data.record Attendance record
 * @apiSuccess {String} data.record.id Record ID
 * @apiSuccess {String} data.record.status Attendance status
 * 
 * @apiError {String} error Error message
 * @apiError {String} error.code Error code
 */
```

### README Template
```markdown
# Absensi Standalone

## Quick Start

### Prerequisites
- Node.js 18.17+
- MySQL 8.0+

### Installation
```bash
npm install
npm run dev
```

## Development

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Run linting

### Environment Variables
Copy `.env.example` to `.env.local` and configure:
- `DATABASE_URL` - MySQL connection string
- `NEXTAUTH_SECRET` - JWT secret key

## Contributing
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License
MIT License
```

---

## 🎯 Performance Optimization

### Performance Checklist
```markdown
## Performance Optimization Checklist

### Frontend
- [ ] Code splitting implemented
- [ ] Image optimization
- [ ] Bundle size optimized
- [ ] Lazy loading implemented
- [ ] Caching strategy

### Backend
- [ ] Database queries optimized
- [ ] Connection pooling
- [ ] Response compression
- [ ] Caching implemented
- [ ] Rate limiting

### Infrastructure
- [ ] CDN configured
- [ ] Static assets optimized
- [ ] Monitoring setup
- [ ] Error tracking
- [ ] Performance metrics
```

### Performance Monitoring
```typescript
// src/lib/performance.ts
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`${name} took ${end - start} milliseconds`);
};

// Usage
measurePerformance('Check-in API call', () => {
  checkIn(locationData);
});
```

---

## 🐛 Debugging & Troubleshooting

### Debug Configuration
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/next/dist/bin/next",
      "args": ["dev"],
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

### Common Issues & Solutions
```markdown
## Common Issues

### GPS Location Not Working
- Check browser permissions
- Verify HTTPS connection
- Test on different devices
- Check geolocation API support

### Database Connection Issues
- Verify DATABASE_URL format
- Check MySQL service status
- Verify user permissions
- Check network connectivity

### Build Failures
- Clear .next directory
- Delete node_modules and reinstall
- Check TypeScript errors
- Verify environment variables
```

---

*Dokumen ini akan diperbarui sesuai dengan perubahan development practices dan feedback dari development team.*






