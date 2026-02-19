'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/components/landing/copy';

export function Footer() {
    const { locale } = useLanguage();
    const copy = getLandingCopy(locale);

    return (
        <footer className="bg-secondary/30 dark:bg-black border-t border-border/50">
            <div className="max-w-[980px] mx-auto px-4 sm:px-6">
                {/* Link columns */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8 py-12">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <p className="font-semibold text-foreground text-sm mb-1">Holi Labs</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">Clinical safety infrastructure for modern healthcare.</p>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="font-semibold text-foreground text-xs mb-3">{copy.footer.product}</h4>
                        <ul className="space-y-2 text-xs text-muted-foreground">
                            <li><a href="#how-it-works" className="hover:text-foreground transition-colors">{copy.footer.howItWorks}</a></li>
                            <li><a href="#modules" className="hover:text-foreground transition-colors">{copy.footer.modules}</a></li>
                            <li><a href="#audit" className="hover:text-foreground transition-colors">{copy.footer.audit}</a></li>
                            <li><a href="#demo" className="hover:text-foreground transition-colors">{copy.footer.requestAccess}</a></li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="font-semibold text-foreground text-xs mb-3">{copy.footer.company}</h4>
                        <ul className="space-y-2 text-xs text-muted-foreground">
                            <li><a href="/about" className="hover:text-foreground transition-colors">{copy.footer.about}</a></li>
                            <li><a href="/blog" className="hover:text-foreground transition-colors">{copy.footer.blog}</a></li>
                            <li><a href="/careers" className="hover:text-foreground transition-colors">{copy.footer.careers}</a></li>
                            <li><a href="/contact" className="hover:text-foreground transition-colors">{copy.footer.contactLink}</a></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="font-semibold text-foreground text-xs mb-3">{copy.footer.legal}</h4>
                        <ul className="space-y-2 text-xs text-muted-foreground">
                            <li><a href="/legal/terms-of-service" className="hover:text-foreground transition-colors">{copy.footer.terms}</a></li>
                            <li><a href="/legal/privacy-policy" className="hover:text-foreground transition-colors">{copy.footer.privacy}</a></li>
                            <li><a href="/legal/hipaa-notice" className="hover:text-foreground transition-colors">{copy.footer.hipaa}</a></li>
                            <li><a href="/legal/consent" className="hover:text-foreground transition-colors">{copy.footer.consent}</a></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="py-5 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">{copy.footer.rights}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
                        <span>{copy.footer.encryption}</span>
                        <span>·</span>
                        <span>{copy.footer.auditTrails}</span>
                        <span>·</span>
                        <span>{copy.footer.accessControls}</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
