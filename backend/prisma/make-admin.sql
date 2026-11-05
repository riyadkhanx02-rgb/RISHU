-- Run once in your PostgreSQL database after registering your own customer account.
-- Replace the email with the exact email used at registration.
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your-admin-email@example.com';
