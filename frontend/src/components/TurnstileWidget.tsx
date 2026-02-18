import { forwardRef } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

interface TurnstileWidgetProps {
    onSuccess: (token: string) => void;
    onError: (error: string) => void;
    onExpire: () => void;
}

const TurnstileWidget = forwardRef<TurnstileInstance, TurnstileWidgetProps>(
    ({ onSuccess, onError, onExpire }, ref) => {
        const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

        if (!siteKey) {
            return null;
        }

        return (
            <Turnstile
                ref={ref}
                siteKey={siteKey}
                onSuccess={onSuccess}
                onError={() => onError('CAPTCHA error')}
                onExpire={onExpire}
            />
        );
    }
);

export default TurnstileWidget;
