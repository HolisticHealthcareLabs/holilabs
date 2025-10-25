"use strict";
/**
 * usePatientContext Hook
 *
 * React hook to fetch and format patient context for AI prompts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePatientContext = usePatientContext;
exports.usePatientContextForSOAP = usePatientContextForSOAP;
exports.usePatientContextForScribe = usePatientContextForScribe;
exports.usePatientSummary = usePatientSummary;
const react_1 = require("react");
function usePatientContext({ patientId, format = 'full', chiefComplaint, appointmentReason, autoFetch = true, }) {
    const [context, setContext] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const fetchContext = async () => {
        if (!patientId) {
            setError('Patient ID is required');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                patientId,
                format,
            });
            if (chiefComplaint) {
                params.append('chiefComplaint', chiefComplaint);
            }
            if (appointmentReason) {
                params.append('appointmentReason', appointmentReason);
            }
            const response = await fetch(`/api/ai/patient-context?${params.toString()}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch patient context');
            }
            const data = await response.json();
            setContext(data.context);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setContext(null);
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        if (autoFetch && patientId) {
            fetchContext();
        }
    }, [patientId, format, chiefComplaint, appointmentReason, autoFetch]);
    return {
        context,
        loading,
        error,
        refetch: fetchContext,
    };
}
/**
 * Hook specifically for SOAP note generation
 */
function usePatientContextForSOAP(patientId, chiefComplaint) {
    return usePatientContext({
        patientId,
        format: 'soap',
        chiefComplaint,
        autoFetch: !!patientId && !!chiefComplaint,
    });
}
/**
 * Hook specifically for clinical scribe
 */
function usePatientContextForScribe(patientId, appointmentReason) {
    return usePatientContext({
        patientId,
        format: 'scribe',
        appointmentReason,
        autoFetch: !!patientId && !!appointmentReason,
    });
}
/**
 * Hook for patient summary (quick view)
 */
function usePatientSummary(patientId) {
    return usePatientContext({
        patientId,
        format: 'summary',
        autoFetch: !!patientId,
    });
}
//# sourceMappingURL=usePatientContext.js.map