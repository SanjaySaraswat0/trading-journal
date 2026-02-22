# Setup Instructions for Phase 1 Security Features

## 1. Environment Variables Setup

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Then configure the following:

### Required Variables

**Upstash Redis (Rate Limiting)**:
1. Sign up at https://console.upstash.com/
2. Create a new Redis database
3. Copy REST URL and REST TOKEN to `.env.local`:
   ```
   UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token-here
   ```

**NextAuth Secret**:
```bash
openssl rand -base64 32
```
Copy output to `NEXTAUTH_SECRET` in `.env.local`

### Optional Configuration

**Disable Rate Limiting (Development)**:
```
ENABLE_RATE_LIMITING=false
```

**Logging Level**:
```
LOG_LEVEL=debug  # or info, warn, error
```

## 2. Database Migration for RBAC

Run this SQL in your Supabase SQL Editor:

```sql
-- Add tier column to users table (if it exists)
-- If users are managed via auth.users, you might need to use user_metadata instead

ALTER TABLE IF EXISTS public.users 
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'admin'));

-- Create index for faster tier lookups
CREATE INDEX IF NOT EXISTS idx_users_tier ON public.users(tier);

-- Alternative: If using auth.users with metadata
-- Users' tier will be stored in user_metadata JSON field
-- Example: { tier: 'free' }
```

## 3. Testing the Security Features

### Test Rate Limiting

```bash
# Make rapid requests to test rate limit
curl -X POST http://localhost:3000/api/trades \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL","trade_type":"long","entry_price":100,"quantity":10}' \
  --cookie "your-session-cookie"

# Repeat 100+ times quickly - should get 429 after threshold
```

### Test Validation

```bash
# Invalid symbol (should fail with validation error)
curl -X POST http://localhost:3000/api/trades \
  -H "Content-Type: application/json" \
  -d '{"symbol":"invalid lowercase","trade_type":"long","entry_price":100,"quantity":10}'

# Invalid price (negative, should fail)
curl -X POST http://localhost:3000/api/trades \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL","trade_type":"long","entry_price":-100,"quantity":10}'
```

### Test RBAC Tiers

```bash
# Try importing 100 trades as free user (should be blocked at 50)
# Import will return 403 with upgrade message
```

### Check Logs

```bash
# View application logs
cat logs/app-2026-02-14.log

# View error logs only
cat logs/error-2026-02-14.log

# Watch logs in real-time
tail -f logs/app-$(date +%Y-%m-%d).log
```

## 4. Verify Installation

Check that all dependencies are installed:
```bash
npm list @upstash/ratelimit @upstash/redis winston winston-daily-rotate-file
```

## 5. Common Issues

**Rate limiting not working**:
- Check Upstash credentials in `.env.local`
- Set `ENABLE_RATE_LIMITING=true`
- Restart dev server

**Validation errors**:
- Check request body matches schema exactly
- Symbol must be UPPERCASE alphanumeric
- Prices must be positive numbers
- Dates must be ISO 8601 format

**Logs not appearing**:
- Check `LOG_FILE_PATH` directory exists or can be created
- Check file permissions
- Set `LOG_LEVEL=debug` for more verbose output

## 6. Next Steps After Setup

1. Test each API endpoint manually
2. Verify rate limit headers in responses
3. Check tier-based access control works
4. Review logs for any errors
5. Proceed to Phase 2 (AI enhancements)
