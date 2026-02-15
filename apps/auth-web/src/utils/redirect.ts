const ALLOWED_ORIGINS = [
    'http://localhost:5173', // web-app dev
    'https://ofeklabs.dev',   // production web
    'http://localhost:3002', // mobile-app dev (if applicable)
    'horizon-flux://',       // mobile custom scheme
];

export function isValidRedirect(url: string): boolean {
    if (!url) return false;

    try {
        // Check for custom schemes first
        if (url.startsWith('horizon-flux://')) {
            return true;
        }

        const parsed = new URL(url);
        const origin = `${parsed.protocol}//${parsed.host}`;

        return ALLOWED_ORIGINS.some(allowed => {
            // Direct origin match
            if (allowed === origin) return true;
            // Subdomain match (e.g., app.ofeklabs.dev)
            if (allowed.startsWith('https://') && origin.endsWith('.ofeklabs.dev')) {
                return true;
            }
            return false;
        });
    } catch {
        // If URL parsing fails, it might be a relative path which we can allow if it's strictly internal
        return url.startsWith('/');
    }
}

export function getSafeRedirect(url: string | null, fallback: string = 'http://localhost:5173'): string {
    if (url && isValidRedirect(url)) {
        return url;
    }
    return fallback;
}
