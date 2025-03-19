import { AppBskyActorDefs, AtpSessionData } from '@atproto/api';
import { UserFragment } from './graphql';

export interface AuthUser {
    handle: string;
    email: string;
    did: string;
    avatar: string;
    displayName: string;
    profile: AppBskyActorDefs.ProfileViewDetailed;
    session: AtpSessionData;
    user: UserFragment;
}

export interface AuthStore {
    
}