import { getPage, getPages } from '@/lib/source';
import { DocsPage, DocsBody } from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';

interface Props {
  params: { slug?: string[] };
}

export default function Page({ params }: Props) {
  const page = getPage(params.slug);
  if (!page) notFound();
  const MDX = page.data.body;
  return (
    <DocsPage toc={page.data.toc}>
      <DocsBody>
        <h1>{page.data.title}</h1>
        <MDX />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return getPages().map((p) => ({ slug: p.slugs }));
}

export function generateMetadata({ params }: Props) {
  const page = getPage(params.slug);
  if (!page) notFound();
  return { title: `${page.data.title} — Cortex Docs | Holi Labs` };
}
