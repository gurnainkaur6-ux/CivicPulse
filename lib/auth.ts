import { getAppwriteAccount, ID } from './appwrite-client';
import { AppwriteException } from 'appwrite';

export interface User {
  $id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Sign up a new user
 */
export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  try {
    const account = getAppwriteAccount();
    
    // Create account
    const user = await account.create(
      ID.unique(),
      email,
      password,
      name
    );

    // Automatically log in after signup
    await account.createEmailPasswordSession(email, password);

    return {
      success: true,
      user: {
        $id: user.$id,
        email: user.email,
        name: user.name
      }
    };
  } catch (error) {
    console.error('Signup error:', error);
    return {
      success: false,
      error: error instanceof AppwriteException 
        ? error.message 
        : 'Failed to create account'
    };
  }
}

/**
 * Log in an existing user
 */
export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const account = getAppwriteAccount();
    
    await account.createEmailPasswordSession(email, password);
    
    const user = await account.get();

    return {
      success: true,
      user: {
        $id: user.$id,
        email: user.email,
        name: user.name
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error instanceof AppwriteException 
        ? error.message 
        : 'Invalid email or password'
    };
  }
}

/**
 * Log out current user
 */
export async function logout(): Promise<void> {
  try {
    const account = getAppwriteAccount();
    await account.deleteSession('current');
  } catch (error) {
    console.error('Logout error:', error);
  }
}

/**
 * Get current logged-in user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const account = getAppwriteAccount();
    const user = await account.get();
    
    return {
      $id: user.$id,
      email: user.email,
      name: user.name
    };
  } catch (error) {
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
