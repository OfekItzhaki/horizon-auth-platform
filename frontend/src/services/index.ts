export * from './auth.service';
export * from './users.service';

// Mock/Helper for Turnstile Site Key
export const getTurnstileSiteKey = () => import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

export interface ApiError {
    message: string | string[];
}

export interface LoginDto {
    email: string;
    password?: string;
    captchaToken?: string;
}
