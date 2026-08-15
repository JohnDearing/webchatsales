'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';

type TroubleshootItem = {
  question: string;
  answer: string;
  steps?: string[];
};

type TroubleshootCategory = {
  title: string;
  description: string;
  items: TroubleshootItem[];
};

const CATEGORIES: TroubleshootCategory[] = [
  {
    title: 'Abby chat',
    description: 'Issues while chatting with Abby on your website or webchatsales.com.',
    items: [
      {
        question: 'Abby says “Sorry, I ran into an issue processing that…”',
        answer:
          'This usually means the AI service could not complete the reply (often temporary, or OpenAI billing/credits).',
        steps: [
          'Wait 1–2 minutes and send the message again.',
          'Hard refresh the page (or close and reopen the chat).',
          'If every message fails, confirm OpenAI billing has an active payment method and credits.',
          'Still stuck? Email hello@webchatsales.com with the time and page URL.',
        ],
      },
      {
        question: 'Abby does not reply at all',
        answer: 'The chat may not be reaching the server, or the AI service is unavailable.',
        steps: [
          'Check your internet connection.',
          'Refresh the page and try a short new message.',
          'Confirm the widget is Test or Live (not Draft) in the dashboard.',
          'Contact support if it continues for more than a few minutes.',
        ],
      },
      {
        question: 'Abby asks for my email too early',
        answer:
          'Abby should qualify longer and handle objections before asking for email. Start a fresh chat after a hard refresh so you get the latest conversation flow.',
        steps: [
          'Hard refresh the site.',
          'Open a new chat session (close the widget, reopen).',
          'If it still happens immediately, tell the team — the latest prompt update may need a redeploy.',
        ],
      },
      {
        question: 'Abby keeps repeating the same question',
        answer: 'She may have missed context from an earlier answer.',
        steps: [
          'Answer once more in a clear short sentence.',
          'Or start a new chat and continue.',
        ],
      },
    ],
  },
  {
    title: 'Website widget / install',
    description: 'Problems with the chat bubble on a client website.',
    items: [
      {
        question: '“This widget is not authorized for this domain”',
        answer:
          'The website domain is not on the client’s allowed list, or Live mode is enforcing domains strictly.',
        steps: [
          'Open Dashboard → Clients → your client.',
          'Add the exact site domain to Allowed domains (example: player.nextvorallc.com).',
          'Save changes.',
          'Or set status to Test while validating.',
          'Hard refresh the website and try again.',
        ],
      },
      {
        question: 'Chat bubble is not showing on my site',
        answer: 'The embed script may be missing, the widget key may be wrong, or the client is still in Draft.',
        steps: [
          'Confirm the embed snippet is pasted correctly (Dashboard → Install Guide).',
          'Confirm the widget key matches that client.',
          'Set the client to Test or Live (not Draft).',
          'Clear cache / hard refresh the website.',
        ],
      },
      {
        question: 'Preview works, but the live website does not',
        answer: 'Preview runs on webchatsales.com. Your live site needs the correct domain allowlist and embed.',
        steps: [
          'Compare Allowed domains to the real website URL.',
          'Re-copy the embed from Install Guide and republish the site.',
          'Check Install verified / last ping in Clients.',
        ],
      },
    ],
  },
  {
    title: 'Dashboard & login',
    description: 'Access and monitoring inside the WebChatSales dashboard.',
    items: [
      {
        question: 'I cannot log in',
        answer: 'Use the correct login page and credentials. Try a private/incognito window if a saved session is stuck.',
        steps: [
          'Go to https://www.webchatsales.com/login',
          'Platform admin default: username admin / password admin123',
          'Clear site cookies or try a private window.',
        ],
      },
      {
        question: 'I do not see Clients, Install Guide, or Plans & Usage',
        answer: 'Those tabs are for platform (super) admins only. Client admins see their own leads and chats.',
        steps: [
          'Log in with the platform admin account if you need full access.',
          'Or ask WebChatSales to create a client admin login for your business.',
        ],
      },
      {
        question: 'Usage chats / tokens stay at 0',
        answer: 'Counters update after successful AI chats for that client.',
        steps: [
          'Send a chat that receives a full Abby reply.',
          'Refresh Overview or the client usage panel.',
          'Confirm you are viewing the correct client.',
        ],
      },
    ],
  },
  {
    title: 'Emails & alerts',
    description: 'Lead alerts and confirmation emails.',
    items: [
      {
        question: 'I am not getting lead or chat emails',
        answer: 'Notification routing may be off, or mail is in spam.',
        steps: [
          'Dashboard → Clients → set Notification email.',
          'Enable chat & lead email alerts.',
          'Check spam / promotions folders.',
        ],
      },
      {
        question: 'The visitor did not get a confirmation email',
        answer: 'Delivery can be delayed, or the email was not captured in chat.',
        steps: [
          'Confirm the visitor shared a valid email in the conversation.',
          'Wait a few minutes and check spam.',
          'Review the conversation in the dashboard for the captured email.',
        ],
      },
    ],
  },
];

function AccordionItem({ item }: { item: TroubleshootItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 text-left px-4 py-4 sm:px-5"
        aria-expanded={open}
      >
        <span className="font-medium text-sm sm:text-base" style={{ color: 'var(--ink)' }}>
          {item.question}
        </span>
        <span className="shrink-0 text-lg leading-none" style={{ color: 'var(--emerald)' }}>
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-5 sm:px-5 border-t" style={{ borderColor: 'var(--line)' }}>
          <p className="pt-4 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            {item.answer}
          </p>
          {item.steps && item.steps.length > 0 && (
            <ol className="mt-3 space-y-2 list-decimal list-inside text-sm" style={{ color: 'var(--ink)' }}>
              {item.steps.map((step) => (
                <li key={step} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

export default function TroubleshootingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      <Header />
      <main className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--emerald)' }}>
            Help Center
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: 'var(--ink)' }}>
            Troubleshooting
          </h1>
          <p className="text-base leading-relaxed mb-10" style={{ color: 'var(--muted)' }}>
            Quick fixes for common WebChatSales and Abby issues — chat, widget install, dashboard, and emails.
            Open a topic below for steps.
          </p>

          <div className="space-y-10">
            {CATEGORIES.map((category) => (
              <section key={category.title}>
                <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--ink)' }}>
                  {category.title}
                </h2>
                <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                  {category.description}
                </p>
                <div className="space-y-3">
                  {category.items.map((item) => (
                    <AccordionItem key={item.question} item={item} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div
            className="mt-12 p-6 rounded-lg border"
            style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
          >
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--ink)' }}>
              Still need help?
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              Email us with the page URL, what you tried, and a screenshot if possible.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="mailto:hello@webchatsales.com"
                className="px-4 py-2 rounded text-sm font-medium text-black bg-gradient-emerald hover:opacity-90 transition-opacity"
              >
                Email hello@webchatsales.com
              </a>
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="px-4 py-2 rounded text-sm font-medium border hover:opacity-90 transition-opacity"
                style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
              >
                Go to Dashboard Login
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
