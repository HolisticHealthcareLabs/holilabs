declare module '@react-pdf/renderer' {
  import * as React from 'react';

  export const Document: React.ComponentType<any>;
  export const Page: React.ComponentType<any>;
  export const Text: React.ComponentType<any>;
  export const View: React.ComponentType<any>;
  export const Image: React.ComponentType<any>;
  export const Font: {
    register: (...args: any[]) => void;
  };
  export const StyleSheet: {
    create: (styles: Record<string, any>) => Record<string, any>;
  };
  export const pdf: (element: React.ReactElement) => {
    toBlob: () => Promise<Blob>;
    toString: () => Promise<string>;
  };
  export const renderToBuffer: (element: React.ReactElement) => Promise<Buffer>;
  export const renderToStream: (element: React.ReactElement) => NodeJS.ReadableStream;
}
