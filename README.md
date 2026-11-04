# RISHU Paris — Clothing Store
A clothing-only, full-stack e-commerce starter inspired by the supplied RISHU boutique photo.
Identity: deep forest green `#102D23`, warm ivory `#F7F5EF`, champagne gold `#B69A62`,
editorial serif logo and restrained Parisian styling. No café or food section.

## Stack
- Frontend: React, Vite, TypeScript
- Backend: Express, TypeScript
- Database: PostgreSQL + Prisma
- Auth: JWT + bcrypt
- Payments: Stripe Checkout (test-mode setup)

## Run locally
Requirements: Node.js 20+ and PostgreSQL.

Backend:
```bash
cd backend
cp .env.example .env
# Set DATABASE_URL and JWT_SECRET
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```
Frontend (new terminal):
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Frontend: http://localhost:5173 | API: http://localhost:4000

## Admin
Register an account, then change its `role` to `ADMIN` in PostgreSQL. Admin routes require a valid JWT.
## Before launch
Replace sample product photos/details with your own catalogue, add business/legal details, shipping and returns
policy, privacy policy, VAT/tax setup, production secrets, Stripe webhooks, HTTPS, backups and email delivery.
This is a runnable starter project, not a deployed live shop.
