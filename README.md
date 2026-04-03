# TOPUP with python

Premium Python learning platform with a plain HTML/CSS/JavaScript frontend, FastAPI backend, JWT authentication, premium content gating, OPay payment flow, and Neon-ready database support.

Tagline: `Let's go pro`

## What is included

- Premium multi-page frontend built with HTML, CSS, and vanilla JavaScript
- Login and signup with frontend and backend validation
- FastAPI API with JWT auth and bcrypt password hashing
- Free tutorials vs premium tutorials
- Payment flow for OPay with a demo fallback for first-round testing
- Metrics/event collection for future product analytics
- SQLite support for demo and Neon PostgreSQL support for deployment
- Vercel-ready monorepo layout

## Project structure

```text
.
|-- api/
|   `-- index.py
|-- backend/
|   `-- app/
|       |-- config.py
|       |-- content.py
|       |-- database.py
|       |-- main.py
|       |-- models.py
|       |-- schemas.py
|       |-- security.py
|       `-- services/
|           `-- opay.py
|-- app.js
|-- .env.example
|-- demo-checkout.html
|-- favicon.svg
|-- index.html
|-- login.html
|-- package.json
|-- payment-return.html
|-- premium.html
|-- requirements.txt
|-- signup.html
|-- styles.css
|-- tutorial.html
|-- tutorials.html
|-- vercel.json
`-- vite.config.js
```

## Database schema

### `users`

- `id`
- `username`
- `email`
- `hashed_password`
- `is_premium`
- `created_at`

### `payments`

- `id`
- `user_id`
- `reference`
- `amount`
- `currency`
- `status`
- `provider`
- `mode`
- `order_no`
- `checkout_url`
- `last_payload`
- `date`
- `updated_at`

### `analytics_events`

- `id`
- `user_id`
- `event_name`
- `page`
- `tutorial_slug`
- `properties`
- `created_at`

## Environment variables

Copy `.env.example` to `.env` and update values.

```env
DATABASE_URL=sqlite:///./topup_with_python.db
JWT_SECRET_KEY=change-this-before-deploy
CORS_ORIGINS=http://localhost:4173,http://127.0.0.1:4173,http://localhost:5173,http://127.0.0.1:5173
PUBLIC_APP_URL=http://localhost:4173
OPAY_ENV=demo
OPAY_MERCHANT_ID=
OPAY_PUBLIC_KEY=
OPAY_PRIVATE_KEY=
OPAY_COUNTRY=NG
OPAY_CURRENCY=NGN
PREMIUM_PRICE_MINOR=90000
```

For Neon, replace `DATABASE_URL` with your pooled PostgreSQL connection string.

## Local development

### 1. Backend

Create a virtual environment, install dependencies, and run FastAPI:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.app.main:app --reload
```

Backend base URL:

```text
http://127.0.0.1:8000
```

### 2. Frontend

Serve the static HTML files locally:

```bash
python -m http.server 4173
```

Frontend URL:

```text
http://127.0.0.1:4173
```

The shared frontend logic lives in `app.js`, and the styling lives in `styles.css`.

## Payment flow

### Demo mode

Set `OPAY_ENV=demo`.

What happens:

1. User signs up or logs in
2. User opens the premium page
3. Backend creates a pending payment record
4. Frontend redirects to a local demo checkout page
5. You simulate success or failure
6. On success, `is_premium=True` is applied to the user

This is the fastest way to test the premium unlock before real OPay credentials are added.

### Live OPay mode

Set:

- `OPAY_ENV=live`
- `OPAY_MERCHANT_ID`
- `OPAY_PUBLIC_KEY`
- `OPAY_PRIVATE_KEY`
- `PUBLIC_APP_URL`

The backend will then:

1. Create an OPay cashier session
2. Redirect the user to the hosted cashier page
3. Receive the callback on `/payments/opay/callback`
4. Query payment status with OPay
5. Mark the user as premium when payment is successful

## Metrics collected over time

The platform already records events such as:

- Page views
- Signup success/failure
- Login success/failure
- Locked tutorial clicks
- Tutorial opens
- Payment starts
- Demo payment success/failure

You can use this table later for dashboards, funnels, retention reports, and content engagement analysis with Pandas.

## Deploying to Vercel

### Frontend + backend from one repo

This repo is set up so:

- Static `.html` pages are served directly by Vercel
- `app.js` handles auth, tutorials, and payment flow in vanilla JavaScript
- `api/index.py` exposes the FastAPI application for Vercel Python Functions

### Recommended deployment steps

1. Push this repository to GitHub.
2. Create a Neon project and copy the pooled connection string.
3. Import the repository into Vercel.
4. Add these environment variables in Vercel:

```text
DATABASE_URL=your_neon_pooled_connection_string
JWT_SECRET_KEY=your_secure_secret
CORS_ORIGINS=https://your-frontend-domain.vercel.app
PUBLIC_APP_URL=https://your-frontend-domain.vercel.app
OPAY_ENV=demo
OPAY_MERCHANT_ID=...
OPAY_PUBLIC_KEY=...
OPAY_PRIVATE_KEY=...
OPAY_COUNTRY=NG
OPAY_CURRENCY=NGN
PREMIUM_PRICE_MINOR=90000
```

5. Deploy once in `demo` mode and test the full premium unlock flow.
6. After successful testing, switch `OPAY_ENV` to `live` and add live OPay credentials.

## Main API endpoints

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Tutorials

- `GET /tutorials`
- `GET /tutorials/{slug}`

### Payments

- `POST /payments/opay/create`
- `POST /payments/opay/callback`
- `POST /payments/demo/complete/{reference}`
- `GET /payments/history`
- `GET /payments/{reference}`

### Analytics

- `POST /analytics/events`
- `GET /analytics/summary`

## Recommended first test

1. Keep `OPAY_ENV=demo`
2. Register a new account
3. Open `Premium`
4. Start payment test
5. Simulate successful payment
6. Confirm the account becomes premium and premium tutorials unlock
