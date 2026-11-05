# RISHU Paris — Old Money Menswear

Premium forest green, warm ivory and champagne gold storefront for RISHU Paris.

## Included
- Responsive storefront and collection/category filters
- 20 polo shirts, 20 T-shirts, plus trousers, shirts, long coats, jeans, shorts, caps, sunglasses and shoes
- Product quick view, size selection and shopping bag
- Customer registration, sign-in and order history
- Admin product create/edit/archive and order list/status management
- Express API, Prisma/PostgreSQL schema, JWT + bcrypt authentication
- Stripe Checkout and payment webhook support
- Netlify Functions API adapter and SPA routing

## Deploy to Netlify
1. Push this repository to GitHub and import it in Netlify.
2. Netlify reads `netlify.toml`. The frontend is built from `frontend/`; the Express API runs as a Netlify Function.
3. Create a PostgreSQL database (for example Neon or Supabase) and add these Netlify environment variables: `DATABASE_URL`, `JWT_SECRET` (long random value), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `FRONTEND_URL` (your final Netlify site URL).
4. Trigger a deploy. The build installs backend dependencies, generates Prisma Client, and builds the storefront.
5. Run the Prisma migration and product seed against the production database from a trusted local terminal:
   ```bash
   cd backend
   cp .env.example .env
   # Set DATABASE_URL and other real credentials in .env
   npm install
   npx prisma migrate deploy
   npm run seed
   ```
   The database must be migrated before the API can serve products.
6. In Stripe, create a webhook pointing to `https://YOUR-SITE.netlify.app/api/webhooks/stripe` and subscribe to `checkout.session.completed` and `checkout.session.expired`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
7. Register your own account on the storefront. Promote it to admin by running the SQL in `backend/prisma/make-admin.sql` with your real email. Sign out and sign in again; the Admin icon will appear.

## Local development
- Backend: `cd backend && cp .env.example .env && npm install && npx prisma generate && npx prisma migrate dev --name init && npm run seed && npm run dev`
- Frontend: `cd frontend && npm install && npm run dev`
- Vite proxies `/api` to the local Express server at port 4000.

## Important launch checklist
This is a deployable starter, not a production business setup. Before taking live payments, use Stripe live credentials, configure webhook signing, confirm shipping regions/rates, returns and privacy policies, French/EU VAT and consumer-law requirements, secure database backups, and replace sample catalogue photography with licensed product photos. Use a strong unique JWT secret. Netlify hosts the frontend and API function; PostgreSQL and Stripe remain external services.
