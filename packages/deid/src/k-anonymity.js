"use strict";
/**
 * K-Anonymity Implementation
 * Ensures that each individual cannot be distinguished from at least k-1 other individuals
 * based on quasi-identifiers (age, zip code, diagnosis, etc.)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkKAnonymity = checkKAnonymity;
exports.applyKAnonymity = applyKAnonymity;
exports.generalizeAge = generalizeAge;
exports.generalizeZipCode = generalizeZipCode;
exports.generalizeDate = generalizeDate;
/**
 * Check if dataset meets k-anonymity requirement
 */
function checkKAnonymity(data, options) {
    const { k, quasiIdentifiers } = options;
    const groups = new Map();
    for (const record of data) {
        const key = quasiIdentifiers
            .map((qi) => String(record[qi] ?? 'NULL'))
            .join('|');
        groups.set(key, (groups.get(key) || 0) + 1);
    }
    const violations = [];
    for (const [key, count] of groups.entries()) {
        if (count < k) {
            const values = key.split('|');
            const combination = {};
            quasiIdentifiers.forEach((qi, index) => {
                combination[qi] = values[index] === 'NULL' ? null : values[index];
            });
            violations.push({ combination, count });
        }
    }
    return {
        isAnonymous: violations.length === 0,
        k: violations.length === 0 ? k : Math.min(...Array.from(groups.values())),
        violations,
    };
}
/**
 * Apply k-anonymity to dataset through suppression
 */
function applyKAnonymity(data, options) {
    const { k, quasiIdentifiers, suppressionValue = '*' } = options;
    const checkResult = checkKAnonymity(data, options);
    if (checkResult.isAnonymous) {
        return data;
    }
    const result = data.map((record) => ({ ...record }));
    const groups = new Map();
    result.forEach((record, index) => {
        const key = quasiIdentifiers
            .map((qi) => String(record[qi] ?? 'NULL'))
            .join('|');
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push(index);
    });
    for (const [key, indices] of groups.entries()) {
        if (indices.length < k) {
            for (const index of indices) {
                for (const qi of quasiIdentifiers) {
                    result[index][qi] = suppressionValue;
                }
            }
        }
    }
    return result;
}
function generalizeAge(age, rangeSize = 5) {
    const lowerBound = Math.floor(age / rangeSize) * rangeSize;
    const upperBound = lowerBound + rangeSize - 1;
    return `${lowerBound}-${upperBound}`;
}
function generalizeZipCode(zipCode, digits = 3) {
    const cleaned = String(zipCode).replace(/\D/g, '');
    return cleaned.slice(0, digits).padEnd(5, '*');
}
function generalizeDate(date, precision = 'year') {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    if (precision === 'year') {
        return year.toString();
    }
    else {
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }
}
