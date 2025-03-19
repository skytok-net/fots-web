import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";

import { PGliteLoader } from '~/components/pglite-loader';
import { usePGlite } from './stores/pglite-store';
import { PGliteMonitor } from '~/components/pglite-monitor';
import { ApolloProvider } from '~/lib/apollo-client';
import { ApolloClient, InMemoryCache, ApolloLink } from '@apollo/client/core/index.js';
import { getClient } from './lib/apollo-client';

import "./tailwind.css";

export const loader = async () => {
  return {
    ENV: {
      APP_BASE_URL: process.env.APP_BASE_URL,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      ATPROTO_SERVICE: process.env.ATPROTO_SERVICE,
      ATPROTO_FEED_HANDLE: process.env.ATPROTO_FEED_HANDLE,
      ATPROTO_FEED_PASSWORD: process.env.ATPROTO_FEED_PASSWORD,
    }
  };
};

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof loader>();
  const { isInitialized } = usePGlite();
  
  // Create Apollo Client safely with error handling
  let client;
  try {
    client = getClient();
  } catch (error) {
    console.error('Error initializing Apollo Client:', error);
    // Provide a fallback client for SSR
    client = new ApolloClient({
      ssrMode: true,
      cache: new InMemoryCache(),
      link: ApolloLink.empty() // Empty link for SSR fallback
    });
  }
  
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="overscroll-x-auto">
        {/* Make ENV available globally */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.process = ${JSON.stringify({
              env: data.ENV,
            })}`,
          }}
        />
        <PGliteLoader fallback={<div>Initializing local database...</div>}>
          <ApolloProvider client={client}>
            <div id="root">
              {children}
              {isInitialized && <div className="status-indicator">Using local database</div>}
            </div>
          </ApolloProvider>
        </PGliteLoader>
        {/* PGlite Monitor - only visible in development */}
        <PGliteMonitor />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
