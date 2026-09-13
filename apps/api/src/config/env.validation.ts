import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Database
  DATABASE_URL: Joi.string().required().description('PostgreSQL Connection URL'),

  // API Server
  PORT: Joi.number().default(3000),
  API_PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  CORS_ORIGIN: Joi.string().default('http://localhost:3001,http://localhost:3000'),

  // JWT Authentication
  JWT_SECRET: Joi.string().required().description('JWT signing secret key'),
  JWT_EXPIRES_IN: Joi.string().default('1d'),

  // Throttling / Rate Limiting
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),

  // Swagger Documentation
  ENABLE_SWAGGER: Joi.boolean().default(true),
  SWAGGER_PATH: Joi.string().default('docs'),

  // MinIO / Storage
  MINIO_ENDPOINT: Joi.string().default('localhost'),
  MINIO_PORT: Joi.number().default(9090),
  MINIO_ACCESS_KEY: Joi.string().default('proofledger_minio'),
  MINIO_SECRET_KEY: Joi.string().default('proofledger_minio_pass'),
  MINIO_BUCKET: Joi.string().default('proofledger-evidence'),
  MINIO_USE_SSL: Joi.boolean().default(false),
  MAX_FILE_SIZE: Joi.number().default(52428800),

  // Storage Aliases
  STORAGE_ENDPOINT: Joi.string().optional(),
  STORAGE_PORT: Joi.number().optional(),
  STORAGE_ACCESS_KEY: Joi.string().optional(),
  STORAGE_SECRET_KEY: Joi.string().optional(),
  STORAGE_BUCKET: Joi.string().optional(),
  STORAGE_USE_SSL: Joi.boolean().optional(),
  MAX_FILE_SIZE_BYTES: Joi.number().optional(),
});
