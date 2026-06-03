# Deployment Guide - Monitor de Precios IT

## Vercel Production Setup

This guide explains how to configure the application for production deployment on Vercel.

### Required Environment Variables

Before deploying to Vercel, ensure all these environment variables are configured in your Vercel project settings:

#### 1. **DATABASE_URL** (Required)
Connection string to PostgreSQL database. 

**For Supabase:**
- **Local development & GitHub Actions:** Use the direct connection (port 5432)
  ```
  postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres?sslmode=require
  ```
- **Vercel (recommended):** Use the pooler connection (port 6543)
  ```
  postgresql://postgres.[project]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
  ```

**For Neon or Prisma Postgres:** Follow their connection string format.

#### 2. **SERP_API_KEY** (Required)
API key for web scraping and company discovery via SerpApi.
- Get your key from: https://serpapi.com/dashboard
- Used for Google Maps and Google Search queries

#### 3. **SERP_PROVIDER** (Optional - defaults to "serpapi")
Which SERP provider to use.
- Accepted values: `"serpapi"` or `"brightdata"`
- Default: `"serpapi"`

#### 4. **CRON_SECRET** (Required)
Secret token for protecting the `/api/scraper/run` endpoint.
- Should be a strong random string (min 32 characters recommended)
- Used to authenticate scheduled scraping jobs
- Example: `your-very-secure-random-token-at-least-32-chars`

#### 5. **SCRAPER_MAX_COMPANIES_PER_RUN** (Optional - defaults to 25)
Maximum number of companies to process per scraper run.
- Used to control load and API costs
- Default: `25`
- Recommended range: 10-50

#### 6. **SCRAPER_TARGET_CITY** (Optional - defaults to "Cordoba,Cordoba Province,Argentina")
Geographic target for company discovery.
- Default: `"Cordoba,Cordoba Province,Argentina"`
- Format: `"City,Province,Country"`

#### 7. **DB_ALLOW_SELF_SIGNED_CERT** (Optional - defaults to "false")
Allow self-signed SSL certificates for database connections.
- Accepted values: `"true"` or `"false"`
- Default: `"false"` (recommended for production)

#### 8. **NODE_ENV** (Optional - defaults to "production" on Vercel)
Node environment mode.
- Accepted values: `"development"`, `"test"`, or `"production"`
- Vercel automatically sets this to `"production"`

### Step-by-Step Vercel Setup

1. **Connect Repository**
   - Go to vercel.com and import your GitHub repository
   - Select the `monitor-precios-it` repository

2. **Configure Environment Variables**
   - In your Vercel project settings, go to **Settings > Environment Variables**
   - Add each required variable listed above
   - Ensure they are set for `Production` environment at minimum

3. **Database Migration**
   - After first deployment, you may need to run migrations:
   ```bash
   npm run db:migrate
   ```
   - Or use Vercel's CLI:
   ```bash
   vercel env pull
   npm run db:migrate -- --skip-generate
   ```

4. **Seed Initial Data (Optional)**
   ```bash
   npm run db:seed
   ```

### Securing Your Secrets

- **Never commit `.env` files** to version control
- Use Vercel's environment variable UI, not hardcoding
- Rotate `CRON_SECRET` periodically
- Use strong random values for sensitive keys
- Consider using Vercel's Encrypted Files feature for sensitive data

### Setting Up Scheduled Scraping

To run the scraper automatically:

#### Option A: GitHub Actions (Recommended)
Create `.github/workflows/scraper-schedule.yml`:
```yaml
name: Scheduled Scraper
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM daily
jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Vercel scraper
        run: |
          curl -X POST https://your-app.vercel.app/api/scraper/run \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

#### Option B: External Cron Service
Use cron-job.org, EasyCron, or similar to POST to:
```
POST https://your-app.vercel.app/api/scraper/run
Header: Authorization: Bearer YOUR_CRON_SECRET
```

### Troubleshooting Deployment

#### Build Error: "SERP_API_KEY must not be empty"
- Ensure `SERP_API_KEY` is set in Vercel environment variables
- Check that environment variables are assigned to the `Production` environment

#### Build Error: "DATABASE_URL must not be empty"
- Verify `DATABASE_URL` is correctly set in Vercel
- For Supabase, use the pooler connection URL (port 6543)

#### Runtime Error: "Unauthorized" on /api/scraper/run
- Check that `CRON_SECRET` is set correctly
- Ensure your cron job sends: `Authorization: Bearer YOUR_CRON_SECRET`

#### Prisma Connection Issues
- Use the Supabase pooler connection (recommended for Vercel)
- Ensure `pgbouncer=true` is in the connection string

### Local Testing Before Deploy

Test your environment locally:

```bash
# Copy example env
cp .env.example .env.local

# Fill in your actual values
# Then test build:
npm run build

# Test API locally:
npm run dev
curl -X POST http://localhost:3000/api/scraper/run \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Monitoring & Observability

- Check Vercel's **Functions** tab for API response times
- Monitor **Logs** for scraper execution and errors
- Use Prisma Studio to inspect data:
  ```bash
  npm run db:studio
  ```

### Cost Optimization

- Adjust `SCRAPER_MAX_COMPANIES_PER_RUN` based on SerpApi costs
- Schedule scraping during off-peak hours (e.g., 2 AM)
- Monitor API usage and adjust frequency if needed

### Further Help

- Vercel Docs: https://vercel.com/docs
- SerpApi Docs: https://serpapi.com/docs
- Prisma Docs: https://www.prisma.io/docs/
- Supabase Docs: https://supabase.com/docs
