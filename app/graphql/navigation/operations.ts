import { graphql } from '~/lib/graphql-tag';

// Import the fragments from the GraphQL file
const NAVIGATION_FRAGMENTS = graphql`
  fragment NavigationItem on NavigationItems {
    id
    navigationId
    parentId
    name
    path
    iconName
    tag
    data
    roles
    createdAt
    index
  }

  fragment Navigation on Navigation {
    id
    name
    key
    data
    createdAt
    navigationItemsCollection(orderBy: [{ index: AscNullsLast }]) {
      edges {
        node {
          ...NavigationItem
        }
      }
    }
  }
`;

// Export the GetAllNavigation query
export const GET_ALL_NAVIGATION = graphql`
  ${NAVIGATION_FRAGMENTS}
  query GetAllNavigation {
    navigationCollection {
      edges {
        node {
          ...Navigation
        }
      }
    }
  }
`;
