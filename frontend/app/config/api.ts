import { PRODUCTION_API_URL, PRODUCTION_FRONTEND_URL } from '@/config/urls';

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');

  // Reject misconfigured env that points at the frontend (causes 404 / 508 loops)
  if (
    fromEnv &&
    fromEnv !== PRODUCTION_FRONTEND_URL &&
    !fromEnv.includes('webchatsales-vert.vercel.app')
  ) {
    return fromEnv;
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:9000';
  }

  return PRODUCTION_API_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();
