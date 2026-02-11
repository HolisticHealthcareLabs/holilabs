'use client';

import React from 'react';

export function Footer() {
    return (
        <footer className="py-16 px-6 bg-secondary/50 border-t border-border">
            <div className="container mx-auto max-w-7xl">

                <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">

                    {/* Column 1 */}
                    <div>
                        <h4 className="font-semibold text-foreground mb-4 text-sm">Product</h4>
                        <ul className="space-y-2.5 text-sm text-muted-foreground">
                            <li><a href="#how-it-works" className="hover:text-primary transition-colors">How it works</a></li>
                            <li><a href="#modules" className="hover:text-primary transition-colors">Modules</a></li>
                            <li><a href="#audit" className="hover:text-primary transition-colors">Audit</a></li>
                            <li><a href="#demo" className="hover:text-primary transition-colors">Request access</a></li>
                        </ul>
                    </div>

                    {/* Column 2 */}
                    <div>
                        <h4 className="font-semibold text-foreground mb-4 text-sm">Company</h4>
                        <ul className="space-y-2.5 text-sm text-muted-foreground">
                            <li><a href="/about" className="hover:text-primary transition-colors">About</a></li>
                            <li><a href="/blog" className="hover:text-primary transition-colors">Blog</a></li>
                            <li><a href="/careers" className="hover:text-primary transition-colors">Careers</a></li>
                            <li><a href="/contact" className="hover:text-primary transition-colors">Contact</a></li>
                        </ul>
                    </div>

                    {/* Column 3 */}
                    <div>
                        <h4 className="font-semibold text-foreground mb-4 text-sm">Legal</h4>
                        <ul className="space-y-2.5 text-sm text-muted-foreground">
                            <li><a href="/legal/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</a></li>
                            <li><a href="/legal/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                            <li><a href="/legal/hipaa-notice" className="hover:text-primary transition-colors">HIPAA Notice</a></li>
                            <li><a href="/legal/baa" className="hover:text-primary transition-colors">Business Associate Agreement</a></li>
                            <li><a href="/legal/consent" className="hover:text-primary transition-colors">Consent Forms</a></li>
                        </ul>
                    </div>

                    {/* Column 4 */}
                    <div>
                        <h4 className="font-semibold text-foreground mb-4 text-sm">Contact</h4>
                        <ul className="space-y-2.5 text-sm text-muted-foreground">
                            <li><a href="mailto:admin@holilabs.xyz" className="hover:text-primary transition-colors">admin@holilabs.xyz</a></li>
                            <li><a href="#demo" className="hover:text-primary transition-colors">Join pilot</a></li>
                        </ul>
                    </div>

                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-muted-foreground">© 2026 Holi Labs. All rights reserved.</div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1.5 bg-background border border-border rounded-md text-xs font-medium text-muted-foreground">Encryption</span>
                        <span className="px-3 py-1.5 bg-background border border-border rounded-md text-xs font-medium text-muted-foreground">Audit trails</span>
                        <span className="px-3 py-1.5 bg-background border border-border rounded-md text-xs font-medium text-muted-foreground">Access controls</span>
                    </div>
                </div>

            </div>
        </footer>
    );
}
