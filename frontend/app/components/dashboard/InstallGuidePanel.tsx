'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAuthHeaders, handleAuthError } from '../../utils/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';
const WIDGET_BASE_URL =
  process.env.NEXT_PUBLIC_WIDGET_URL ||
  process.env.NEXT_PUBLIC_FRONTEND_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'https://www.webchatsales.com');

type ClientStatus = 'draft' | 'test' | 'live';

type Client = {
  _id: string;
  name: string;
  widgetKey: string;
  companyWebsite?: string;
  status?: ClientStatus;
  isPlatformTenant?: boolean;
};

type PlatformGuide = {
  id: string;
  title: string;
  defaultOpen?: boolean;
  steps: string[];
};

const PLATFORMS: PlatformGuide[] = [
  {
    id: 'wordpress',
    title: 'WordPress',
    defaultOpen: true,
    steps: [
      'Best for most contractor sites using WordPress.',
      'Install a footer script plugin such as "WPCode" or "Insert Headers and Footers".',
      'Open the plugin and go to the Footer (before </body>) section.',
      'Paste the Abby embed snippet and save.',
      'Alternative: Appearance → Theme File Editor → footer.php → paste before </body>.',
      'Clear any cache plugin (WP Rocket, LiteSpeed, etc.) and reload the site.',
    ],
  },
  {
    id: 'html',
    title: 'Custom HTML / Static site',
    steps: [
      'For hand-coded sites or simple landing pages.',
      'Open your HTML file or site template.',
      'Paste the embed snippet immediately before the closing </body> tag.',
      'Deploy or upload the updated file to your host.',
      'Reload the page and confirm the chat button appears.',
    ],
  },
  {
    id: 'shopify',
    title: 'Shopify',
    steps: [
      'Add Abby to every storefront page.',
      'In Shopify admin, go to Online Store → Themes → Edit code.',
      'Open theme.liquid (or your main layout file).',
      'Paste the embed snippet before </body> and save.',
      'Preview the storefront and send a test message.',
    ],
  },
  {
    id: 'wix',
    title: 'Wix',
    steps: [
      'Site-wide install via Wix custom code.',
      'Open Settings → Custom Code → Add Custom Code.',
      'Choose "Body - end" placement.',
      'Paste the Abby embed snippet and apply to all pages.',
      'Publish the site and verify the widget on a live page.',
    ],
  },
  {
    id: 'squarespace',
    title: 'Squarespace',
    steps: [
      'Footer injection for Squarespace sites.',
      'Go to Settings → Advanced → Code Injection.',
      'Paste the embed snippet into the Footer field.',
      'Save and refresh your live site.',
    ],
  },
  {
    id: 'webflow',
    title: 'Webflow',
    steps: [
      'Project-wide footer embed.',
      'Open Project Settings → Custom Code.',
      'Add the embed snippet to Footer Code.',
      'Publish the site and test on the live URL.',
    ],
  },
  {
    id: 'react',
    title: 'React / Next.js / Vue',
    steps: [
      'Single-page apps and modern frameworks.',
      'Add the script tag to your root layout (e.g. app/layout.tsx or index.html).',
      'Place it before </body> so it loads on every route.',
      'Set data-api-url to your production API domain.',
      'Rebuild and deploy, then test on the client\'s live domain.',
    ],
  },
];

function buildEmbedScript(widgetKey: string): string {
  const base = WIDGET_BASE_URL.replace(/\/$/, '');
  const api = API_BASE_URL.replace(/\/$/, '');
  return `<script src="${base}/abby-widget.js" data-widget-key="${widgetKey}" data-api-url="${api}"></script>`;
}

function buildPreviewLink(widgetKey: string): string {
  const base = WIDGET_BASE_URL.replace(/\/$/, '');
  return `${base}/widget?widgetKey=${encodeURIComponent(widgetKey)}`;
}

function buildClientEmail(clientName: string, embedScript: string): string {
  return `Subject: Add Abby to your website

Hi ${clientName},

Your Abby chat assistant is ready. Add this one line to your website footer (before </body>):

${embedScript}

Once added, a "Chat with Abby" button will appear on your site.

Need help? Reply with your platform (WordPress, Wix, etc.) and we can walk you through it.

— WebChatSales Team`;
}

export default function InstallGuidePanel() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ wordpress: true });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tenants?limit=200`, {
        headers: getAuthHeaders(),
      });
      if (handleAuthError(response)) return;
      const data = await response.json();
      if (data.success) {
        const list = (data.clients || []).filter((c: Client) => !c.isPlatformTenant);
        setClients(list);
        if (list.length > 0 && !selectedId) {
          setSelectedId(list[0]._id);
        }
      }
    } catch {
      setMessage('Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedClient = useMemo(
    () => clients.find((c) => c._id === selectedId) || null,
    [clients, selectedId],
  );

  const embedScript = selectedClient ? buildEmbedScript(selectedClient.widgetKey) : '';
  const previewLink = selectedClient ? buildPreviewLink(selectedClient.widgetKey) : '';
  const clientEmail = selectedClient
    ? buildClientEmail(selectedClient.name, embedScript)
    : '';

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`${label} copied to clipboard.`);
      setTimeout(() => setMessage(''), 2500);
    } catch {
      setMessage(`Could not copy ${label.toLowerCase()}`);
    }
  };

  const togglePlatform = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const statusLabel = selectedClient?.status || 'draft';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>
          Install Abby on a Client Site
        </h2>
        <p className="text-sm mt-2 max-w-3xl" style={{ color: 'var(--muted)' }}>
          Step-by-step instructions for WordPress, Shopify, custom HTML, and other platforms.
          Share the embed code with your client after setting their account to Test or Live.
        </p>
      </div>

      {message && (
        <div className="p-3 rounded border text-sm" style={{ borderColor: 'var(--emerald)', color: 'var(--emerald)' }}>
          {message}
        </div>
      )}

      <section className="border rounded-lg p-4 sm:p-6" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>Before you install</h3>
        <ul className="space-y-2 text-sm list-disc pl-5" style={{ color: 'var(--muted)' }}>
          <li><strong style={{ color: 'var(--ink)' }}>Set client status to Test or Live</strong> — Draft blocks the widget.</li>
          <li><strong style={{ color: 'var(--ink)' }}>Add the client&apos;s domain</strong> (e.g. theirbusiness.com) in Clients → Edit → Allowed domains.</li>
          <li><strong style={{ color: 'var(--ink)' }}>Use the production URL</strong> — never localhost on a live client site.</li>
          <li><strong style={{ color: 'var(--ink)' }}>Paste the snippet before &lt;/body&gt;</strong> on every page (or site-wide footer).</li>
        </ul>
      </section>

      <section className="border rounded-lg p-4 sm:p-6 space-y-4" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>Embed code</h3>

        {isLoading ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading clients...</p>
        ) : clients.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No clients yet. Add a client under the Clients tab first.</p>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Select client</label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm"
                  style={{ borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--ink)' }}
                >
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name} ({client.status || 'draft'})
                    </option>
                  ))}
                </select>
              </div>
              {selectedClient && (
                <div className="text-sm space-y-1">
                  <p style={{ color: 'var(--ink)' }}>
                    Status: <span className="capitalize">{statusLabel}</span>
                  </p>
                  {selectedClient.companyWebsite && (
                    <p style={{ color: 'var(--muted)' }}>{selectedClient.companyWebsite}</p>
                  )}
                </div>
              )}
            </div>

            <pre
              className="p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all"
              style={{ background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--line)' }}
            >
              {embedScript}
            </pre>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copyText(embedScript, 'Embed code')}
                className="px-4 py-2 text-sm font-medium text-black rounded bg-gradient-emerald"
              >
                Copy embed code
              </button>
              {previewLink && (
                <>
                  <a
                    href={previewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm rounded border"
                    style={{ borderColor: 'var(--line)', color: 'var(--emerald)' }}
                  >
                    Open preview
                  </a>
                  <button
                    type="button"
                    onClick={() => copyText(previewLink, 'Preview link')}
                    className="px-4 py-2 text-sm rounded border"
                    style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
                  >
                    Copy preview link
                  </button>
                </>
              )}
            </div>

            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Optional: if your API runs on a different domain, add{' '}
              <code>data-api-url=&quot;https://your-api.com&quot;</code> to the script tag.
            </p>
          </>
        )}
      </section>

      <section className="border rounded-lg p-4 sm:p-6" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
        <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>Installation by platform</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
          Send these steps to your client along with their embed code.
        </p>

        <div className="space-y-2">
          {PLATFORMS.map((platform) => {
            const isOpen = expanded[platform.id] ?? platform.defaultOpen ?? false;
            return (
              <div key={platform.id} className="border rounded-lg" style={{ borderColor: 'var(--line)' }}>
                <button
                  type="button"
                  onClick={() => togglePlatform(platform.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  style={{ color: 'var(--ink)' }}
                >
                  <span className="font-medium">{platform.title}</span>
                  <span style={{ color: 'var(--muted)' }}>{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4">
                    <ol className="space-y-2 text-sm list-decimal pl-5" style={{ color: 'var(--muted)' }}>
                      {platform.steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="border rounded-lg p-4 sm:p-6 space-y-3" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>Email template for clients</h3>
        <pre
          className="p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap"
          style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--line)' }}
        >
          {clientEmail || 'Select a client to generate the email template.'}
        </pre>
        {selectedClient && (
          <button
            type="button"
            onClick={() => copyText(clientEmail, 'Client message')}
            className="px-4 py-2 text-sm font-medium text-black rounded bg-gradient-emerald"
          >
            Copy client message
          </button>
        )}
      </section>

      <section className="border rounded-lg p-4 sm:p-6" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>Verify installation</h3>
        <ol className="space-y-2 text-sm list-decimal pl-5" style={{ color: 'var(--muted)' }}>
          <li>Visit the client&apos;s live site (not localhost).</li>
          <li>Confirm the chat button appears in the bottom corner.</li>
          <li>Send a test message — it should appear under Conversations for that client.</li>
          <li>In Clients → Edit, check install status after the widget loads on their domain.</li>
        </ol>
      </section>
    </div>
  );
}
