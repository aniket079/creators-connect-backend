# CreatorConnect Backend

CreatorConnect is an Express + MongoDB backend for a creator marketplace: users can publish digital or physical assets, buy tokens, purchase creator assets, chat in real time, and receive personalized recommendations with optional AI enrichment.

## What It Powers

- Cookie-based authentication with JWT
- OTP email flow with Resend
- Creator profiles and public artist pages
- Asset upload and management with Cloudinary
- Digital and physical asset purchases with Razorpay
- Signed download links for purchased digital assets
- Real-time chat with Socket.IO
- Token deduction for chat messages
- Redis-backed Socket.IO scaling when Redis is available
- Recommendation engine based on user activity
- Optional AI recommendation reranking/reasons through Groq or xAI

## Tech Stack

- Node.js 22+
- Express 5
- MongoDB + Mongoose
- Socket.IO
- Redis
- Cloudinary
- Razorpay
- Resend
- Groq or xAI for optional AI recommendation enrichment

## Project Structure

```txt
src/
  config/          Database, Redis, Cloudinary, Razorpay config
  contollers/      Route handlers
  middleware/      Auth and upload middleware
  models/          Mongoose models
  routes/          Express route modules
  services/        Business logic
  socket/          Socket.IO chat server
  utils/           Shared helpers
  server.js        App entrypoint
```

## Quick Start

Install dependencies:

```bash
npm install
```

Create an env file:

```bash
cp .env.example .env
```

Fill in the required values, then run:

```bash
npm start
```

Health check:

```txt
GET /health
```

Expected response:

```json
{ "status": "ok" }
```

## Environment Variables

Required for core app:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=
JWT_SECRET=
CLIENT_URL=http://localhost:5173
SOCKET_CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

Uploads:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Payments:

```env
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

Email:

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=CreatorConnect <onboarding@resend.dev>
```

Redis:

```env
REDIS_URL=redis://localhost:6379
```

AI recommendations are optional. Use Groq:

```env
AI_RECOMMENDATION_PROVIDER=groq
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b
```

Or xAI:

```env
AI_RECOMMENDATION_PROVIDER=xai
XAI_API_KEY=
XAI_MODEL=grok-4.3
```

Do not commit real `.env` files or API keys.

## Scripts

```bash
npm start
```

Starts the API server.

```bash
npm run seed:test
```

Seeds plans, users, assets, orders, and recommendation activity for local testing.

Seeded users use this password by default:

```txt
Test@12345
```

You can override it:

```env
SEED_USER_PASSWORD=YourPassword123
```

## API Routes

Base path:

```txt
/api
```

Main route groups:

```txt
/auth
/assets
/artists
/chat
/payment
/plans
/purchases
/recommendations
/users
/webhook
```

Recommendation endpoints:

```txt
POST /api/recommendations/activity
GET  /api/recommendations/assets?limit=6
GET  /api/recommendations/creators?limit=5
```

Optional AI enrichment:

```txt
GET /api/recommendations/assets?limit=6&ai=true
GET /api/recommendations/creators?limit=5&ai=true
```

If AI is not configured or the provider fails, the backend falls back to normal recommendations.

## Recommendation Flow

The app stores user actions in `UserActivity`:

```txt
view
like
save
purchase
message
```

The recommendation service uses:

```txt
category
profession
location
popularity
purchase history
```

Then, if `ai=true`, Groq or xAI can rerank the results and add a short `aiReason` for each item.

## Real-Time Chat

Socket.IO handles:

```txt
register
typing
send_message
mark_read
```

Each valid `send_message` deducts one token from the sender. Token deduction is atomic, so concurrent sends cannot push a user below zero.

Redis is optional locally. If Redis is connected, Socket.IO uses the Redis adapter so multiple backend instances can deliver messages across processes. If Redis is unavailable, the server continues without distributed socket scaling.

## Deployment Checklist

Before deploying:

- Set `NODE_ENV=production`
- Set a strong `JWT_SECRET`
- Set production `MONGO_URI`
- Set frontend domain in `CLIENT_URL`
- Set `SOCKET_CORS_ORIGINS`
- Set `COOKIE_DOMAIN` if frontend and backend use different subdomains
- Configure Cloudinary credentials
- Configure Razorpay keys and webhook secret
- Configure Resend if OTP emails are enabled
- Configure `REDIS_URL` if running multiple backend instances
- Add `GROQ_API_KEY` or `XAI_API_KEY` only if AI recommendations should run
- Confirm `.env` is not committed

Recommended start command:

```bash
npm start
```

Runtime requirement:

```txt
Node >=22 <25
```

## Local Verification

1. Run the seed script:

```bash
npm run seed:test
```

2. Start the backend:

```bash
npm start
```

3. Log in from the frontend with a seeded user.

4. Check recommendations:

```txt
GET /api/recommendations/assets?limit=6&ai=true
GET /api/recommendations/creators?limit=5&ai=true
```

5. Open an asset or artist profile and confirm new records appear in `useractivities`.

## Notes

- The folder name `contollers` is currently used by the codebase. Keep imports consistent unless you intentionally rename the directory across the project.
- `.env.example` is a template only. Real keys belong in `.env` or your deployment platform secret manager.
- AI calls may incur provider costs. Normal recommendations work without AI.
