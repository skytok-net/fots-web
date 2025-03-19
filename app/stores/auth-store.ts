import { create } from 'zustand';
import { AtpAgent, AtpSessionData, AtpSessionEvent } from '@atproto/api';
import { AuthUser } from '~/types/user';
// Import UserFragment type but not the userRepository directly
import { UserFragment } from '~/types/graphql';

// We'll import the userRepository lazily when needed
const getUserRepository = () => {
  return import('~/repositories/user').then(module => module.userRepository);
};


const defaultService = process.env.ATPROTO_SERVICE || 'https://bsky.social';

interface AuthState {
  agent: AtpAgent | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  error: Error | null;
  login: (identifier: string, password: string, service: string) => Promise<AuthUser | Error>;
  logout: () => void;
  init: () => Promise<void>;
  register: (
    identifier: string, 
    email: string, 
    password: string, 
    service: string,
    firstName: string,
    lastName: string
  ) => Promise<AuthUser | Error>;
}

export const useAuthStore = create<AuthState>((set) => ({
  agent: null,
  user: null,
  isAuthenticated: false,
  error: null,
  login: async (identifier: string, password: string, service: string): Promise<AuthUser | Error> => {
    try {
      const agent = new AtpAgent({ 
        service,
        persistSession: (evt: AtpSessionEvent | undefined, session: AtpSessionData | undefined) => {
            if (typeof(window) === 'undefined') {
                return;
            }
            if (evt === 'create' || evt === 'update') {
                localStorage.setItem('atp-session', JSON.stringify(session));
            } else if (evt === 'expired') {
                localStorage.removeItem('atp-session');
            }
        }
      });
      const res = await agent.login({ identifier, password });
      if (!res.success) {
        throw new Error('Failed to login');
      }

      const profile = await agent.getProfile({actor: res.data.did});

      if (!profile.success) {
        throw new Error('Failed getting profile');
      }

      const repository = await getUserRepository();
      const user = await repository.getUserByDID(res.data.did);

      if (user instanceof Error) {
        throw user as Error;
      }

      if (!user) {
        throw new Error('User not found');
      }
      
      const authUser = {
        user,
        did: user.did,
        handle: user.handle,
        email: user.email,
        avatar: profile.data.avatar,
        displayName: user.metadata.displayName,
        pdsUrl: service,
        profile: profile.data,
        session: agent.session,
      } as AuthUser;

      set({ agent, user: authUser, isAuthenticated: true });

      return authUser;
    } catch (error) {
      console.error('Login failed:', error);
      return error instanceof Error ? error : Error(`Login failed: ${error}`);
    }
  },
  register: async (
    identifier: string, 
    email: string,
    password: string, 
    service: string,
    firstName: string,
    lastName: string
): Promise<AuthUser | Error> => {
    try {
        const displayName = `${firstName} ${lastName}`;

        const agent = new AtpAgent({ 
            service,
            persistSession: (evt: AtpSessionEvent | undefined, session: AtpSessionData | undefined) => {
                if (typeof(window) === 'undefined') {
                    return;
                }
                if (evt === 'create' || evt === 'update') {
                    localStorage.setItem('atp-session', JSON.stringify(session));
                } else if (evt === 'expired') {
                    localStorage.removeItem('atp-session');
                }
            }
        });
        const res = await agent.createAccount({ 
            handle: identifier, 
            password, 
            email 
        });

        if (!res.success) {
            throw new Error('Failed to create account');
        }

        const profile = await agent.getProfile({actor: res.data.did});

        if (!profile.success) {
            throw new Error('Failed getting profile');
        }

        // now, we must check to see if a user exists with the DID and update it...if not create it...
        const repository = await getUserRepository();
        let user = await repository.getUserByDID(res.data.did);

        if (user instanceof Error) {
            throw user as Error;
        }

        if (!user) {
            user = await repository.createUser({
                handle: identifier,
                email,
                pdsUrl: service,
                did: res.data.did,
                firstName,
                lastName,
                metadata: {
                    displayName
                }
            });
        } else {
            user = await repository.updateUser((user as UserFragment).id, {
                handle: identifier,
                email,
                firstName,
                lastName,
                pdsUrl: service,
                metadata: {
                    displayName
                }
            });
        }

        const u = user as UserFragment;

        const authUser = {
            user: u,
            did: u.did,
            handle: u.handle,
            email: u.email,
            avatar: profile.data.avatar,
            displayName,
            pdsUrl: service,
            profile: profile.data,
            session: agent.session,
        } as AuthUser;

        set({ agent, user: authUser, isAuthenticated: true });

        return authUser;
    } catch (error) {
        console.error('Registration failed:', error);
        return error instanceof Error ? error : Error(`Registration failed: ${error}`);
    }
  },
  logout: () => {
    set({ agent: null, isAuthenticated: false });
  },
  init: async () => {
    try {
        const session = localStorage.getItem('atp-session');
        if (session) {
            const agent = new AtpAgent({ service: defaultService });
            const res = await agent.resumeSession(JSON.parse(session));
            if (!res.success) {
                localStorage.removeItem('atp-session');
                set({ agent: null, isAuthenticated: false });
            } else {
                set({ agent, isAuthenticated: true });
            }
        }
    } catch (e) {
        console.error('Failed to initialize session:', e);
        set({ agent: null, isAuthenticated: false });
    }
  }
}));