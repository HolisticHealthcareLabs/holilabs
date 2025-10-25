"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalize = generalize;
/**
 * Generalize sensitive data according to policy
 * - Ages → age bands
 * - Dates → year or quarter
 * - Geographic → ZIP3 or state only
 */
function generalize(record, policy) {
    const transformations = {};
    function generalizeValue(value, key) {
        if (value === null || value === undefined) {
            return value;
        }
        // Age generalization
        if (key && isAgeField(key) && typeof value === 'number') {
            const band = getAgeBand(value, policy.generalization.age_bands);
            transformations[`${key}`] = `${value} → ${band}`;
            return band;
        }
        // Date generalization
        if (key && isDateField(key) && typeof value === 'string') {
            const generalized = generalizeDate(value, policy.generalization.dates);
            if (generalized !== value) {
                transformations[`${key}`] = `${value} → ${generalized}`;
            }
            return generalized;
        }
        // Geographic generalization
        if (key && isGeoField(key) && typeof value === 'string') {
            const generalized = generalizeGeo(value, policy.generalization.geo);
            if (generalized !== value) {
                transformations[`${key}`] = `${value} → ${generalized}`;
            }
            return generalized;
        }
        if (Array.isArray(value)) {
            return value.map((item) => generalizeValue(item));
        }
        if (typeof value === 'object') {
            const generalizedObj = {};
            for (const k in value) {
                generalizedObj[k] = generalizeValue(value[k], k);
            }
            return generalizedObj;
        }
        return value;
    }
    const generalized = generalizeValue(record);
    return {
        generalized,
        transformations,
    };
}
/**
 * Map age to age band
 */
function getAgeBand(age, bands) {
    for (const band of bands) {
        const [min, max] = band.split('-').map((s) => {
            if (s.endsWith('+'))
                return [parseInt(s), Infinity];
            return parseInt(s);
        });
        if (Array.isArray(min)) {
            if (age >= min[0])
                return band;
        }
        else if (typeof max === 'number') {
            if (age >= min && age <= max)
                return band;
        }
    }
    return '90+'; // Default for very old
}
/**
 * Generalize date to year or year+quarter
 */
function generalizeDate(dateStr, mode) {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return dateStr; // Not a valid date
        }
        const year = date.getFullYear();
        if (mode === 'YEAR') {
            return `${year}`;
        }
        // YEAR_OR_QUARTER
        const month = date.getMonth() + 1;
        const quarter = Math.ceil(month / 3);
        return `${year}-Q${quarter}`;
    }
    catch {
        return dateStr;
    }
}
/**
 * Generalize geographic data
 * ZIP3_OR_STATE: reduce ZIP/postal to 3 digits or state
 * STATE_ONLY: remove everything except state/province
 */
function generalizeGeo(geo, mode) {
    if (mode === 'STATE_ONLY') {
        // Extract state code if present (e.g., "CA", "SP", "CDMX")
        const stateMatch = geo.match(/\b([A-Z]{2,4})\b/);
        return stateMatch ? stateMatch[1] : '[STATE]';
    }
    // ZIP3_OR_STATE: keep first 3 digits of ZIP/postal
    const zipMatch = geo.match(/\d{5,}/);
    if (zipMatch) {
        return zipMatch[0].substring(0, 3) + 'XX';
    }
    // Fallback to state extraction
    const stateMatch = geo.match(/\b([A-Z]{2,4})\b/);
    return stateMatch ? stateMatch[1] : '[GEO]';
}
/**
 * Detect if a field is an age field
 */
function isAgeField(fieldName) {
    const ageFields = ['age', 'edad', 'idade'];
    const normalized = fieldName.toLowerCase();
    return ageFields.some((af) => normalized.includes(af));
}
/**
 * Detect if a field is a date field
 */
function isDateField(fieldName) {
    const dateFields = ['date', 'fecha', 'data', 'dob', 'birth', 'nacimiento', 'nascimento', 'created', 'updated'];
    const normalized = fieldName.toLowerCase();
    return dateFields.some((df) => normalized.includes(df));
}
/**
 * Detect if a field is a geographic field
 */
function isGeoField(fieldName) {
    const geoFields = ['zip', 'postal', 'cep', 'address', 'city', 'state', 'province', 'region', 'geo', 'location'];
    const normalized = fieldName.toLowerCase();
    return geoFields.some((gf) => normalized.includes(gf));
}
//# sourceMappingURL=generalize.js.map