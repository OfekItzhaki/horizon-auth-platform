const TOKEN_KEY = 'horizon_auth_token';

export const TokenStorage = {
    getToken: () => localStorage.getItem(TOKEN_KEY),
    setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
    removeToken: () => localStorage.removeItem(TOKEN_KEY),
    hasToken: () => !!localStorage.getItem(TOKEN_KEY),
};
