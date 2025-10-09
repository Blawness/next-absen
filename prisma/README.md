# Database Seeding

This directory contains the database seed file for the Next.js attendance application.

## Demo Accounts

The seed file creates the following demo accounts for testing:

### Admin Account
- **Email:** admin@demo.com
- **Password:** password123
- **Role:** admin
- **Department:** IT
- **Position:** System Administrator

### Manager Accounts
- **Email:** manager@demo.com (HR Manager)
- **Password:** password123
- **Role:** manager
- **Department:** Human Resources

- **Email:** manager2@demo.com (Finance Manager)
- **Password:** password123
- **Role:** manager
- **Department:** Finance

### Employee Accounts
- **user1@demo.com** - Finance/Accounting
- **user2@demo.com** - Marketing
- **user3@demo.com** - Operations
- **user4@demo.com** - Sales
- **user5@demo.com** - IT/Software Developer

All demo accounts use the password: **password123**

## Running the Seed

### Option 1: Using npm script (Recommended)
```bash
npm run db:seed
```

### Option 2: Using Prisma CLI
```bash
npx prisma db seed
```

### Option 3: Direct execution
```bash
node seed-runner.mjs
```

### Option 4: Manual execution
```bash
npx tsx prisma/seed.ts
```

## What the seed creates

1. **8 demo users** with different roles and departments
2. **Activity logs** for demonstration purposes
3. All passwords are hashed using bcryptjs

## Prerequisites

Before running the seed, make sure:

1. **Database is set up**: Your MySQL database is running and accessible
2. **Environment variables**: Your `.env` file contains the correct `DATABASE_URL`
3. **Database schema**: Run `npx prisma db push` or `npx prisma migrate dev` to create the database tables

## Notes

- The seed uses `upsert` operations, so it's safe to run multiple times
- Existing users with the same email will be updated, new ones will be created
- Make sure your database is running and accessible before running the seed

## Troubleshooting

If you get a `DATABASE_URL` error:
1. Check your `.env` file has the correct database URL
2. Make sure your MySQL server is running
3. Run `npx prisma db push` to sync the schema with your database
