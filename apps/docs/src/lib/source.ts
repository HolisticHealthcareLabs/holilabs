import { loader } from 'fumadocs-core/source';
import { createMDXSource } from 'fumadocs-mdx';
import { docs } from '../../source.config';

export const source = loader({
  baseUrl: '/docs',
  source: createMDXSource(docs),
});

export const { getPage, getPages } = source;
