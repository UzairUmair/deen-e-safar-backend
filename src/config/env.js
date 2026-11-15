import { z } from 'zod';
const integer = (fallback, min, max) => z.coerce.number().int().min(min).max(max).default(fallback);
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: integer(4000, 1, 65535),
  MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//).refine(v => !/[<>]/.test(v)),
  FIREBASE_PROJECT_ID: z.string().min(3).refine(v => v !== 'your-project-id'),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().optional(),
  GROQ_RESPONSE_FORMAT: z.enum(['json_object', 'json_schema']).default('json_object'),
  CLIENT_ORIGIN: z.string().min(1),
  TRUST_PROXY_HOPS: integer(0, 0, 5),
  AI_REQUESTS_PER_MINUTE: integer(10, 1, 100),
  AI_REQUESTS_PER_DAY: integer(100, 1, 10000),
}).superRefine((e, ctx) => {
  if (e.NODE_ENV === 'production' && e.FIREBASE_AUTH_EMULATOR_HOST) ctx.addIssue({ code: 'custom', path: ['FIREBASE_AUTH_EMULATOR_HOST'], message: 'Emulator forbidden in production' });
  if (e.GROQ_API_KEY && (!e.GROQ_MODEL || e.GROQ_MODEL.includes('your-'))) ctx.addIssue({ code: 'custom', path: ['GROQ_MODEL'], message: 'Configure a supported model' });
  for (const origin of e.CLIENT_ORIGIN.split(',').map(v => v.trim())) {
    try {
      const url = new URL(origin);
      if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol) || (e.NODE_ENV === 'production' && url.protocol !== 'https:')) throw Error();
    } catch { ctx.addIssue({ code: 'custom', path: ['CLIENT_ORIGIN'], message: 'Explicit origins required' }); }
  }
});
export function loadEnv(raw = process.env) {
  const result = schema.safeParse(raw);
  if (!result.success) {
    // Paths only: validation errors can otherwise include private input values.
    const error = new Error('Configure: ' + [...new Set(result.error.issues.map(i => i.path.join('.')))].join(', '));
    error.code = 'CONFIG_INVALID';
    throw error;
  }
  return { ...result.data, origins: result.data.CLIENT_ORIGIN.split(',').map(v => v.trim()) };
}
