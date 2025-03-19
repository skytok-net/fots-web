import { graphql } from '~/lib/graphql-tag';

// Import the fragments from the GraphQL file
const NOTIFICATION_FRAGMENTS = graphql`
  fragment NotificationFragment on Notifications {
    id
    title
    subtitle
    createdAt
    data
    isRead
    iconUrl
    messageMarkdown
    notificationTypeId
    notificationType {
      id
      iconUrl
      name
      schema
      createdAt
    }
  }
`;

// Export the GetAllNotifications query
export const GET_ALL_NOTIFICATIONS = graphql`
  ${NOTIFICATION_FRAGMENTS}
  query GetAllNotifications($filter: NotificationsFilter) {
    notificationsCollection(filter: $filter, orderBy: [{createdAt: DescNullsLast}]) {
      edges {
        node {
          ...NotificationFragment
          userId
        }
      }
    }
  }
`;

// Export the UpdateNotificationRecord mutation
export const UPDATE_NOTIFICATION_RECORD = graphql`
  mutation UpdateNotificationRecord($id: UUID!, $input: NotificationsUpdateInput!) {
    updateNotificationsCollection(set: $input, filter: {id: {eq: $id}}) {
      records {
        id
        isRead
      }
    }
  }
`;
