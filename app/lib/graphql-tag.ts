/**
 * Re-export the graphql-tag library's gql function as graphql
 * This is ESM compatible and provides the same functionality as the original gql
 * 
 * The graphql-tag library is specifically designed to be compatible with
 * Apollo Client and properly handles the DocumentNode type requirements.
 */
import gql from 'graphql-tag';
import { DocumentNode } from 'graphql';

// Export the gql function with our preferred name
// This maintains the same TypeScript type compatibility as the original gql function
export const graphql = gql;

// Type helper for TypeScript to recognize our graphql function properly
export type GraphQLTaggedNode = DocumentNode;

