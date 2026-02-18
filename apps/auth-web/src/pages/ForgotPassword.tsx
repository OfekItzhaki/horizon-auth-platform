import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type {
    ApiError,
} from '@tasks-management/frontend-services';
import {
    authService,
} from '@tasks-management/frontend-services';
import AuthLayout from '../layouts/AuthLayout';
import { getSafeRedirect } from '../utils/redirect';

export default function ForgotPassword() {
    // const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const returnUrl = getSafeRedirect(searchParams.get('returnUrl'));

    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [resetToken, setResetToken] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await authService.forgotPassword(email);
            setStep(2);
            setResendCooldown(30);
        } catch (err: unknown) {
            const apiErr = err as ApiError;
            setError(Array.isArray(apiErr.message) ? apiErr.message.join(', ') : apiErr.message || 'Failed to initiate password reset');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e?: React.FormEvent, otpValue?: string) => {
        e?.preventDefault();
        const code = otpValue || otp;
        if (!code) return;
        setLoading(true);
        setError('');
        try {
            const response = await authService.verifyResetOtp(email, code);
            setResetToken(response.resetToken);
            setStep(3);
        } catch (err) {
            setError('Invalid code');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== passwordConfirm) return setError('Passwords do not match');
        setLoading(true);
        try {
            await authService.resetPassword({ email, token: resetToken, password, passwordConfirm });
            navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
        } catch (err) {
            setError('Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title="Reset Password" subtitle="Recover your account">
            <div className="space-y-6">
                {error && (
                    <div className="p-4 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-sm font-bold animate-shake">
                        {error}
                    </div>
                )}

                {step === 1 && (
                    <form className="space-y-6" onSubmit={handleStart}>
                        <div className="group">
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1">Email Address</label>
                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="premium-input" placeholder="name@example.com" />
                        </div>
                        <button type="submit" disabled={loading} className="premium-button w-full">Send Reset Code</button>
                    </form>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-slide-up">
                        <p className="text-center text-sm text-slate-500">Enter the code sent to {email}</p>
                        <input type="text" maxLength={6} required value={otp} onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setOtp(val);
                            if (val.length === 6) handleVerify(undefined, val);
                        }} className="premium-input text-center text-2xl font-bold tracking-[0.5em]" placeholder="000000" />
                        <div className="text-center mt-4">
                            <button onClick={handleStart} disabled={resendCooldown > 0 || loading} className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <form className="space-y-6 animate-slide-up" onSubmit={handleComplete}>
                        <div className="space-y-4">
                            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="premium-input" placeholder="New Password" />
                            <input type="password" required value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className="premium-input" placeholder="Confirm New Password" />
                        </div>
                        <button type="submit" disabled={loading} className="premium-button w-full">Update Password</button>
                    </form>
                )}

                <div className="text-center mt-6">
                    <button onClick={() => navigate('/login')} className="text-[11px] font-bold text-slate-400 hover:text-violet-600 uppercase tracking-widest">Back to Sign In</button>
                </div>
            </div>
        </AuthLayout>
    );
}
