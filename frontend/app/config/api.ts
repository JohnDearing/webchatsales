import { PRODUCTION_API_URL } from '@/config/urls';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:9000'
    : PRODUCTION_API_URL);
