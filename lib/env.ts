const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'GEMINI_API_KEY',
] as const;

export function validateEnv() {
  const missing: string[] = [];

  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `❌ Missing environment variables:\n${missing.join('\n')}`
    );
  }

  console.log('✅ All required environment variables are set');
}

export function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ Environment variable ${key} is not set`);
  }
  return value;
}

if (typeof window === 'undefined') {
  validateEnv();
}
