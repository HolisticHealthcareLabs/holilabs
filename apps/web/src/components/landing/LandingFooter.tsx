'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/lib/i18n/landing';

export function LandingFooter() {
  const { locale } = useLanguage();
  const copy = getLandingCopy(locale);

  const columns = [
    { title: copy.footer.product, links: copy.footer.productLinks },
    { title: copy.footer.company, links: copy.footer.companyLinks },
    { title: copy.footer.legal, links: copy.footer.legalLinks },
    { title: copy.footer.resources, links: copy.footer.resourceLinks },
  ];

  return (
    <footer className="landing-footer">
      <div className="landing-footer-grid">
        <div className="landing-footer-brand">
          <p className="landing-footer-logo">Holi Labs</p>
          <p className="landing-footer-tagline">{copy.footer.tagline}</p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <p className="landing-footer-col-title">{col.title}</p>
            <ul className="landing-footer-links">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="landing-footer-bottom">
        <p className="landing-footer-rights">{copy.footer.rights}</p>
      </div>
    </footer>
  );
}
