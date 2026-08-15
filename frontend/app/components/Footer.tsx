'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t py-10 px-4 sm:px-6 lg:px-8" style={{ borderColor: 'var(--line)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div>
            <p className="font-semibold mb-2" style={{ color: 'var(--ink)' }}>
              WebChatSales
            </p>
            <p className="text-sm max-w-sm" style={{ color: 'var(--muted)' }}>
              Sales While You Sleep™ — Abby responds instantly, qualifies buyers, and helps convert website visitors.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div>
              <p className="font-medium mb-3" style={{ color: 'var(--ink)' }}>
                Product
              </p>
              <ul className="space-y-2" style={{ color: 'var(--muted)' }}>
                <li>
                  <Link href="/#pricing" className="hover:opacity-80 transition-opacity">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/intake" className="hover:opacity-80 transition-opacity">
                    Start Onboarding
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:opacity-80 transition-opacity">
                    Dashboard Login
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-medium mb-3" style={{ color: 'var(--ink)' }}>
                Help
              </p>
              <ul className="space-y-2" style={{ color: 'var(--muted)' }}>
                <li>
                  <Link href="/troubleshooting" className="hover:opacity-80 transition-opacity">
                    Troubleshooting
                  </Link>
                </li>
                <li>
                  <a href="mailto:hello@webchatsales.com" className="hover:opacity-80 transition-opacity">
                    Contact Support
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-between gap-3 text-sm" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
          <p>© {new Date().getFullYear()} WebChatSales • Sales While You Sleep™</p>
          <p>Made by Abby</p>
        </div>
      </div>
    </footer>
  );
}
