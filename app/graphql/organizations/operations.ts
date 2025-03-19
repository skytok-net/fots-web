import { graphql } from '~/lib/graphql-tag';

// Export the GetOrganizations query
export const GET_ORGANIZATIONS = graphql`
  query GetOrganizations {
    organizationsCollection {
      edges {
        node {
          id
          name
          organizationTypeId
          data
          createdAt
        }
      }
    }
  }
`;
