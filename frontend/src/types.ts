export interface User {
    id: string;
    email: string;
    name?: string;
    emailVerified: boolean;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken?: string;
    user: User;
}

export interface LoginDto {
    email: string;
    password?: string;
    captchaToken?: string;
}
