// fichier backend/src/config/env.ts
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
  PORT: z.string().default('3001').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('20m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  DB_PATH: z.string().default('./data/bijoux.db'),
  GMAIL_USER: z.string().email(),
  GMAIL_APP_PASSWORD: z.string().min(1),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  GROK_FRONTEND_URL: z.string().url().optional(),
  SHOP_NAME: z.string().default('nom de la société'),
  SHOP_DESCRIPTION: z.string().default('description'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables d\'environnement invalides :');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
