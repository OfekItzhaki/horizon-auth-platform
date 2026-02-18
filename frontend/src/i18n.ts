import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                translation: {
                    'login.title': 'Horizon Auth',
                    'login.emailPlaceholder': 'Email',
                    'login.passwordPlaceholder': 'Password',
                    'login.failed': 'Login failed',
                    'login.signingIn': 'Signing in...',
                    'common.loading': 'Loading...',
                    'auth.verifyEmail.title': 'Verifying Email',
                    'auth.verifyEmail.success': 'Email Verified Successfully',
                    'auth.verifyEmail.failed': 'Verification Failed',
                    'auth.verifyEmail.backToLogin': 'Back to Login',
                }
            }
        },
        lng: "en",
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
