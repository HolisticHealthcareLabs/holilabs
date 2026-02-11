import React, { useEffect, useMemo, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface OnboardingOverlayProps {
    onComplete: () => void;
    language: 'en' | 'pt';
}

type Step = 'WELCOME' | 'PERMISSIONS' | 'EHR_DETECT' | 'SIGNALS' | 'SAFETY_VALVE';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ onComplete, language }) => {
    const [stepIndex, setStepIndex] = useState(0);
    const [platform, setPlatform] = useState<string>('unknown');
    const [screen, setScreen] = useState<'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown'>('unknown');
    const [accessibility, setAccessibility] = useState<boolean>(true);

    // Translations
    const t = {
        en: {
            next: 'Next',
            finish: 'Start Assurance',
            skip: 'Skip Tour',
            grant: 'Grant permissions',
            openSettings: 'Open settings',
            steps: {
                WELCOME: {
                    title: 'Welcome to Cortex Assurance',
                    desc: 'Your silent clinical partner for safer, faster decision making.',
                    icon: '👋',
                },
                PERMISSIONS: {
                    title: 'macOS Permissions',
                    desc: 'To attach to the EHR and validate safely, Cortex needs Screen Recording + Accessibility.',
                    icon: '🔐',
                },
                EHR_DETECT: {
                    title: 'EHR Synchronization',
                    desc: 'We automatically detect your Electronic Health Record window and attach silently to the side.',
                    icon: '🔗',
                },
                SIGNALS: {
                    title: 'Traffic Light System',
                    desc: 'Green means clear. Red means a safety block. We check every click against clinical protocols.',
                    icon: '🚦',
                },
                SAFETY_VALVE: {
                    title: 'You Are In Control',
                    desc: 'Need to override? Use the "Break-Glass" chat to explain your clinical reasoning and proceed.',
                    icon: '🛡️',
                },
            },
        },
        pt: {
            next: 'Próximo',
            finish: 'Iniciar Segurança',
            skip: 'Pular Tour',
            grant: 'Conceder permissões',
            openSettings: 'Abrir ajustes',
            steps: {
                WELCOME: {
                    title: 'Bem-vindo ao Cortex',
                    desc: 'Seu parceiro clínico silencioso para decisões mais seguras e rápidas.',
                    icon: '👋',
                },
                PERMISSIONS: {
                    title: 'Permissões do macOS',
                    desc: 'Para acoplar ao prontuário e validar com segurança, o Cortex precisa de Gravação de Tela + Acessibilidade.',
                    icon: '🔐',
                },
                EHR_DETECT: {
                    title: 'Sincronização Prontuário',
                    desc: 'Detectamos automaticamente sua janela do Prontuário Eletrônico e nos acoplamos silenciosamente.',
                    icon: '🔗',
                },
                SIGNALS: {
                    title: 'Sistema Semáforo',
                    desc: 'Verde significa liberado. Vermelho é um bloqueio. Verificamos cada clique contra protocolos clínicos.',
                    icon: '🚦',
                },
                SAFETY_VALVE: {
                    title: 'Você no Controle',
                    desc: 'Precisa forçar uma ação? Use o chat "Quebre o Vidro" para justificar e prosseguir.',
                    icon: '🛡️',
                },
            },
        },
    }[language];

    const steps: Step[] = useMemo(() => {
        // Only show the permissions step when it matters.
        const needsPermissions =
            platform === 'darwin' && (screen !== 'granted' || accessibility !== true);

        const base: Step[] = ['WELCOME'];
        if (needsPermissions) base.push('PERMISSIONS');
        base.push('EHR_DETECT', 'SIGNALS', 'SAFETY_VALVE');
        return base;
    }, [platform, screen, accessibility]);

    const step = steps[Math.min(stepIndex, steps.length - 1)] || 'WELCOME';

    const refreshPermissions = async () => {
        if (!window?.electronAPI?.getPermissions) return;
        const p = await window.electronAPI.getPermissions().catch(() => null);
        if (!p) return;
        setPlatform(p.platform);
        setScreen(p.screen);
        setAccessibility(p.accessibility);
    };

    useEffect(() => {
        refreshPermissions();
        const t = setInterval(refreshPermissions, 1500);
        return () => clearInterval(t);
    }, []);

    const handleNext = () => {
        if (stepIndex >= steps.length - 1) onComplete();
        else setStepIndex((i) => i + 1);
    };

    const getProgress = () => {
        return Math.max(1, Math.min(steps.length, stepIndex + 1));
    };

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-content">
                {/* Text Content */}
                <div className="onboarding-text">
                    <h2>{t.steps[step].title}</h2>
                    <p>{t.steps[step].desc}</p>
                </div>

                {step === 'PERMISSIONS' && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.4 }}>
                            <div>
                                <strong>Screen Recording</strong>: {screen === 'granted' ? '✅' : '⚠️'} {screen}
                            </div>
                            <div>
                                <strong>Accessibility</strong>: {accessibility ? '✅ granted' : '⚠️ not granted'}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <button
                                className="btn-primary"
                                onClick={async () => {
                                    await window.electronAPI.requestScreenRecording();
                                    await window.electronAPI.openScreenRecordingSettings();
                                    await refreshPermissions();
                                }}
                            >
                                {t.openSettings}: Screen Recording
                            </button>
                            <button
                                className="btn-primary"
                                onClick={async () => {
                                    await window.electronAPI.requestAccessibility();
                                    await window.electronAPI.openAccessibilitySettings();
                                    await refreshPermissions();
                                }}
                            >
                                {t.openSettings}: Accessibility
                            </button>
                        </div>

                        <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.35 }}>
                            After enabling permissions in System Settings, return here—this screen will update automatically.
                        </div>
                    </div>
                )}

                {/* Progress Indicators */}
                <div className="onboarding-progress">
                    {Array.from({ length: steps.length }, (_, idx) => idx + 1).map((i) => (
                        <div
                            key={i}
                            className={`progress-dot ${i <= getProgress() ? 'active' : ''}`}
                        />
                    ))}
                </div>

                {/* Actions */}
                <div className="onboarding-actions">
                    <button className="btn-secondary" onClick={onComplete}>
                        {t.skip}
                    </button>
                    <button className="btn-primary" onClick={handleNext}>
                        {stepIndex >= steps.length - 1 ? t.finish : t.next}
                    </button>
                </div>
            </div>
        </div>
    );
};
