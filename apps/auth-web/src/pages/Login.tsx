import { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import type {
    LoginDto,
    ApiError,
} from '@tasks-management/frontend-services';
import { getTurnstileSiteKey } from '@tasks-management/frontend-services';
import TurnstileWidget from '../components/TurnstileWidget';
import { type TurnstileInstance } from '@marsidev/react-turnstile';
import { getSafeRedirect } from '../utils/redirect';
import AuthLayout from '../layouts/AuthLayout';

export default function Login() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const returnUrl = getSafeRedirect(searchParams.get('returnUrl'));

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [captchaToken, setCaptchaToken] = useState('');
    const turnstileRef = useRef<TurnstileInstance>(null);

    const { login } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const siteKey = getTurnstileSiteKey();
        if (siteKey && !captchaToken) {
            setError('Please complete the security verification.');
            return;
        }

        setLoading(true);
        try {
            const credentials: LoginDto = { email, password, captchaToken };
            const response = await login(credentials);

            // Redirect back to the calling app with tokens
            const url = new URL(returnUrl);
            url.searchParams.append('accessToken', response.accessToken);
            url.searchParams.append('refreshToken', response.refreshToken);
            window.location.href = url.toString();
        } catch (err: unknown) {
            turnstileRef.current?.reset();
            setCaptchaToken('');
            const apiErr = err as ApiError;
            setError(Array.isArray(apiErr.message) ? apiErr.message.join(', ') : apiErr.message || t('login.failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title="Horizon Flux" subtitle={t('login.title')}>
            <form className="space-y-6" onSubmit={handleLogin}>
                {error && (
                    <div className="p-4 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-sm font-bold animate-shake">
                        {error}
                    </div>
                )}

                <div className="flex justify-center">
                    <TurnstileWidget
                        ref={turnstileRef}
                        onSuccess={setCaptchaToken}
                        onError={setError}
                        onExpire={() => setCaptchaToken('')}
                    />
                </div>

                <div className="space-y-5">
                    <div className="group">
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1">
                            {t('login.emailPlaceholder')}
                        </label>
                        <div className="relative">
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value.trim())}
                                className="premium-input pl-11"
                                placeholder="name@example.com"
                            />
                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-violet-500 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1">
                            {t('login.passwordPlaceholder')}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="premium-input pl-11 pr-12"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-violet-500"
                            >
                                {showPassword ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="premium-button w-full flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        t('login.title')
                    )}
                </button>

                <div className="flex flex-col items-center gap-4 mt-8">
                    <a href={`/register?returnUrl=${encodeURIComponent(returnUrl)}`} className="text-[11px] font-bold text-slate-400 hover:text-violet-600 transition-all uppercase tracking-widest">
                        Don't have an account? Sign Up
                    </a>
                </div>
            </form>
        </AuthLayout>
    );
}
