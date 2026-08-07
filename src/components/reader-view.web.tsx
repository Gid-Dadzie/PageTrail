import { useEffect } from 'react';

import { parseReaderMessage, type ReaderTheme } from '@/services/reading';

export type ReaderViewProps = {
  /** Self-contained HTML document; used when no direct `url` is given. */
  html: string;
  /**
   * Direct source URL for the book. Browsers block `fetch` to Gutenberg (CORS),
   * but an iframe may still *load* it cross-origin, so on web the reader points
   * the frame straight at the URL instead of downloading and theming the text.
   */
  url?: string;
  /** Accepted for a common interface; a cross-origin iframe can't be restyled. */
  theme: ReaderTheme;
  fontPx: number;
  /** Reading position, 0..1. Only reported for the themed `html` document. */
  onProgress: (fraction: number) => void;
  /**
   * A short phrase the reader highlighted. Like progress, this only arrives from
   * our own themed document — a cross-origin iframe keeps its selection to itself.
   */
  onLookup?: (word: string, context: string) => void;
};

export function ReaderView({ html, url, theme, onProgress, onLookup }: ReaderViewProps) {
  useEffect(() => {
    // Messages only arrive from our own themed document (srcDoc); a cross-origin
    // iframe (url) cannot post back, so this simply stays idle in that case.
    const handler = (event: MessageEvent) => {
      const message = parseReaderMessage((event.data as { pagetrail?: unknown })?.pagetrail);
      if (message?.type === 'progress') onProgress(message.value);
      else if (message?.type === 'lookup') onLookup?.(message.word, message.context);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onProgress, onLookup]);

  const frameProps = url ? { src: url } : { srcDoc: html };

  return (
    <iframe
      title="Reader"
      {...frameProps}
      style={{
        flex: 1,
        border: 'none',
        width: '100%',
        height: '100%',
        backgroundColor: theme.bg,
      }}
    />
  );
}
