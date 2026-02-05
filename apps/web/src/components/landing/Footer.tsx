'use client';

import React from 'react';

export function Footer() {
    return (
        <footer className="py-16 px-6 bg-secondary/50 border-t border-border">
            <div className="container mx-auto max-w-7xl">

                <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">

                    {/* Column 1 */}
                    <div>
                        <h4 className="font-semibold text-foreground mb-4 text-sm">Producto</h4>
                        <ul className="space-y-2.5 text-sm text-muted-foreground">
                            <li><a href="#plataforma" className="hover:text-primary transition-colors">Plataforma</a></li>
                            <li><a href="#precios" className="hover:text-primary transition-colors">Precios</a></li>
                            <li><a href="#casos" className="hover:text-primary transition-colors">Casos de Uso</a></li>
                            <li><a href="#demo" className="hover:text-primary transition-colors">Demo</a></li>
                        </ul>
                    </div>

                    {/* Column 2 */}
                    <div>
                        <h4 className="font-semibold text-foreground mb-4 text-sm">Empresa</h4>
                        <ul className="space-y-2.5 text-sm text-muted-foreground">
                            <li><a href="/about" className="hover:text-primary transition-colors">Sobre Nosotros</a></li>
                            <li><a href="/blog" className="hover:text-primary transition-colors">Blog</a></li>
                            <li><a href="/careers" className="hover:text-primary transition-colors">Carreras</a></li>
                            <li><a href="/contact" className="hover:text-primary transition-colors">Contacto</a></li>
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
                        <h4 className="font-semibold text-foreground mb-4 text-sm">Contacto</h4>
                        <ul className="space-y-2.5 text-sm text-muted-foreground">
                            <li><a href="mailto:admin@holilabs.xyz" className="hover:text-primary transition-colors">admin@holilabs.xyz</a></li>
                            <li><a href="https://wa.me/525555555555" className="hover:text-primary transition-colors">WhatsApp</a></li>
                        </ul>
                    </div>

                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-muted-foreground">© 2026 Holi Labs. Todos los derechos reservados.</div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1.5 bg-background border border-border rounded-md text-xs font-medium text-muted-foreground">HIPAA</span>
                        <span className="px-3 py-1.5 bg-background border border-border rounded-md text-xs font-medium text-muted-foreground">LGPD</span>
                        <span className="px-3 py-1.5 bg-background border border-border rounded-md text-xs font-medium text-muted-foreground">ISO 27269</span>
                    </div>
                </div>

            </div>
        </footer>
    );
}
