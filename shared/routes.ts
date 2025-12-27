import { z } from 'zod';
import { insertLapTimeSchema, lapTimes } from './schema';

export const api = {
  laps: {
    list: {
      method: 'GET' as const,
      path: '/api/laps',
      responses: {
        200: z.array(z.custom<typeof lapTimes.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/laps',
      input: insertLapTimeSchema,
      responses: {
        201: z.custom<typeof lapTimes.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
