import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LoginDto,
  ApiError,
  authService,
  getTurnstileSiteKey,
} from '@tasks-management/frontend-services';
import { useTranslation } from 'react-i18next';
import TurnstileWidget from '../components/TurnstileWidget';
import { type TurnstileInstance } from '@marsidev/react-turnstile';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regStep, setRegStep] = useState(1);
  const [regToken, setRegToken] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetToken, setResetToken] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const turnstileRef = useRef<TurnstileInstance>(null);

  const { login } = useAuth();

  const getErrorMessage = (err: unknown, fallback: string) => {
    const error = err as ApiError;
    if (Array.isArray(error.message)) {
      return error.message.join(', ');
    }
    return error.message || fallback;
  };
  const navigate = useNavigate();

  const [resendCooldown, setResendCooldown] = useState(0);
  // CAPTCHA handlers
  const handleCaptchaSuccess = (token: string) => {
    setCaptchaToken(token);
    setError(''); // Clear any previous errors
  };
  const handleCaptchaError = (error: string) => {
    setError(error);
    setCaptchaToken('');
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken('');
  };

  // Timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    try {
      setLoading(true);
      await authService.resendVerification(email);
      setResendCooldown(30); // 30 seconds cooldown
      setError('');
    } catch (err: unknown) {
      setError(
        getErrorMessage(err, t('login.failed') || 'Failed to resend code')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Prevent submission if CAPTCHA token is missing when required
    const siteKey = getTurnstileSiteKey();
    if (siteKey && !captchaToken) {
      setError('Please complete the security verification.');
      return;
    }

    setLoading(true);

    try {
      const credentials: LoginDto = { email, password, captchaToken };
      const response = await login(credentials);

      const params = new URLSearchParams(window.location.search);
      const redirectUri = params.get('redirect_uri');

      if (redirectUri) {
        // In a real SSO, we'd append an auth code. For now, simple redirect with token if needed or just back.
        // If it's a known URL, redirect.
        window.location.href = `${redirectUri}?token=${authService.getToken()}`;
        return;
      }

      navigate('/lists');
    } catch (err: unknown) {
      // Reset turnstile widget on authentication failure
      turnstileRef.current?.reset();
      setCaptchaToken('');

      const errorMessage = getErrorMessage(err, t('login.failed'));
      if (errorMessage.includes('CAPTCHA verification failed')) {
        setError(
          'Security verification failed. Please ensure your browser allows scripts from Cloudflare.'
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStart = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email) return setError('Email is required');

    // Prevent submission if CAPTCHA token is missing when required
    const siteKey = getTurnstileSiteKey();
    if (siteKey && !captchaToken) {
      setError('Please complete the security verification.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authService.registerStart(email, captchaToken);
      setRegStep(2);
      setResendCooldown(30);
    } catch (err: unknown) {
      // Reset turnstile widget on registration failure
      turnstileRef.current?.reset();
      setCaptchaToken('');
      setError(getErrorMessage(err, 'Failed to start registration'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterVerify = async (
    e?: React.FormEvent,
    otpValue?: string
  ) => {
    e?.preventDefault();
    const codeToVerify = otpValue || otp;
    if (!codeToVerify) return setError('OTP is required');

    setLoading(true);
    setError('');
    try {
      const response = await authService.registerVerify(email, codeToVerify);
      setRegToken(response.registrationToken);
      setRegStep(3);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Invalid OTP'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirm) return setError('Passwords do not match');
    setLoading(true);
    setError('');
    try {
      await authService.registerFinish({
        registrationToken: regToken,
        password,
        passwordConfirm,
      });
      navigate('/lists');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordStart = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email) return setError('Email is required');
    setLoading(true);
    setError('');

    // Prevent submission if CAPTCHA token is missing when required
    const siteKey = getTurnstileSiteKey();
    if (siteKey && !captchaToken) {
      setError('Please complete the security verification.');
      return;
    }

    try {
      await authService.forgotPassword(email, captchaToken);
      setResetStep(2);
      setResendCooldown(30);
    } catch (err: unknown) {
      // Reset turnstile widget on forgot password failure
      turnstileRef.current?.reset();
      setCaptchaToken('');
      setError(getErrorMessage(err, 'Failed to initiate password reset'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordVerify = async (
    e?: React.FormEvent,
    otpValue?: string
  ) => {
    e?.preventDefault();
    const codeToVerify = otpValue || otp;
    if (!codeToVerify) return setError('OTP is required');

    setLoading(true);
    setError('');
    try {
      const response = await authService.verifyResetOtp(email, codeToVerify);
      setResetToken(response.resetToken);
      setResetStep(3);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Invalid OTP'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirm) return setError('Passwords do not match');
    setLoading(true);
    setError('');
    try {
      await authService.resetPassword({
        email,
        token: resetToken,
        password: password,
        passwordConfirm: passwordConfirm,
      });

      // Automatically login after reset
      await login({ email, password });
      navigate('/lists');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Password reset failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#020617] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-500">
      {/* Dynamic Aura Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-600/20 dark:bg-violet-900/10 rounded-full blur-[120px] animate-pulse-slow"></div>
      <div
        className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-600/20 dark:bg-indigo-900/10 rounded-full blur-[100px] animate-pulse-slow"
        style={{ animationDelay: '4s' }}
      ></div>

      <div className="max-w-md w-full relative z-10 animate-fade-in">
        <div className="flex flex-col items-center mb-10 translate-y-2">
          <div className="w-20 h-20 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-3xl shadow-2xl shadow-violet-500/20 flex items-center justify-center mb-6 transform hover:rotate-6 hover:scale-105 transition-all duration-500 animate-float">
            <svg
              className="w-10 h-10 text-white drop-shadow-md"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent drop-shadow-sm tracking-tight text-center">
            Horizon Flux
          </h1>
          <p className="mt-3 text-sm font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 text-center">
            {t('login.title')}
          </p>
        </div>

        <div className="premium-card p-10 animate-slide-up bg-white/60 dark:bg-[#0f172a]/50">
          <form
            className="space-y-6"
            onSubmit={
              isRegistering
                ? regStep === 1
                  ? handleRegisterStart
                  : regStep === 2
                    ? handleRegisterVerify
                    : handleRegisterComplete
                : isResettingPassword
                  ? resetStep === 1
                    ? handleForgotPasswordStart
                    : resetStep === 2
                      ? handleForgotPasswordVerify
                      : handleForgotPasswordComplete
                  : handleLogin
            }
          >
            {error && (
              <div
                className="p-4 rounded-2xl flex items-start gap-3 animate-scale-in bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                role="alert"
              >
                <svg
                  className="w-5 h-5 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-bold">{error}</p>
                </div>
              </div>
            )}

            {/* Turnstile CAPTCHA Widget */}
            <div className="flex justify-center">
              <TurnstileWidget
                ref={turnstileRef}
                onSuccess={handleCaptchaSuccess}
                onError={handleCaptchaError}
                onExpire={handleCaptchaExpire}
              />
            </div>

            <div className="space-y-5">
              {/* Step 1: Email (Login or register start) */}
              {((regStep === 1 && !isResettingPassword) ||
                (isResettingPassword && resetStep === 1) ||
                (!isRegistering && !isResettingPassword)) && (
                  <div className="group">
                    <label
                      htmlFor="email"
                      className="block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1 transition-colors group-focus-within:text-violet-600 dark:group-focus-within:text-violet-400"
                    >
                      {t('login.emailPlaceholder')}
                    </label>
                    <div className="relative">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value.trim())}
                        className="premium-input px-11 pr-32"
                        placeholder="name@example.com"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-violet-500 transition-colors">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                          />
                        </svg>
                      </div>

                      {((isRegistering && regStep === 1) ||
                        (isResettingPassword && resetStep === 1)) && (
                          <div className="absolute inset-y-0 right-2 flex items-center">
                            <button
                              type="button"
                              onClick={
                                isRegistering
                                  ? handleRegisterStart
                                  : handleForgotPasswordStart
                              }
                              disabled={loading || !email.includes('@')}
                              className="px-4 py-1.5 bg-accent hover:bg-accent/90 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-accent/20 transition-all disabled:opacity-50"
                            >
                              {loading ? (
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              ) : isRegistering ? (
                                'Send Code'
                              ) : (
                                'Send Code'
                              )}
                            </button>
                          </div>
                        )}
                    </div>
                  </div>
                )}

              {/* Step 2: OTP */}
              {((isRegistering && regStep === 2) ||
                (isResettingPassword && resetStep === 2)) && (
                  <div className="group animate-scale-in">
                    <label
                      htmlFor="otp"
                      className="block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1 transition-colors group-focus-within:text-violet-600 dark:group-focus-within:text-violet-400"
                    >
                      {isResettingPassword ? 'Reset Code' : '6-Digit Code'}
                    </label>
                    <div className="relative">
                      <input
                        id="otp"
                        name="otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        required
                        value={otp}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setOtp(val);
                          if (val.length === 6) {
                            if (isRegistering) {
                              void handleRegisterVerify(undefined, val);
                            } else {
                              void handleForgotPasswordVerify(undefined, val);
                            }
                          }
                        }}
                        className="premium-input px-11 tracking-[0.5em] text-center font-bold text-lg"
                        placeholder="000000"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-violet-500 transition-colors">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={loading || resendCooldown > 0}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors disabled:opacity-50"
                      >
                        {resendCooldown > 0
                          ? `Resend in ${resendCooldown} s`
                          : 'Resend Code'}
                      </button>
                    </div>
                  </div>
                )}
              {/* Step 3: Password */}
              {((!isRegistering && !isResettingPassword) ||
                (isRegistering && regStep === 3) ||
                (isResettingPassword && resetStep === 3)) && (
                  <div className="group animate-scale-in">
                    <label
                      htmlFor="password"
                      className="block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1 transition-colors group-focus-within:text-violet-600 dark:group-focus-within:text-violet-400"
                    >
                      {t('login.passwordPlaceholder')}
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="premium-input px-11 pr-24"
                        placeholder="••••••••"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-violet-500 transition-colors">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </div>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="p-1.5 text-slate-400 hover:text-violet-600 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {showPassword ? (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          )}
                        </button>
                        {!isRegistering && !isResettingPassword && (
                          <button
                            type="submit"
                            disabled={loading || !password}
                            aria-label="Sign In"
                            className="p-2 bg-accent hover:bg-accent/90 text-white rounded-lg shadow-lg shadow-accent/20 transition-all active:scale-95 disabled:opacity-50"
                          >
                            {loading ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2.5}
                                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                                />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {!isRegistering && !isResettingPassword && (
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setIsResettingPassword(true);
                            setResetStep(1);
                            setError('');
                          }}
                          className="text-[10px] font-bold text-slate-400 hover:text-violet-600 transition-colors uppercase tracking-widest"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    )}
                  </div>
                )}

              {/* Step 3: Confirm Password (Registration or Reset) */}
              {((isRegistering && regStep === 3) ||
                (isResettingPassword && resetStep === 3)) && (
                  <div className="group animate-scale-in">
                    <label
                      htmlFor="passwordConfirm"
                      className="block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1 transition-colors group-focus-within:text-violet-600 dark:group-focus-within:text-violet-400"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="passwordConfirm"
                        name="passwordConfirm"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        className="premium-input px-11 pr-14"
                        placeholder="••••••••"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-violet-500 transition-colors">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </div>
                      <div className="absolute inset-y-0 right-2 flex items-center">
                        <button
                          type="submit"
                          disabled={loading || !passwordConfirm}
                          className="p-2 bg-accent hover:bg-accent/90 text-white rounded-lg shadow-lg shadow-accent/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </form>
        </div>

        {/* Footer Toggle */}
        <div className="flex flex-col items-center text-center gap-6 mt-8">
          <button
            type="button"
            onClick={() => {
              if (isResettingPassword) {
                setIsResettingPassword(false);
                setResetStep(1);
              } else {
                setIsRegistering(!isRegistering);
                setRegStep(1);
              }
              setError('');
            }}
            className="text-[11px] font-bold text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-all uppercase tracking-[0.2em] py-2 px-4 rounded-xl hover:bg-violet-500/5"
          >
            {isResettingPassword
              ? 'Back to Sign In'
              : isRegistering
                ? 'Back to Sign In'
                : "Don't have an account? Sign Up"}
          </button>
        </div>

        <div className="mt-12 flex flex-col items-center">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 dark:text-slate-600 select-none hover:text-violet-400 dark:hover:text-violet-500 transition-colors cursor-default">
            Developed by OfekLabs
          </p>
        </div>
      </div>
    </div>
  );
}
