// ~/routes/admin.$slug.tsx
import { json, LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { DynamicComponentRenderer } from '~/components/admin/dynamic-component-renderer';

export async function loader({ params }: LoaderFunctionArgs) {
  const slug = params.slug;
  
  if (!slug) {
    throw new Response('Not Found', { status: 404 });
  }
  
  return json({ slug });
}

export default function AdminSlugRoute() {
  const { slug } = useLoaderData<typeof loader>();
  
  return <DynamicComponentRenderer slug={slug} />;
}
