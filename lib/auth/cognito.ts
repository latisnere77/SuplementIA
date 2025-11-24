/**
 * AWS Cognito Authentication Client
 * Handles user authentication for the public portal
 */

// Dynamic import to avoid SSR issues
// Use type imports to avoid module resolution issues during build
type CognitoUserPoolType = any;
type CognitoUserType = any;
type AuthenticationDetailsType = any;
type CognitoUserAttributeType = any;
type CognitoUserSessionType = any;

let CognitoUserPool: any;
let CognitoUser: any;
let AuthenticationDetails: any;
let CognitoUserAttribute: any;
let CognitoUserSession: any;

// Lazy load Cognito only in browser - use function to avoid module resolution during build
function loadCognito() {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    // Use dynamic import to avoid SSR issues and ESLint errors
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cognitoModule = require('amazon-cognito-identity-js');
    if (cognitoModule) {
      CognitoUserPool = cognitoModule.CognitoUserPool;
      CognitoUser = cognitoModule.CognitoUser;
      AuthenticationDetails = cognitoModule.AuthenticationDetails;
      CognitoUserAttribute = cognitoModule.CognitoUserAttribute;
      CognitoUserSession = cognitoModule.CognitoUserSession;
    }
  } catch (error: any) {
    // Silently fail in demo mode - Cognito is optional
    if (process.env.NODE_ENV === 'development') {
      console.warn('Cognito not available (demo mode):', error?.message || error);
    }
  }
}

// Only load in browser environment
if (typeof window !== 'undefined') {
  loadCognito();
}

// Initialize Cognito User Pool
const getUserPool = () => {
  // Only work in browser
  if (typeof window === 'undefined' || !CognitoUserPool) {
    return null;
  }

  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '';
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '';

  if (!userPoolId || !clientId) {
    // Demo mode: Return null instead of throwing error
    return null;
  }

  try {
    return new CognitoUserPool({
      UserPoolId: userPoolId,
      ClientId: clientId,
    });
  } catch (error) {
    console.warn('Error creating Cognito User Pool:', error);
    return null;
  }
};

export interface SignUpParams {
  email: string;
  password: string;
  name?: string;
  locale?: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

/**
 * Sign up a new user
 */
export async function signUp({ email, password, name, locale }: SignUpParams): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve, reject) => {
    const userPool = getUserPool();
    
    if (!userPool) {
      reject({ success: false, message: 'Authentication not configured. Running in demo mode.' });
      return;
    }
    
    const attributeList = [
      new CognitoUserAttribute({ Name: 'email', Value: email }),
    ];

    if (name) {
      attributeList.push(new CognitoUserAttribute({ Name: 'name', Value: name }));
    }

    if (locale) {
      attributeList.push(new CognitoUserAttribute({ Name: 'locale', Value: locale }));
    }

    userPool.signUp(email, password, attributeList, [], (err: any, result: any) => {
      if (err) {
        reject({ success: false, message: err.message || 'Sign up failed' });
        return;
      }

      if (result) {
        resolve({
          success: true,
          message: 'User registered successfully. Please check your email to verify your account.',
        });
      }
    });
  });
}

/**
 * Sign in user
 */
export async function signIn({ email, password }: SignInParams): Promise<any> {
  return new Promise((resolve, reject) => {
    const userPool = getUserPool();
    
    if (!userPool) {
      reject(new Error('Authentication not configured. Running in demo mode.'));
      return;
    }
    
    const authenticationDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (session: any) => {
        resolve(session);
      },
      onFailure: (err: any) => {
        reject(err);
      },
    });
  });
}

/**
 * Sign out user
 */
export function signOut(): void {
  const userPool = getUserPool();
  if (!userPool) return;
  
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }
}

/**
 * Get current user session
 */
export async function getCurrentSession(): Promise<any | null> {
  return new Promise((resolve) => {
    const userPool = getUserPool();
    if (!userPool) {
      resolve(null);
      return;
    }
    
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      resolve(null);
      return;
    }

    cognitoUser.getSession((err: Error | null, session: any | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }
      resolve(session);
    });
  });
}

/**
 * Get current user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  return session.getIdToken().payload.sub;
}

/**
 * Get current user email
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  return session.getIdToken().payload.email;
}

/**
 * Verify email with code
 */
export async function verifyEmail(email: string, code: string): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve, reject) => {
    const userPool = getUserPool();
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.confirmRegistration(code, true, (err: any, result: any) => {
      if (err) {
        reject({ success: false, message: err.message || 'Verification failed' });
        return;
      }
      resolve({ success: true, message: 'Email verified successfully' });
    });
  });
}

/**
 * Resend verification code
 */
export async function resendVerificationCode(email: string): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve, reject) => {
    const userPool = getUserPool();
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.resendConfirmationCode((err: any, result: any) => {
      if (err) {
        reject({ success: false, message: err.message || 'Failed to resend code' });
        return;
      }
      resolve({ success: true, message: 'Verification code sent to your email' });
    });
  });
}

