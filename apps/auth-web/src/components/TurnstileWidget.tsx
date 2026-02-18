import { forwardRef } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { getTurnstileSiteKey } from '@tasks-management/frontend-services';

interface TurnstileWidgetProps {
    onSuccess: (token: string) => void;
    onError?: (error: string) => void;
    onExpire?: () => void;
}

const TurnstileWidget = forwardRef<TurnstileInstance, TurnstileWidgetProps>(
    ({ onSuccess, onError, onExpire }, ref) => {
        const siteKey = getTurnstileSiteKey();

        if (!siteKey) {
            return null;
        }

        return (
            <Turnstile
                ref={ref}
                siteKey={siteKey}
                options={{
                    theme: 'auto',
                    size: 'normal',
                    appearance: 'interaction-only',
                }}
                scriptOptions={{
                    appendTo: 'head',
                }}
                onSuccess={onSuccess}
                onError={() => {
                    if (onError) {
                        onError('CAPTCHA verification failed. Please try again.');
                    }
                }}
                onExpire={onExpire}
            />
        );
    }
);

TurnstileWidget.displayName = 'TurnstileWidget';
export default TurnstileWidget;
