import { DeterministicValidator } from '../src/main/ontology/DeterministicValidator';

async function main() {
    console.log('🕵️‍♀️ Verifying Deterministic "Trust Anchor" Integration...');

    const validator = new DeterministicValidator();

    // Test Case 1: Drug Lookup (Metformin)
    console.log('\n--- 🧪 TEST CASE 1: Drug Identification ---');
    const drugTest = validator.validatePrescription('Metformin 500 MG', '');
    if (drugTest.concept && drugTest.concept.name.includes('Metformin')) {
        console.log('✅ SUCCESS: Identified "Metformin" -> RxCUI:', drugTest.concept.rxcui);
    } else {
        console.error('❌ FAILURE: Could not identify Metformin');
    }

    // Test Case 2: Diagnosis Lookup (Diabetes)
    console.log('\n--- 🧪 TEST CASE 2: Diagnosis Identification ---');
    const diagnosisTest = validator.validateDiagnosis('Type 2 diabetes mellitus');
    if (diagnosisTest.isValid && diagnosisTest.source === 'SNOMED') {
        console.log('✅ SUCCESS: Identified "Type 2 diabetes" -> SCTID:', diagnosisTest.concept.id);
    } else {
        console.error('❌ FAILURE: Could not identify Diabetes');
    }

    // Test Case 3: Harad Brake (Contraindication)
    console.log('\n--- 🧪 TEST CASE 3: Hard Brake (Kidney Contraindication) ---');
    // Scenario: Prescribing Metformin to a patient with "Chronic kidney disease stage 5"
    const safetyTest = validator.validatePrescription('Metformin', 'Patient has history of chronic kidney disease stage 5');

    if (!safetyTest.isValid && safetyTest.issues && safetyTest.issues.length > 0) {
        console.log('✅ SUCCESS: Hard Brake Triggered!');
        console.log('   🛑 Issue:', safetyTest.issues[0]);
    } else {
        console.error('❌ FAILURE: Safety check passed when it should have failed!');
        console.log('   Result:', safetyTest);
    }

    validator.close();
}

main().catch(console.error);
