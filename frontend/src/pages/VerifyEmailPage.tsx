import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService } from '@tasks-management/frontend-services';

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        return;
      }

      try {
        await authService.verifyEmail(token);
        setStatus('success');
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch {
        // console.error('Verification failed:', error);
        setStatus('error');
      }
    };

    verify();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
      <div className="premium-card max-w-md w-full p-8 text-center animate-scale-in">
        <div className="flex justify-center mb-6">
          <span className="text-3xl font-black bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
            Horizon Auth
          </span>
        </div>

        {status === 'loading' && (
          <div className="space-y-4">
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('auth.verifyEmail.title')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {t('common.loading')}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 text-green-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('auth.verifyEmail.success')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {t('login.signingIn')}
            </p>
            <Link to="/login" className="premium-button w-full mt-4">
              {t('auth.verifyEmail.backToLogin')}
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('auth.verifyEmail.failed')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {t('common.unknownError')}
            </p>
            <Link
              to="/login"
              className="premium-button w-full mt-4 opacity-50 hover:opacity-100"
            >
              {t('auth.verifyEmail.backToLogin')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
