import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const app = express();
const db = new PrismaClient();
const secret = process.env.JWT_SECRET || 'dev-only-change-me';
const stripe = process.env.STRIPE_SECRET_KEY?.startsWith('sk_')
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json());

type AuthRequest = express.Request & { user?: { id: string; email: string; role: string } };
function auth(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\\s+/, '');
    req.user = jwt.verify(token, secret) as { id: string; email: string; role: string };
    next();
  } catch {
    res.status(401).json({ error: 'Please sign in to continue.' });
  }
}
function admin(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required.' });
  next();
}

// Stripe webhook uses the raw request body and must be registered before JSON parsing in production.
// Netlify's function adapter forwards the original body to this route.
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).send('Webhook is not configured');
  let event: Stripe.Event;
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature) return res.status(400).send('Missing Stripe signature');
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await db.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          email: session.customer_details?.email || session.customer_email || 'pending@checkout.rishu',
          stripeSessionId: session.id
        }
      });
    }
  }
  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId) await db.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });
  }
  res.json({ received: true });
});

app.get('/api/health', (_req, res) => res.json({ ok: true, brand: 'RISHU Paris' }));
app.get('/api/products', async (_req, res) => {
  const products = await db.product.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } });
  res.json(products);
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || password.length < 8) return res.status(400).json({ error: 'Enter an email and a password of at least 8 characters.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.user.create({ data: { email: String(email).toLowerCase().trim(), name, passwordHash } });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, secret, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch {
    res.status(409).json({ error: 'An account with this email may already exist.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const user = await db.user.findUnique({ where: { email: String(req.body.email || '').toLowerCase().trim() } });
  if (!user || !await bcrypt.compare(req.body.password || '', user.passwordHash)) return res.status(401).json({ error: 'Invalid email or password.' });
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, secret, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

app.get('/api/orders/mine', auth, async (req: AuthRequest, res) => {
  const orders = await db.order.findMany({
    where: { OR: [{ userId: req.user!.id }, { email: req.user!.email }] },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(orders);
});

// Customer checkout: all prices and product availability are re-read from the database.
app.post('/api/orders/checkout', async (req: AuthRequest, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Payments are not configured yet. Add the Stripe secret key to Netlify.' });
    const items = req.body.items as { productId: string; size: string; quantity: number }[];
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Your bag is empty.' });
    const products = await db.product.findMany({ where: { id: { in: items.map(i => i.productId) }, active: true } });
    if (products.length !== new Set(items.map(i => i.productId)).size) return res.status(400).json({ error: 'A product is unavailable.' });
    const lineItems = items.map(i => {
      const product = products.find(p => p.id === i.productId)!;
      if (!product.availableSizes.includes(i.size) || !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 10) throw new Error('Please check the selected size and quantity.');
      return { product, size: i.size, quantity: i.quantity };
    });
    const total = lineItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
    const order = await db.order.create({
      data: {
        userId: req.user?.id || null,
        email: req.user?.email || 'pending@checkout.rishu',
        status: 'PENDING',
        total,
        items: { create: lineItems.map(i => ({ productId: i.product.id, size: i.size, quantity: i.quantity, unitPrice: i.product.price })) }
      }
    });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems.map(i => ({
        price_data: { currency: 'eur', product_data: { name: `${i.product.name} — ${i.size}`, images: i.product.imageUrl.startsWith('https://') ? [i.product.imageUrl] : undefined }, unit_amount: i.product.price * 100 },
        quantity: i.quantity
      })),
      customer_email: req.user?.email,
      billing_address_collection: 'required',
      shipping_address_collection: { allowed_countries: ['FR', 'BE', 'DE', 'ES', 'IT', 'NL', 'AT', 'PT', 'LU', 'IE'] },
      metadata: { orderId: order.id },
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?checkout=success`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?checkout=cancel`
    });
    await db.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
    res.json({ url: session.url, orderId: order.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Checkout could not be created.' });
  }
});

// Admin: manage the catalogue and review/update orders.
app.get('/api/admin/orders', auth, admin, async (_req, res) => {
  res.json(await db.order.findMany({ include: { items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } }));
});
app.patch('/api/admin/orders/:id', auth, admin, async (req, res) => {
  const allowed = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Invalid order status.' });
  try {
    res.json(await db.order.update({ where: { id: req.params.id }, data: { status: req.body.status } }));
  } catch { res.status(404).json({ error: 'Order not found.' }); }
});
app.post('/api/admin/products', auth, admin, async (req, res) => {
  try { res.status(201).json(await db.product.create({ data: req.body })); }
  catch { res.status(400).json({ error: 'Product could not be created. Check the fields and unique slug.' }); }
});
app.patch('/api/admin/products/:id', auth, admin, async (req, res) => {
  try { res.json(await db.product.update({ where: { id: req.params.id }, data: req.body })); }
  catch { res.status(404).json({ error: 'Product not found.' }); }
});
app.delete('/api/admin/products/:id', auth, admin, async (req, res) => {
  try { res.json(await db.product.update({ where: { id: req.params.id }, data: { active: false } })); }
  catch { res.status(404).json({ error: 'Product not found.' }); }
});

if (process.env.NETLIFY !== 'true') {
  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => console.log(`RISHU API listening on ${port}`));
}
export default app;
