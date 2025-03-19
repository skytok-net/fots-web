import { graphql } from '~/lib/graphql-tag';

// Export the GetUsers query
export const GET_USERS = graphql`
  query GetUsers {
    usersCollection {
      edges {
        node {
          id
          email
          name
          data
          createdAt
        }
      }
    }
  }
`;

// Export the GetRoles query
export const GET_ROLES = graphql`
  query GetRoles {
    rolesCollection {
      edges {
        node {
          id
          name
          data
          createdAt
        }
      }
    }
  }
`;

// Export the GetPermissions query
export const GET_PERMISSIONS = graphql`
  query GetPermissions {
    permissionsCollection {
      edges {
        node {
          id
          name
          data
          createdAt
        }
      }
    }
  }
`;

// Export the GetUserPermissions query
export const GET_USER_PERMISSIONS = graphql`
  query GetUserPermissions {
    userPermissionsCollection {
      edges {
        node {
          id
          userId
          permissionId
          data
          createdAt
        }
      }
    }
  }
`;

// Export the GetRolePermissions query
export const GET_ROLE_PERMISSIONS = graphql`
  query GetRolePermissions {
    rolePermissionsCollection {
      edges {
        node {
          id
          roleId
          permissionId
          data
          createdAt
        }
      }
    }
  }
`;
