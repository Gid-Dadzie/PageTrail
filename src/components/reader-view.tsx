import { useEffect, useRef } from 'react';
import { WebView } from 'react-native-webview';

import { parseReaderMessage, type ReaderTheme } from '@/services/reading';

export type ReaderViewProps = {
  /**
   * Fully self-contained HTML document (styles + scroll script inlined). Used
   * on native, where `fetch` has no CORS restriction so the reader screen can
   * download and theme the text before it gets here.
   */
  html: string;
  /** Web-only fallback URL; ignored on native. */
  url?: string;
  /** Current reading theme; applied live to the already-rendered document. */
  theme: ReaderTheme;
  /** Current font size in px; applied live. */
  fontPx: number;
  /** Reading position, 0..1, reported as the reader scrolls. */
  onProgress: (fraction: number) => void;
  /** A short phrase the reader highlighted, with the sentence it came from. */
  onLookup?: (word: string, context: string) => void;
};

/** JS that repaints the document's CSS variables — no reload, keeps the place. */
function applyStyleJs(theme: ReaderTheme, fontPx: number): string {
  const root = 'document.documentElement.style';
  return `(function(){
    ${root}.setProperty('--bg', '${theme.bg}');
    ${root}.setProperty('--fg', '${theme.fg}');
    ${root}.setProperty('--muted', '${theme.muted}');
    ${root}.setProperty('--accent', '${theme.accent}');
    ${root}.setProperty('--fs', '${fontPx}px');
    document.body.style.background = '${theme.bg}';
  })(); true;`;
}

/**
 * Native reader surface. The document reports its own scroll position through
 * `window.ReactNativeWebView.postMessage`; theme and font changes are pushed in
 * imperatively so the reader keeps its scroll position.
 */
export function ReaderView({ html, theme, fontPx, onProgress, onLookup }: ReaderViewProps) {
  const ref = useRef<WebView>(null);

  useEffect(() => {
    ref.current?.injectJavaScript(applyStyleJs(theme, fontPx));
  }, [theme, fontPx]);

  return (
    <WebView
      ref={ref}
      originWhitelist={['*']}
      source={{ html }}
      // Re-apply on (re)load in case the document mounted after a settings change.
      onLoadEnd={() => ref.current?.injectJavaScript(applyStyleJs(theme, fontPx))}
      style={{ flex: 1, backgroundColor: theme.bg }}
      onMessage={(event) => {
        const message = parseReaderMessage(event.nativeEvent.data);
        if (message?.type === 'progress') onProgress(message.value);
        else if (message?.type === 'lookup') onLookup?.(message.word, message.context);
      }}
    />
  );
}
