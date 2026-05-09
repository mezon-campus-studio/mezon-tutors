import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

/**
 * Environment variable schema with Zod validation
 * All required variables will throw clear errors if missing
 */
const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGINS: z.string().optional(),

  // Frontend
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  /** Public origin of this API (no trailing slash), for VNPAY vnp_ReturnUrl. Example: https://api.example.com */
  PUBLIC_API_URL: z.string().url().optional(),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Auth / JWT
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().optional(),

  // OAuth (Mezon)
  MEZON_OAUTH_URL: z
    .string()
    .url('MEZON_OAUTH_URL must be a valid URL')
    .min(1, 'MEZON_OAUTH_URL is required'),
  CLIENT_ID: z.string().min(1, 'CLIENT_ID is required'),
  CLIENT_SECRET: z.string().min(1, 'CLIENT_SECRET is required'),
  REDIRECT_URI: z
    .string()
    .url('REDIRECT_URI must be a valid URL')
    .min(1, 'REDIRECT_URI is required'),

  // Email (Resend)
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  RESEND_FROM_EMAIL: z.string().email('RESEND_FROM_EMAIL must be a valid email'),

  VNPAY_TMN_CODE: z.string().default(''),
  VNPAY_SECURE_SECRET: z.string().default(''),
  VNPAY_HOST: z.string().default('https://sandbox.vnpayment.vn'),
  VNPAY_TEST_MODE: z
    .string()
    .default('true')
    .transform((value) => value === 'true'),

  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV !== 'production') return;
  const requiredInProd: [string, string][] = [
    ['VNPAY_TMN_CODE', data.VNPAY_TMN_CODE],
    ['VNPAY_SECURE_SECRET', data.VNPAY_SECURE_SECRET],
    ['VNPAY_HOST', data.VNPAY_HOST],
    ['CLOUDINARY_CLOUD_NAME', data.CLOUDINARY_CLOUD_NAME],
    ['CLOUDINARY_API_KEY', data.CLOUDINARY_API_KEY],
    ['CLOUDINARY_API_SECRET', data.CLOUDINARY_API_SECRET],
  ];
  for (const [key, val] of requiredInProd) {
    if (!val?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${key} is required in production`,
        path: [key],
      });
    }
  }
});

type EnvConfig = z.infer<typeof envSchema>;

@Injectable()
export class AppConfigService {
  private readonly env: EnvConfig;

  constructor(private configService: ConfigService) {
    // Validate all environment variables at startup
    const rawEnv = {
      PORT: this.configService.get('PORT'),
      NODE_ENV: this.configService.get('NODE_ENV'),
      CORS_ORIGINS: this.configService.get('CORS_ORIGINS'),
      FRONTEND_URL: this.configService.get('FRONTEND_URL'),
      PUBLIC_API_URL: this.configService.get('PUBLIC_API_URL'),
      DATABASE_URL: this.configService.get('DATABASE_URL'),
      JWT_SECRET: this.configService.get('JWT_SECRET'),
      JWT_REFRESH_SECRET: this.configService.get('JWT_REFRESH_SECRET'),
      MEZON_OAUTH_URL: this.configService.get('MEZON_OAUTH_URL'),
      CLIENT_ID: this.configService.get('CLIENT_ID'),
      CLIENT_SECRET: this.configService.get('CLIENT_SECRET'),
      REDIRECT_URI: this.configService.get('REDIRECT_URI'),
      RESEND_API_KEY: this.configService.get('RESEND_API_KEY'),
      RESEND_FROM_EMAIL: this.configService.get('RESEND_FROM_EMAIL'),
      VNPAY_TMN_CODE: this.configService.get('VNPAY_TMN_CODE'),
      VNPAY_SECURE_SECRET: this.configService.get('VNPAY_SECURE_SECRET'),
      VNPAY_HOST: this.configService.get('VNPAY_HOST'),
      VNPAY_TEST_MODE: this.configService.get('VNPAY_TEST_MODE'),
      CLOUDINARY_CLOUD_NAME: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      CLOUDINARY_API_KEY: this.configService.get('CLOUDINARY_API_KEY'),
      CLOUDINARY_API_SECRET: this.configService.get('CLOUDINARY_API_SECRET'),
    };

    try {
      this.env = envSchema.parse(rawEnv);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const missingVars = error.issues
          .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
          .join('\n');
        throw new Error(
          `Environment validation failed:\n${missingVars}\n\nPlease check your .env file.`
        );
      }
      throw error;
    }
  }

  get port(): number {
    return this.env.PORT;
  }

  get nodeEnv(): string {
    return this.env.NODE_ENV;
  }

  get corsOrigins(): string | undefined {
    return this.env.CORS_ORIGINS;
  }

  get frontendUrl(): string {
    return this.env.FRONTEND_URL;
  }

  /** Base URL callers use to reach this Nest app (scheme + host + port if needed). */
  get publicApiBaseUrl(): string {
    const fromEnv = this.env.PUBLIC_API_URL?.replace(/\/$/, '').trim()
    if (fromEnv) {
      return fromEnv
    }
    return `http://127.0.0.1:${this.port}`
  }

  get databaseUrl(): string {
    return this.env.DATABASE_URL;
  }

  get jwtSecret(): string {
    return this.env.JWT_SECRET;
  }

  get jwtRefreshSecret(): string {
    return this.env.JWT_REFRESH_SECRET || this.env.JWT_SECRET;
  }

  get jwtConfig() {
    return {
      secret: this.jwtSecret,
      refreshSecret: this.jwtRefreshSecret,
    };
  }

  get oauthConfig() {
    return {
      baseUri: this.env.MEZON_OAUTH_URL,
      clientId: this.env.CLIENT_ID,
      clientSecret: this.env.CLIENT_SECRET,
      redirectUri: this.env.REDIRECT_URI,
    };
  }

  get vercelEnv(): string {
    return process.env.VERCEL_ENV || '';
  }

  get resendApiKey(): string {
    return this.env.RESEND_API_KEY;
  }

  get resendFromEmail(): string {
    return this.env.RESEND_FROM_EMAIL;
  }

  get mezonBotConfig() {
    return {
      clientId: this.env.CLIENT_ID,
      clientSecret: this.env.CLIENT_SECRET,
    };
  }

  get cloudinaryConfig() {
    return {
      cloudName: this.env.CLOUDINARY_CLOUD_NAME,
      apiKey: this.env.CLOUDINARY_API_KEY,
      apiSecret: this.env.CLOUDINARY_API_SECRET,
    };
  }

  get vnpayConfig() {
    return {
      tmnCode: this.env.VNPAY_TMN_CODE,
      secureSecret: this.env.VNPAY_SECURE_SECRET,
      vnpayHost: this.env.VNPAY_HOST,
      testMode: this.env.VNPAY_TEST_MODE,
    };
  }

  // Helper generic method if needed for other keys
  get(key: string): string {
    return this.configService.get<string>(key) || '';
  }
}
