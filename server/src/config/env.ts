import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

import fs from 'fs';

// Check for .env in standard locations (inside server/, current working dir, or project root)
const envCandidates = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'server/.env'),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const isTest = process.env.NODE_ENV === 'test';

/**
 * Environment variables validation schema.
 * Enforces fail-fast behavior: if critical configuration is missing in development or production,
 * the server halts immediately with an explicit, readable message.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  MONGODB_URI: isTest
    ? z.string().default('mongodb://localhost:27017/test_hotel_db')
    : z.string().min(1, 'MONGODB_URI is required. Provide your Atlas or local connection string in server/.env'),
  JWT_SECRET: isTest
    ? z.string().default('test_jwt_secret_key_minimum_32_characters_long_for_testing')
    : z.string().min(8, 'JWT_SECRET must be at least 8 characters long for cryptographic safety'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ FATAL: Invalid environment variable configuration:');
    result.error.issues.forEach((issue) => {
      console.error(`  - [${issue.path.join('.')}] ${issue.message}`);
    });
    console.error('\n👉 Please create or update your "server/.env" file based on "server/.env.example".\n');
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();

