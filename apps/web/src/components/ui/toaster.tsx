
'use client';

import {
    Toast,
    ToastClose,
    ToastDescription,
    ToastProvider,
    ToastTitle,
    ToastViewport,
} from '@/components/ui/Toast';
import { useToast } from '@/hooks/use-toast';

export function Toaster() {
    const { toasts } = useToast();

    return (
        <ToastProvider>
            {toasts.map(function ({ id, title, description, action, variant, ...props }) {
                const isPersistent = variant === 'destructive';
                return (
                    <Toast key={id} variant={variant} {...props}>
                        <div className="grid gap-1">
                            {title && <ToastTitle>{title}</ToastTitle>}
                            {description && (
                                <ToastDescription>{description}</ToastDescription>
                            )}
                        </div>
                        {action}
                        <ToastClose />
                        {!isPersistent && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground/10 overflow-hidden rounded-b">
                                <div
                                    className="h-full bg-foreground/20 animate-toast-progress"
                                    style={{ animationDuration: '5s' }}
                                />
                            </div>
                        )}
                    </Toast>
                );
            })}
            <ToastViewport />
        </ToastProvider>
    );
}
