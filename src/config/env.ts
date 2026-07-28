import dotenv from 'dotenv';

dotenv.config();

/**
 * A single, typed source of truth for all environment variables.
 *
 * Reading `process.env` directly throughout the codebase is error-prone
 * (typos, missing values, no defaults). Instead, every other file imports
 * this `env` object, so required variables are validated once, at startup.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongodbUri: requireEnv('MONGODB_URI'),
  clientOrigins: (process.env.CLIENT_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export const isProduction = env.nodeEnv === 'production';
