export interface LoginCredentials {
    username: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: User;
    isValid: boolean;
}
  
export interface User {
    id: string;
    username: string;
}
  
export interface AuthState {
    user: User | null;
    token: string | null;
}
