'use client';

import { useEffect, useState } from 'react';
import { getAuthHeaders, handleAuthError, getAdminUser, isSuperAdmin } from '../../utils/auth';
import { buildWidgetEmbedScript } from '../../config/widget';
import { API_BASE_URL } from '@/app/config/api';

const FRONTEND_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

type ClientOption = {
  _id: string;
  name: string;
  widgetKey: string;
  status?: string;
  companyWebsite?: string;
  isPlatformTenant?: boolean;
};

type PlatformGuide = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
};

const PLATFORMS: PlatformGuide[] = [
  {
    id: 'wordpress',
    title: 'WordPress',
    summary: 'Best for most contractor sites using WordPress.',
    steps: [
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
    summary: 'For hand-coded sites or simple landing pages.',
    steps: [
      'Open your site template or index.html in your editor.',
      'Paste the embed snippet immediately before the closing </body> tag.',
      'Deploy or upload the updated file to your host.',
      'Visit the live site — a "Chat with Abby" button should appear bottom-right.',
    ],
  },
  {
    id: 'shopify',
    title: 'Shopify',
    summary: 'Add Abby to every storefront page.',
    steps: [
      'Go to Online Store → Themes → Edit code.',
      'Open Layout → theme.liquid.',
      'Paste the embed snippet just before </body>.',
      'Save and preview the storefront.',
    ],
  },
  {
    id: 'wix',
    title: 'Wix',
    summary: 'Site-wide install via Wix custom code.',
    steps: [
      'Open Settings → Custom Code (or Marketing & SEO → Custom Code).',
      'Add new code → place in Body - end.',
      'Paste the embed snippet and apply to All pages.',
      'Publish the site and test on the live URL.',
    ],
  },
  {
    id: 'squarespace',
    title: 'Squarespace',
    summary: 'Footer injection for Squarespace sites.',
    steps: [
      'Go to Settings → Advanced → Code Injection.',
      'Paste the embed snippet in the Footer field.',
      'Save and refresh the published site.',
    ],
  },
  {
    id: 'webflow',
    title: 'Webflow',
    summary: 'Project-wide footer embed.',
    steps: [
      'Open Project Settings → Custom Code.',
      'Paste the embed snippet in Footer Code.',
      'Publish the site and verify on the live domain.',
    ],
  },
  {
    id: 'react',
    title: 'React / Next.js / Vue',
    summary: 'Single-page apps and modern frameworks.',
    steps: [
      'Add the script to your root layout (e.g. app/layout.tsx or public/index.html).',
      'Place it once, before </body>, so it loads on every route.',
      'For Next.js App Router, use next/script with strategy="lazyOnload" if preferred.',
      'Ensure the client domain is in the allowed domains list in the admin panel.',
    ],
  },
];

function buildWidgetLink(widgetKey: string): string {
  const frontendBase = FRONTEND_URL.replace(/\/$/, '');
  return `${frontendBase}/widget?widgetKey=${encodeURIComponent(widgetKey)}`;
}

type InstallGuidePanelProps = {
  initialClientId?: string | null;
  onClearInitialClient?: () => void;
};

export default function InstallGuidePanel({
  initialClientId,
  onClearInitialClient,
}: InstallGuidePanelProps) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [expandedPlatform, setExpandedPlatform] = useState('wordpress');
  const [copyMessage, setCopyMessage] = useState('');
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  const superAdmin = isSuperAdmin();
  const adminUser = getAdminUser();

  useEffect(() => {
    if (initialClientId) {
      setSelectedClientId(initialClientId);
      onClearInitialClient?.();
    }
  }, [initialClientId, onClearInitialClient]);

  useEffect(() => {
    if (superAdmin) {
      fetchClients();
    } else if (adminUser?.clientId) {
      setSelectedClientId(adminUser.clientId);
    }
  }, [superAdmin, adminUser?.clientId]);

  const fetchClients = async () => {
    setIsLoadingClients(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tenants?limit=200`, {
        headers: getAuthHeaders(),
      });
      if (handleAuthError(response)) return;
      const data = await response.json();
      if (data.success) {
        const list = (data.clients || []).filter(
          (c: ClientOption) => c.isPlatformTenant !== true,
        );
        setClients(list);
        if (!selectedClientId && list.length > 0) {
          setSelectedClientId(list[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingClients(false);
    }
  };

  const selectedClient =
    clients.find((c) => c._id === selectedClientId) ||
    (superAdmin ? null : clients[0]);

  const widgetKey = selectedClient?.widgetKey || 'YOUR_WIDGET_KEY';
  const embedScript = buildWidgetEmbedScript(widgetKey);
  const previewLink = widgetKey !== 'YOUR_WIDGET_KEY' ? buildWidgetLink(widgetKey) : '';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyMessage(`${label} copied.`);
    setTimeout(() => setCopyMessage(''), 2500);
  };

  const panelClass = 'border rounded-lg p-4 sm:p-5';
  const panelStyle = { borderColor: 'var(--line)', background: 'var(--panel)' };

  return (
    <div className="space-y-6 min-w-0">
      <div className="dashboard-section-header">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--ink)' }}>
            Install Abby on a Client Site
          </h2>
          <p className="text-sm mt-1 max-w-2xl" style={{ color: 'var(--muted)' }}>
            Step-by-step instructions for WordPress, Shopify, custom HTML, and other platforms.
            Share the embed code with your client after setting their account to Test or Live.
          </p>
        </div>
      </div>

      {copyMessage && (
        <div
          className="p-3 rounded border text-sm"
          style={{ borderColor: 'var(--emerald)', color: 'var(--emerald)' }}
        >
          {copyMessage}
        </div>
      )}

      {/* Prerequisites */}
      <section className={panelClass} style={panelStyle}>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>
          Before you install
        </h3>
        <ol className="space-y-2 text-sm list-decimal list-inside" style={{ color: 'var(--muted)' }}>
          <li>
            <span style={{ color: 'var(--ink)' }}>Set client status to </span>
            <strong style={{ color: 'var(--emerald)' }}>Test</strong> or{' '}
            <strong style={{ color: 'var(--emerald)' }}>Live</strong> — Draft blocks the widget.
          </li>
          <li>
            <span style={{ color: 'var(--ink)' }}>Add the client&apos;s domain</span> (e.g.{' '}
            <code className="text-xs">theirbusiness.com</code>) in Clients → Edit → Allowed domains.
          </li>
          <li>
            <span style={{ color: 'var(--ink)' }}>Use the production URL</span> — never{' '}
            <code className="text-xs">localhost</code> on a live client site.
          </li>
          <li>
            Paste the snippet <span style={{ color: 'var(--ink)' }}>before </span>
            <code className="text-xs">&lt;/body&gt;</code> on every page (or site-wide footer).
          </li>
        </ol>
      </section>

      {/* Client + embed code */}
      <section className={panelClass} style={panelStyle}>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>
          Embed code
        </h3>

        {superAdmin && (
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
              Select client
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              disabled={isLoadingClients}
              className="w-full sm:max-w-md px-3 py-2 text-sm border rounded"
              style={{
                borderColor: 'var(--line)',
                background: 'var(--bg)',
                color: 'var(--ink)',
              }}
            >
              <option value="">Choose a client…</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.status || 'draft'})
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedClient && (
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <span
              className="px-2 py-1 rounded capitalize"
              style={{
                background:
                  selectedClient.status === 'live'
                    ? 'rgba(34, 197, 94, 0.15)'
                    : selectedClient.status === 'test'
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(107, 114, 128, 0.15)',
                color: 'var(--ink)',
              }}
            >
              Status: {selectedClient.status || 'draft'}
            </span>
            {selectedClient.companyWebsite && (
              <span className="px-2 py-1 rounded" style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
                {selectedClient.companyWebsite}
              </span>
            )}
          </div>
        )}

        <pre
          className="p-3 rounded text-xs overflow-x-auto mb-3"
          style={{ background: 'var(--bg)', color: 'var(--ink)' }}
        >
          {embedScript}
        </pre>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copyToClipboard(embedScript, 'Embed code')}
            className="px-4 py-2 text-sm font-medium text-black rounded bg-gradient-emerald"
          >
            Copy embed code
          </button>
          {previewLink && (
            <>
              <a
                href={previewLink}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 text-sm rounded border"
                style={{ borderColor: 'var(--line)', color: 'var(--emerald)' }}
              >
                Open preview
              </a>
              <button
                type="button"
                onClick={() => copyToClipboard(previewLink, 'Preview link')}
                className="px-4 py-2 text-sm rounded border"
                style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
              >
                Copy preview link
              </button>
            </>
          )}
        </div>

        <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
          Optional: if your API runs on a different domain, add{' '}
          <code className="text-xs">data-api-url=&quot;https://your-api.com&quot;</code> to the script tag.
        </p>
      </section>

      {/* Platform guides */}
      <section className={panelClass} style={panelStyle}>
        <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
          Installation by platform
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
          Send these steps to your client along with their embed code.
        </p>

        <div className="space-y-2">
          {PLATFORMS.map((platform) => {
            const isOpen = expandedPlatform === platform.id;
            return (
              <div
                key={platform.id}
                className="border rounded-lg overflow-hidden"
                style={{ borderColor: 'var(--line)' }}
              >
                <button
                  type="button"
                  onClick={() => setExpandedPlatform(isOpen ? '' : platform.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                  style={{ background: isOpen ? 'var(--bg)' : 'transparent' }}
                >
                  <div>
                    <span className="font-medium text-sm" style={{ color: 'var(--ink)' }}>
                      {platform.title}
                    </span>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      {platform.summary}
                    </p>
                  </div>
                  <span className="text-lg shrink-0" style={{ color: 'var(--muted)' }}>
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <ol
                    className="px-4 pb-4 pt-1 space-y-2 text-sm list-decimal list-inside border-t"
                    style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
                  >
                    {platform.steps.map((step, i) => (
                      <li key={i}>
                        <span style={{ color: 'var(--ink)' }}>{step}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Client email template */}
      <section className={panelClass} style={panelStyle}>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>
          Email template for clients
        </h3>
        <pre
          className="p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap"
          style={{ background: 'var(--bg)', color: 'var(--ink)' }}
        >
          {`Subject: Add Abby to your website

Hi [Client name],

Your Abby chat assistant is ready. Add this one line to your website footer (before </body>):

${embedScript}

Once added, a "Chat with Abby" button will appear on your site.

Need help? Reply with your platform (WordPress, Wix, etc.) and we can walk you through it.

— WebChatSales Team`}
        </pre>
        <button
          type="button"
          onClick={() =>
            copyToClipboard(
              `Add this to your website footer (before </body>):\n\n${embedScript}\n\nA "Chat with Abby" button will appear on your site.`,
              'Client message',
            )
          }
          className="mt-3 px-4 py-2 text-sm rounded border"
          style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
        >
          Copy client message
        </button>
      </section>

      {/* Verify */}
      <section className={panelClass} style={panelStyle}>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>
          Verify installation
        </h3>
        <ul className="space-y-2 text-sm" style={{ color: 'var(--muted)' }}>
          <li>1. Visit the client&apos;s live site (not localhost).</li>
          <li>2. Confirm the chat button appears in the bottom corner.</li>
          <li>3. Send a test message — it should appear under Conversations for that client.</li>
          <li>4. In Clients → Edit, check install status after the widget loads on their domain.</li>
        </ul>
      </section>
    </div>
  );
}
