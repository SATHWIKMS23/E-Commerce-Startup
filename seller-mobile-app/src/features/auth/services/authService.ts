export interface LoginInput {
  identifier: string;
  password?: string;
}

export interface RegisterInput {
  username: string;
  email: string;
  password?: string;
  firstName: string;
  lastName?: string;
}

export const authService = {
  validateLogin: (data: LoginInput): { valid: boolean; error?: string } => {
    if (!data.identifier || !data.identifier.trim()) {
      return { valid: false, error: 'Email or Username is required' };
    }
    if (!data.password || data.password.length < 6) {
      return { valid: false, error: 'Password must be at least 6 characters' };
    }
    return { valid: true };
  },

  validateRegister: (data: RegisterInput): { valid: boolean; error?: string } => {
    if (!data.firstName || !data.firstName.trim()) {
      return { valid: false, error: 'First name is required' };
    }
    if (!data.username || data.username.length < 3) {
      return { valid: false, error: 'Username must be at least 3 characters' };
    }
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return { valid: false, error: 'Please enter a valid email address' };
    }
    if (!data.password || data.password.length < 6) {
      return { valid: false, error: 'Password must be at least 6 characters' };
    }
    return { valid: true };
  },

  formatError: (error: any): string => {
    return (
      error?.response?.data?.message ||
      error?.message ||
      'Authentication operation failed. Please try again.'
    );
  },
};
