"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextualHelp = void 0;
exports.default = Tooltip;
exports.HelpTooltip = HelpTooltip;
/**
 * Contextual Help Tooltip Component
 * Provides inline guidance and explanations
 *
 * Inspired by Stripe, Linear, Notion
 */
const react_1 = require("react");
function Tooltip({ content, position = 'top', children, maxWidth = '250px', showDelay = 200, }) {
    const [isVisible, setIsVisible] = (0, react_1.useState)(false);
    const [coords, setCoords] = (0, react_1.useState)({ top: 0, left: 0 });
    const triggerRef = (0, react_1.useRef)(null);
    const tooltipRef = (0, react_1.useRef)(null);
    const timeoutRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (isVisible && triggerRef.current && tooltipRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            let top = 0;
            let left = 0;
            switch (position) {
                case 'top':
                    top = triggerRect.top - tooltipRect.height - 8;
                    left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
                    break;
                case 'bottom':
                    top = triggerRect.bottom + 8;
                    left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
                    break;
                case 'left':
                    top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
                    left = triggerRect.left - tooltipRect.width - 8;
                    break;
                case 'right':
                    top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
                    left = triggerRect.right + 8;
                    break;
            }
            // Keep tooltip within viewport
            const padding = 8;
            if (left < padding)
                left = padding;
            if (left + tooltipRect.width > window.innerWidth - padding) {
                left = window.innerWidth - tooltipRect.width - padding;
            }
            if (top < padding)
                top = padding;
            if (top + tooltipRect.height > window.innerHeight - padding) {
                top = window.innerHeight - tooltipRect.height - padding;
            }
            setCoords({ top, left });
        }
    }, [isVisible, position]);
    const handleMouseEnter = () => {
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, showDelay);
    };
    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    };
    return (<>
      <div ref={triggerRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="inline-flex items-center">
        {children}
      </div>

      {isVisible && (<div ref={tooltipRef} className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in duration-150" style={{
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                maxWidth,
            }}>
          <div className="bg-gray-900 text-white text-sm rounded-lg shadow-xl px-3 py-2 border border-gray-700">
            {content}
            {/* Arrow */}
            <div className={`absolute w-2 h-2 bg-gray-900 border-gray-700 transform rotate-45 ${position === 'top'
                ? 'bottom-[-4px] left-1/2 -translate-x-1/2 border-b border-r'
                : position === 'bottom'
                    ? 'top-[-4px] left-1/2 -translate-x-1/2 border-t border-l'
                    : position === 'left'
                        ? 'right-[-4px] top-1/2 -translate-y-1/2 border-t border-r'
                        : 'left-[-4px] top-1/2 -translate-y-1/2 border-b border-l'}`}/>
          </div>
        </div>)}
    </>);
}
// ============================================================================
// HELP ICON WITH TOOLTIP
// ============================================================================
function HelpTooltip({ content, position = 'top', }) {
    return (<Tooltip content={content} position={position}>
      <button type="button" className="inline-flex items-center justify-center w-4 h-4 text-gray-400 hover:text-gray-600 transition" aria-label="Help">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </button>
    </Tooltip>);
}
// ============================================================================
// PRE-BUILT TOOLTIPS FOR COMMON FEATURES
// ============================================================================
exports.ContextualHelp = {
    patientToken: (<div className="space-y-1">
      <p className="font-semibold">Token ID Blockchain</p>
      <p className="text-xs opacity-90">
        Identificador único en blockchain para verificación de integridad de datos médicos.
      </p>
    </div>),
    dataHash: (<div className="space-y-1">
      <p className="font-semibold">Hash de Datos</p>
      <p className="text-xs opacity-90">
        Huella digital SHA-256 para verificar que los datos no han sido alterados.
      </p>
    </div>),
    aiAssistant: (<div className="space-y-1">
      <p className="font-semibold">Asistente de IA Médica</p>
      <p className="text-xs opacity-90">
        Soporte clínico con Claude AI. No reemplaza juicio médico - solo asistencia.
      </p>
    </div>),
    soapNotes: (<div className="space-y-1">
      <p className="font-semibold">Notas SOAP</p>
      <p className="text-xs opacity-90">
        <strong>S</strong>ubjetivo, <strong>O</strong>bjetivo, <strong>A</strong>nálisis,{' '}
        <strong>P</strong>lan - Formato estándar de documentación clínica.
      </p>
    </div>),
    icd10: (<div className="space-y-1">
      <p className="font-semibold">Código ICD-10</p>
      <p className="text-xs opacity-90">
        Clasificación Internacional de Enfermedades (10ª revisión) para codificación diagnóstica.
      </p>
    </div>),
    cpt: (<div className="space-y-1">
      <p className="font-semibold">Código CPT</p>
      <p className="text-xs opacity-90">
        Current Procedural Terminology - Códigos para procedimientos y servicios médicos.
      </p>
    </div>),
    hipaa: (<div className="space-y-1">
      <p className="font-semibold">HIPAA Compliant</p>
      <p className="text-xs opacity-90">
        Cumple con Health Insurance Portability and Accountability Act para protección de datos.
      </p>
    </div>),
    drugInteractions: (<div className="space-y-1">
      <p className="font-semibold">Interacciones Medicamentosas</p>
      <p className="text-xs opacity-90">
        Análisis automático de interacciones con IA médica y bases de datos farmacológicas.
      </p>
    </div>),
    vitalSigns: (<div className="space-y-1">
      <p className="font-semibold">Signos Vitales</p>
      <p className="text-xs opacity-90">
        PA (presión arterial), FC (frecuencia cardíaca), Temp, FR (frecuencia respiratoria), SpO2,
        Peso
      </p>
    </div>),
    blockchain: (<div className="space-y-1">
      <p className="font-semibold">Verificación Blockchain</p>
      <p className="text-xs opacity-90">
        Los registros médicos se registran en blockchain para garantizar inmutabilidad y trazabilidad.
      </p>
    </div>),
};
//# sourceMappingURL=Tooltip.js.map