import { create } from 'zustand';
import { UserFragment } from '~/types/graphql';

interface UserState {
  currentUser: UserFragment | null;
  users: UserFragment[];
  isLoading: boolean;
  error: Error | null;
  
  // Setters
  setCurrentUser: (user: UserFragment | null) => void;
  setUsers: (users: UserFragment[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: Error | null) => void;
  
  // Update actions
  updateUser: (id: string, userData: Partial<UserFragment>) => void;
  addUser: (user: UserFragment) => void;
  removeUser: (userId: string) => void;
  reset: () => void;
}

const initialState = {
  currentUser: null,
  users: [],
  isLoading: false,
  error: null,
};

export const useUserStore = create<UserState>((set) => ({
  ...initialState,
  
  // Setters
  setCurrentUser: (currentUser) => set({ currentUser }),
  setUsers: (users) => set({ users }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  // Update actions
  updateUser: (id, userData) => set((state) => {
    // Update current user if it matches
    const updatedCurrentUser = state.currentUser && state.currentUser.id === id
      ? { ...state.currentUser, ...userData }
      : state.currentUser;
    
    // Update in the users list
    const updatedUsers = state.users.map((user) => 
      user.id === id ? { ...user, ...userData } : user
    );
    
    return {
      currentUser: updatedCurrentUser,
      users: updatedUsers,
    };
  }),
  
  addUser: (user) => set((state) => {
    // Don't add duplicates
    if (state.users.some((u) => u.id === user.id)) {
      return {
        users: state.users.map((u) => 
          u.id === user.id ? { ...u, ...user } : u
        )
      };
    }
    
    return {
      users: [...state.users, user]
    };
  }),
  
  removeUser: (userId) => set((state) => ({
    users: state.users.filter((user) => user.id !== userId),
    // If we're removing the current user, reset it
    currentUser: state.currentUser?.id === userId ? null : state.currentUser
  })),
  
  reset: () => set(initialState)
}));
