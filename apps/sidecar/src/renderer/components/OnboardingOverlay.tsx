import React, { useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface OnboardingOverlayProps {
    onComplete: () => void;
    language: 'en' | 'pt';
}

type Step = 'WELCOME' | 'EHR_DETECT' | 'SIGNALS' | 'SAFETY_VALVE';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ onComplete, language }) => {
    const [step, setStep] = useState<Step>('WELCOME');

    // Translations
    const t = {
        en: {
            next: 'Next',
            finish: 'Start Assurance',
            skip: 'Skip Tour',
            steps: {
                WELCOME: {
                    title: 'Welcome to Cortex Assurance',
                    desc: 'Your silent clinical partner for safer, faster decision making.',
                    icon: '👋',
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
            steps: {
                WELCOME: {
                    title: 'Bem-vindo ao Cortex',
                    desc: 'Seu parceiro clínico silencioso para decisões mais seguras e rápidas.',
                    icon: '👋',
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

    const handleNext = () => {
        if (step === 'WELCOME') setStep('EHR_DETECT');
        else if (step === 'EHR_DETECT') setStep('SIGNALS');
        else if (step === 'SIGNALS') setStep('SAFETY_VALVE');
        else onComplete();
    };

    const getProgress = () => {
        switch (step) {
            case 'WELCOME': return 1;
            case 'EHR_DETECT': return 2;
            case 'SIGNALS': return 3;
            case 'SAFETY_VALVE': return 4;
        }
    };

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-content">
                {/* Text Content */}
                <div className="onboarding-text">
                    <h2>{t.steps[step].title}</h2>
                    <p>{t.steps[step].desc}</p>
                </div>

                {/* Progress Indicators */}
                <div className="onboarding-progress">
                    {[1, 2, 3, 4].map((i) => (
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
                        {step === 'SAFETY_VALVE' ? t.finish : t.next}
                    </button>
                </div>
            </div>
        </div>
    );
};
