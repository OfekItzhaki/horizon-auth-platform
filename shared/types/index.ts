// User Types
export enum NotificationFrequency {
    NONE = 'NONE',
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
}

export interface User {
    id: string;
    email: string;
    name: string | null;
    profilePicture: string | null;
    emailVerified: boolean;
    notificationFrequency: NotificationFrequency;
    trashRetentionDays: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface CreateUserDto {
    email: string;
    password: string;
    name?: string;
    profilePicture?: string;
}

export interface UpdateUserDto {
    email?: string;
    name?: string;
    profilePicture?: string;
    password?: string;
    notificationFrequency?: NotificationFrequency;
    trashRetentionDays?: number;
}

// Auth Types
export interface LoginDto {
    email: string;
    password: string;
    captchaToken?: string;
}

export interface RegisterStartDto {
    email: string;
    captchaToken?: string;
}

export interface ForgotPasswordDto {
    email: string;
    captchaToken?: string;
}

export interface LoginResponse {
    accessToken: string;
    user: Omit<User, 'passwordHash' | 'emailVerificationOtp'>;
}

// API Error Types
export interface ApiError {
    statusCode: number;
    message: string | string[];
    error?: string;
}
