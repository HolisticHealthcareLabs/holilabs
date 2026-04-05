'use client';

import React, { useState, type FormEvent } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/lib/i18n/landing';
import { Reveal } from './Reveal';

export function ContactSection() {
  const { locale } = useLanguage();
  const copy = getLandingCopy(locale);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          organization: data.get('organization'),
          role: data.get('role'),
          message: data.get('message'),
        }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="contact" className="landing-contact">
      <div className="landing-contact-grid">
        <div>
          <Reveal>
            <h2 className="landing-contact-heading">{copy.contact.heading}</h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="landing-contact-subtitle">{copy.contact.subtitle}</p>
          </Reveal>
          <Reveal delay={0.3}>
            <ul className="landing-contact-list">
              {copy.contact.listItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={0.15}>
          {submitted ? (
            <p className="landing-form-success">{copy.contact.form.success}</p>
          ) : (
            <form className="landing-form" onSubmit={handleSubmit}>
              <div className="landing-form-group">
                <label className="landing-form-label" htmlFor="contact-name">
                  {copy.contact.form.name}
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  required
                  className="landing-form-input"
                  autoComplete="name"
                />
              </div>

              <div className="landing-form-group">
                <label className="landing-form-label" htmlFor="contact-email">
                  {copy.contact.form.email}
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  className="landing-form-input"
                  autoComplete="email"
                />
              </div>

              <div className="landing-form-group">
                <label className="landing-form-label" htmlFor="contact-org">
                  {copy.contact.form.organization}
                </label>
                <input
                  id="contact-org"
                  name="organization"
                  type="text"
                  required
                  className="landing-form-input"
                  autoComplete="organization"
                />
              </div>

              <div className="landing-form-group">
                <label className="landing-form-label" htmlFor="contact-role">
                  {copy.contact.form.role}
                </label>
                <select
                  id="contact-role"
                  name="role"
                  required
                  className="landing-form-select"
                  defaultValue=""
                >
                  <option value="" disabled hidden>--</option>
                  {copy.contact.form.roleOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="landing-form-group">
                <label className="landing-form-label" htmlFor="contact-message">
                  {copy.contact.form.message}
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  className="landing-form-textarea"
                  rows={4}
                />
              </div>

              <button
                type="submit"
                className="landing-cta-pill"
                disabled={submitting}
                style={{ width: '100%', opacity: submitting ? 0.6 : 1 }}
              >
                {copy.contact.form.submit}
              </button>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
