import { getClient } from "~/lib/apollo-client";
import { eq } from 'drizzle-orm';
import { users } from '~/schema/schema';
import { 
    UsersInsertInput, 
    UsersUpdateInput, 
    CreateUserMutation, 
    UpdateUserMutation, 
    CreateUserMutationVariables,
    UpdateUserMutationVariables,
    UserFragment,
    CreateUserDocument,
    UpdateUserDocument,
    UserQueryVariables,
    UsersDocument,
    UsersQuery,
    UserQuery,
    DeleteUserMutation,
    DeleteUserMutationVariables,
    DeleteUserDocument
 } from "~/types/graphql";
import { BaseRepository } from './base';

export interface UserRepositoryInterface {
    createUser(userInput: UsersInsertInput): Promise<UserFragment | Error>;
    updateUser(id: string, userInput: UsersUpdateInput): Promise<UserFragment | Error>;
    deleteUser(id: string): Promise<Error | null>
    getUser(id: string): Promise<UserFragment | Error | null>;
    getUsers(): Promise<UserFragment[]>;
    getUserByHandle(handle: string): Promise<UserFragment | Error | null>;
    getUserByDID(did: string): Promise<UserFragment | Error | null>;
    syncUser(id: string): Promise<boolean>;
    syncUsers(): Promise<boolean>;
}

export class UserRepository extends BaseRepository implements UserRepositoryInterface {
    // Lazily initialize the client only when needed
    private get client() {
        return getClient();
    }
    
    async createUser(userInput: UsersInsertInput): Promise<UserFragment | Error> {
        try {
            const { data } = await this.client.mutate<
              CreateUserMutation, 
              CreateUserMutationVariables
            >({
              mutation: CreateUserDocument,
              variables: { input: userInput }
            });
      
            if (!data || !data.insertIntoUsersCollection || !data.insertIntoUsersCollection.records.length) {
              throw new Error("Failed to create user");
            }
            
            const newUser = data.insertIntoUsersCollection.records[0] as UserFragment;
            
            // Save to local database
            await this.saveUserToPGlite(newUser);
            
            return newUser;
          } catch (error) {
            console.error("Error creating user:", error);
            return error instanceof Error ? error : new Error(String(error));
          }
    }

    async updateUser(id: string, userInput: UsersUpdateInput): Promise<UserFragment | Error> {
        try {
            const { data } = await this.client.mutate<
              UpdateUserMutation, 
              UpdateUserMutationVariables
            >({
              mutation: UpdateUserDocument,
              variables: { 
                id,
                input: userInput 
              }
            });
      
            if (!data || !data.updateUsersCollection || !data.updateUsersCollection.records.length) {
              throw new Error("Failed to update user");
            }
            
            const updatedUser = data.updateUsersCollection.records[0] as UserFragment;
            
            // Update in local database
            await this.saveUserToPGlite(updatedUser);
            
            return updatedUser;
          } catch (error) {
            console.error("Error updating user:", error);
            return error instanceof Error ? error : new Error(String(error));
          }
    }

    async deleteUser(id: string): Promise<Error | null> {
        try {
            const { data } = await this.client.mutate<DeleteUserMutation, DeleteUserMutationVariables>({
                mutation: DeleteUserDocument,
                variables: { id }
            });

            if (!data || !data.deleteFromUsersCollection || data.deleteFromUsersCollection.affectedCount < 1) {
                throw new Error('Failed to delete user');
            }

            const results = await this.db.delete(users).where(eq(users.id, id)).returning();

            if (results.length < 1) {
                throw new Error('Failed to delete user');
            }

            console.log(`Deleted user ${id} from local database`);

            return null;
        } catch (e) {
            const err: Error = e instanceof Error ? e : new Error(`Failed to delete: ${e}`);
            return err;
        }
    }
    
    async getUser(id: string): Promise<UserFragment | Error | null> {
        try {
            // First try to get from local database
            const localUsers = await this.db
                .select()
                .from(users)
                .where(eq(users.id, id));
                
            if (localUsers && localUsers.length > 0) {
                return this.formatUserFromPGlite(localUsers[0]);
            }
            
            // Fallback to network request
            const { data } = await this.client.query<
                UsersQuery,
                UserQueryVariables
            >({
                query: UsersDocument,
                variables: { id },
                fetchPolicy: 'network-only'
            });
            
            if (!data || !data.usersCollection || !data.usersCollection.edges.length) {
                return null;
            }
            
            const user = data.usersCollection.edges[0].node;
            
            // Save to local database
            await this.saveUserToPGlite(user);
            
            return user;
        } catch (error) {
            console.error("Error getting user:", error);
            return null;
        }
    }
    
    async getUsers(): Promise<UserFragment[]> {
        try {
            // First try to get from local database
            const localUsers = await this.db
                .select()
                .from(users);
                
            if (localUsers && localUsers.length > 0) {
                return localUsers.map(this.formatUserFromPGlite);
            }
            
            // Fallback to network request or if local is empty
            return await this.syncUsers() ? 
                (await this.db.select().from(users)).map(this.formatUserFromPGlite) : 
                [];
        } catch (error) {
            console.error("Error getting users:", error);
            return [];
        }
    }

    async getUserByDID(did: string): Promise<UserFragment | Error | null> {
        try {
            const localUsers = await this.db
            .select()
            .from(users)
            .where(eq(users.did, did));

            if (localUsers && localUsers.length > 0) {
                return this.formatUserFromPGlite(localUsers[0]);
            }

            // Use a custom query approach without filter
            const { data } = await this.client.query<UsersQuery>({ 
                query: UsersDocument,
                fetchPolicy: 'network-only'
            });

            if (!data || !data.usersCollection) {
                return null;
            }

            // Filter the results manually
            const user = data.usersCollection.edges.find(edge => edge.node.did === did)?.node;
            
            if (!user) {
                return null;
            }
            
            await this.saveUserToPGlite(user);

            return user;

        } catch (e) {
            const err: Error = e instanceof Error ? e : Error(`Failed querying user: ${e}`);
            return err;
        }
    }
    
    async getUserByHandle(handle: string): Promise<UserFragment | Error | null> {
        try {
            // First try to get from local database
            const localUsers = await this.db
                .select()
                .from(users)
                .where(eq(users.handle, handle));
                
            if (localUsers && localUsers.length > 0) {
                return this.formatUserFromPGlite(localUsers[0]);
            }
            
            // Use a custom query approach without filter
            const { data } = await this.client.query<UsersQuery>({
                query: UsersDocument,
                fetchPolicy: 'network-only'
            });
            
            if (!data || !data.usersCollection) {
                return null;
            }

            // Filter the results manually
            const user = data.usersCollection.edges.find(edge => edge.node.handle === handle)?.node;
            
            if (!user) {
                return null;
            }
            
            // Save to local database
            await this.saveUserToPGlite(user);
            
            return user;
        } catch (error) {
            console.error("Error getting user by handle:", error);
            return null;
        }
    }
    
    async syncUser(id: string): Promise<boolean> {
        try {
            const { data } = await this.client.query<
                UserQuery,
                UserQueryVariables
            >({
                query: UsersDocument,
                variables: { id },
                fetchPolicy: 'network-only'
            });
            
            if (!data || !data.usersCollection || !data.usersCollection.edges.length) {
                return false;
            }
            
            const user = data.usersCollection.edges[0].node;
            
            // Save to local database
            await this.saveUserToPGlite(user);
            
            return true;
        } catch (error) {
            console.error("Error syncing user:", error);
            return false;
        }
    }
    
    async syncUsers(): Promise<boolean> {
        try {
            const { data } = await this.client.query<
                UsersQuery
            >({
                query: UsersDocument,
                fetchPolicy: 'network-only'
            });
            
            if (!data || !data.usersCollection) {
                return false;
            }
            
            const usersList = data.usersCollection.edges.map(edge => edge.node);
            
            // Get PGlite client from underlying pglite instance for transaction support
            const pgliteClient = this.db.$client;
            
            // Begin transaction
            await pgliteClient.exec('BEGIN');
            
            try {
                // Clear existing users
                await this.db.delete(users);
                
                // Insert all users
                if (usersList.length > 0) {
                    for (const user of usersList) {
                        await this.saveUserToPGliteInTransaction(user);
                    }
                }
                
                // Commit transaction
                await pgliteClient.exec('COMMIT');
                console.log(`Synced ${usersList.length} users to local database`);
                return true;
            } catch (error) {
                // Rollback on error
                await pgliteClient.exec('ROLLBACK');
                throw error;
            }
        } catch (error) {
            console.error("Error syncing users:", error);
            return false;
        }
    }
    
    // Private helper to save user to PGlite
    private async saveUserToPGlite(user: UserFragment): Promise<void> {
        try {
            // Get PGlite client from underlying pglite instance for transaction support
            const pgliteClient = this.db.$client;
            
            // Begin transaction
            await pgliteClient.exec('BEGIN');
            
            try {
                await this.saveUserToPGliteInTransaction(user);
                
                // Commit transaction
                await pgliteClient.exec('COMMIT');
            } catch (error) {
                // Rollback on error
                await pgliteClient.exec('ROLLBACK');
                throw error;
            }
        } catch (error) {
            console.error("Error saving user to PGlite:", error);
            throw error;
        }
    }
    
    // Helper for transaction-based saves
    private async saveUserToPGliteInTransaction(user: UserFragment): Promise<void> {
        // Check if user exists
        const existingUsers = await this.db
            .select()
            .from(users)
            .where(eq(users.id, user.id));
            
        if (existingUsers && existingUsers.length > 0) {
            // Update existing user
            await this.db
                .update(users)
                .set({
                    did: user.did,
                    handle: user.handle,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    pdsUrl: user.pdsUrl,
                    metadata: user.metadata,
                    updatedAt: new Date(user.updatedAt || user.createdAt),
                    syncedAt: new Date()
                })
                .where(eq(users.id, user.id));
        } else {
            // Insert new user
            await this.db
                .insert(users)
                .values({
                    id: user.id,
                    did: user.did,
                    handle: user.handle,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    pdsUrl: user.pdsUrl,
                    metadata: user.metadata,
                    createdAt: new Date(user.createdAt),
                    updatedAt: user.updatedAt ? new Date(user.updatedAt) : null,
                    syncedAt: new Date()
                });
        }
    }
    
    // Format a user from PGlite to match the GraphQL fragment
    private formatUserFromPGlite(dbUser: DbUser): UserFragment {
        return {
            __typename: 'Users',
            id: dbUser.id,
            did: dbUser.did || '',
            handle: dbUser.handle || '',
            email: dbUser.email || '',
            firstName: dbUser.firstName || '',
            lastName: dbUser.lastName || '',
            pdsUrl: dbUser.pdsUrl || '',
            metadata: dbUser.metadata,
            createdAt: dbUser.createdAt.toISOString(),
            updatedAt: dbUser.updatedAt ? dbUser.updatedAt.toISOString() : null
        };
    }
}

// Database user interface
interface DbUser {
    id: string;
    did: string | null;
    handle: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    pdsUrl: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date | null;
    primaryStationId?: string | null;
    syncedAt?: Date;
}

export const userRepository = new UserRepository();