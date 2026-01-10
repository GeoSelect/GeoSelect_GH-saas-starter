# Next.js SaaS Starter

This is a starter template for building a SaaS application using **Next.js** with support for authentication, Stripe integration for payments, and a dashboard for logged-in users.

**Demo: [https://next-saas-start.vercel.app/](https://next-saas-start.vercel.app/)**

## Features

- Marketing landing page (`/`) with animated Terminal element
- Pricing page (`/pricing`) which connects to Stripe Checkout
- Dashboard pages with CRUD operations on users/teams
- **Comprehensive Flag Management System**
  - Feature flags with rollout controls
  - Environment-specific configuration
  - Operational flags (maintenance mode, rate limiting)
  - Role-based permission system (RBAC)
- Basic RBAC with Owner, Admin, Member, and Viewer roles
- Subscription management with Stripe Customer Portal
- Email/password authentication with JWTs stored to cookies
- Global middleware to protect logged-in routes
- Local middleware to protect Server Actions or validate Zod schemas
- Activity logging system for any user events
- Bootstrap endpoint with user context, permissions, and features

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Database**: [Postgres](https://www.postgresql.org/)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **Payments**: [Stripe](https://stripe.com/)
- **UI Library**: [shadcn/ui](https://ui.shadcn.com/)

## Getting Started

```bash
git clone https://github.com/nextjs/saas-starter
cd saas-starter
pnpm install
```

## Running Locally

[Install](https://docs.stripe.com/stripe-cli) and log in to your Stripe account:

```bash
stripe login
```

Use the included setup script to create your `.env` file:

```bash
pnpm db:setup
```

Run the database migrations and seed the database with a default user and team:

```bash
pnpm db:migrate
pnpm db:seed
```

This will create the following user and team:

- User: `test@test.com`
- Password: `admin123`

You can also create new users through the `/sign-up` route.

Finally, run the Next.js development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app in action.

You can listen for Stripe webhooks locally through their CLI to handle subscription change events:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Testing Payments

To test Stripe payments, use the following test card details:

- Card Number: `4242 4242 4242 4242`
- Expiration: Any future date
- CVC: Any 3-digit number

## Going to Production

When you're ready to deploy your SaaS application to production, follow these steps:

### Set up a production Stripe webhook

1. Go to the Stripe Dashboard and create a new webhook for your production environment.
2. Set the endpoint URL to your production API route (e.g., `https://yourdomain.com/api/stripe/webhook`).
3. Select the events you want to listen for (e.g., `checkout.session.completed`, `customer.subscription.updated`).

### Deploy to Vercel

1. Push your code to a GitHub repository.
2. Connect your repository to [Vercel](https://vercel.com/) and deploy it.
3. Follow the Vercel deployment process, which will guide you through setting up your project.

### Add environment variables

In your Vercel project settings (or during deployment), add all the necessary environment variables. Make sure to update the values for the production environment, including:

1. `BASE_URL`: Set this to your production domain.
2. `STRIPE_SECRET_KEY`: Use your Stripe secret key for the production environment.
3. `STRIPE_WEBHOOK_SECRET`: Use the webhook secret from the production webhook you created in step 1.
4. `POSTGRES_URL`: Set this to your production database URL.
5. `AUTH_SECRET`: Set this to a random string. `openssl rand -base64 32` will generate one.

### Environment Variables

The application supports the following environment variables:

#### Core Configuration
```bash
POSTGRES_URL=postgresql://***
STRIPE_SECRET_KEY=sk_test_***
STRIPE_WEBHOOK_SECRET=whsec_***
BASE_URL=http://localhost:3000
AUTH_SECRET=***
```

#### Environment Configuration
```bash
ENVIRONMENT=development  # development | production | staging | test
ENABLE_DEBUG_LOGS=true
ENABLE_EXPERIMENTAL_FEATURES=false
ENABLE_ANALYTICS=true
```

#### Operational Flags
```bash
MAINTENANCE_MODE=false
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=100
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000
CIRCUIT_BREAKER_RESET_TIMEOUT=30000
ENABLE_REQUEST_LOGGING=false
```

#### Health Check Configuration
```bash
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000
```

See `.env.example` for the complete list of environment variables.

## Flag Management System

This starter includes a comprehensive flag management system. See [docs/FLAGS.md](docs/FLAGS.md) for detailed documentation on:

- **Feature Flags**: Control feature availability with rollout percentages and entitlement-based access
- **Environment Configuration**: Environment-specific behavior for development, staging, and production
- **Operational Flags**: Runtime controls for maintenance mode, rate limiting, and circuit breakers
- **Permission System**: Role-based access control with explicit permissions

### Quick Example

```typescript
import { isFeatureEnabled } from '@/lib/features/flags';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// Check if feature is enabled for user
if (isFeatureEnabled('ENABLE_AI_ASSISTANT', user, account, entitlements)) {
  // Show AI assistant
}

// Check if user has permission
if (hasPermission(user, PERMISSIONS.MANAGE_BILLING, role)) {
  // Allow billing management
}
```

## Testing

The application includes comprehensive test coverage:

```bash
npm test
```

Test files include:
- Permission system tests
- Feature flag evaluation tests
- Bootstrap endpoint tests
- Operational flags tests
- Account access control tests
- Environment configuration tests

## Other Templates

While this template is intentionally minimal and to be used as a learning resource, there are other paid versions in the community which are more full-featured:

- https://achromatic.dev
- https://shipfa.st
- https://makerkit.dev
- https://zerotoshipped.com
- https://turbostarter.dev
