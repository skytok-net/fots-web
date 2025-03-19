import { graphql } from '~/lib/graphql-tag';

// Export the GetStations query
export const GET_STATIONS = graphql`
  query GetStations {
    stationsCollection {
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
