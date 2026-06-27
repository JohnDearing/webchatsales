/** Production widget/API URLs — keep in sync with backend config */
export const WIDGET_FRONTEND_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.webchatsales.com';

export const WIDGET_API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://webchatsales-swart.vercel.app';

export function buildWidgetEmbedScript(widgetKey: string): string {
  const frontend = WIDGET_FRONTEND_URL.replace(/\/$/, '');
  const api = WIDGET_API_URL.replace(/\/$/, '');
  return `<script src="${frontend}/abby-widget.js" data-widget-key="${widgetKey}" data-api-url="${api}"></script>`;
}
