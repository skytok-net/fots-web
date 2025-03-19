import { graphql } from '~/lib/graphql-tag';

// Export the GetProducts query
export const GET_PRODUCTS = graphql`
  query GetProducts {
    productsCollection {
      edges {
        node {
          id
          name
          productTypeId
          data
          createdAt
        }
      }
    }
  }
`;

// Export the GetProductTypes query
export const GET_PRODUCT_TYPES = graphql`
  query GetProductTypes {
    productTypesCollection {
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
