import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type {
    ApiError,
} from '@tasks-management/frontend-services';
import {
    authService,
    getTurnstileSiteKey,
} from '@tasks-management/frontend-services';
import TurnstileWidget from '../components/TurnstileWidget';
import { type TurnstileInstance } from '@marsidev/react-turnstile';
import AuthLayout from '../layouts/AuthLayout';
import { getSafeRedirect } from '../utils/redirect';

export default function Register() {
    // const { t } = useTranslation(); // Removed unused t
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const returnUrl = getSafeRedirect(searchParams.get('returnUrl'));

    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [regToken, setRegToken] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [captchaToken, setCaptchaToken] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const turnstileRef = useRef<TurnstileInstance>(null);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleRegisterStart = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!captchaToken && getTurnstileSiteKey()) {
            setError('Please complete the security verification.');
            return;
        }

        setLoading(true);
        try {
            await authService.registerStart(email, captchaToken);
            setStep(2);
            setResendCooldown(30);
        } catch (err: unknown) {
            turnstileRef.current?.reset();
            setCaptchaToken('');
            const apiErr = err as ApiError;
            setError(Array.isArray(apiErr.message) ? apiErr.message.join(', ') : apiErr.message || 'Failed to start registration');
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterVerify = async (e?: React.FormEvent, otpValue?: string) => {
        e?.preventDefault();
        const code = otpValue || otp;
        if (!code) return;

        setLoading(true);
        setError('');
        try {
            const response = await authService.registerVerify(email, code);
            setRegToken(response.registrationToken);
            setStep(3);
        } catch (err: unknown) {
            setError('Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterComplete = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== passwordConfirm) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await authService.registerFinish({
                registrationToken: regToken,
                password,
                passwordConfirm,
            });
            // Redirect back to the calling app after successful registration
            window.location.href = returnUrl;
        } catch (err: unknown) {
            setError('Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        try {
            setLoading(true);
            await authService.resendVerification(email);
            setResendCooldown(30);
        } catch (err) {
            setError('Failed to resend code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title="Horizon" subtitle="Create Your Account">
            <div className="space-y-6">
                {error && (
                    <div className="p-4 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-sm font-bold animate-shake">
                        {error}
                    </div>
                )}

                {step === 1 && (
                    <form className="space-y-6" onSubmit={handleRegisterStart}>
                        <div className="flex justify-center">
                            <TurnstileWidget ref={turnstileRef} onSuccess={setCaptchaToken} onError={setError} onExpire={() => setCaptchaToken('')} />
                        </div>
                        <div className="group">
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1">Email Address</label>
                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value.trim())} className="premium-input" placeholder="name@example.com" />
                        </div>
                        <button type="submit" disabled={loading} className="premium-button w-full">
                            {loading ? 'Starting...' : 'Continue'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-slide-up">
                        <div className="text-center">
                            <p className="text-sm text-slate-500">We've sent a 6-digit code to <span className="font-bold text-violet-600">{email}</span></p>
                        </div>
                        <div className="group">
                            <input type="text" maxLength={6} required value={otp} onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setOtp(val);
                                if (val.length === 6) handleRegisterVerify(undefined, val);
                            }} className="premium-input text-center text-2xl tracking-[0.5em] font-bold" placeholder="000000" />
                        </div>
                        <div className="flex justify-center">
                            <button onClick={handleResend} disabled={resendCooldown > 0 || loading} className="text-xs font-bold text-slate-400 hover:text-violet-600 uppercase tracking-widest disabled:opacity-50">
                                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <form className="space-y-6 animate-slide-up" onSubmit={handleRegisterComplete}>
                        <div className="space-y-5">
                            <div className="group">
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1">Choose Password</label>
                                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="premium-input" placeholder="••••••••" />
                            </div>
                            <div className="group">
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1">Confirm Password</label>
                                <input type="password" required value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className="premium-input" placeholder="••••••••" />
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="premium-button w-full">Complete Registration</button>
                    </form>
                )}

                <div className="text-center mt-6">
                    <button onClick={() => navigate('/login')} className="text-[11px] font-bold text-slate-400 hover:text-violet-600 uppercase tracking-widest">
                        Back to Sign In
                    </button>
                </div>
            </div>
        </AuthLayout>
    );
}
