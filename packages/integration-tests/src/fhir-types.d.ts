/**
 * FHIR Type Aliases
 *
 * Maps `fhir` namespace → `fhir4` from @types/fhir@0.0.41
 * Provides type declarations as a real module (not just ambient types)
 */

/// <reference types="@types/fhir" />

export namespace fhir {
  export type Patient = fhir4.Patient;
  export type Observation = fhir4.Observation;
  export type Condition = fhir4.Condition;
  export type MedicationRequest = fhir4.MedicationRequest;
  export type AllergyIntolerance = fhir4.AllergyIntolerance;
  export type Bundle = fhir4.Bundle;
  export type BundleEntry = fhir4.BundleEntry;
  export type Identifier = fhir4.Identifier;
  export type ContactPoint = fhir4.ContactPoint;
  export type Address = fhir4.Address;
  export type Coding = fhir4.Coding;
  export type Quantity = fhir4.Quantity;
  export type Dosage = fhir4.Dosage;
  export type HumanName = fhir4.HumanName;
  export type Reference = fhir4.Reference;
  export type CodeableConcept = fhir4.CodeableConcept;
  export type Meta = fhir4.Meta;
  export type Extension = fhir4.Extension;
  export type Period = fhir4.Period;
  export type Timing = fhir4.Timing;
  export type TimingRepeat = fhir4.TimingRepeat;
  export type ObservationReferenceRange = fhir4.ObservationReferenceRange;
  export type ObservationComponent = fhir4.ObservationComponent;
  export type DosageDoseAndRate = fhir4.DosageDoseAndRate;
  export type AllergyIntoleranceReaction = fhir4.AllergyIntoleranceReaction;
}

// Declare global ambient namespace for fhir types (for backward compatibility)
declare global {
  namespace fhir {
    type Patient = fhir4.Patient;
    type Observation = fhir4.Observation;
    type Condition = fhir4.Condition;
    type MedicationRequest = fhir4.MedicationRequest;
    type AllergyIntolerance = fhir4.AllergyIntolerance;
    type Bundle = fhir4.Bundle;
    type BundleEntry = fhir4.BundleEntry;
    type Identifier = fhir4.Identifier;
    type ContactPoint = fhir4.ContactPoint;
    type Address = fhir4.Address;
    type Coding = fhir4.Coding;
    type Quantity = fhir4.Quantity;
    type Dosage = fhir4.Dosage;
    type HumanName = fhir4.HumanName;
    type Reference = fhir4.Reference;
    type CodeableConcept = fhir4.CodeableConcept;
    type Meta = fhir4.Meta;
    type Extension = fhir4.Extension;
    type Period = fhir4.Period;
    type Timing = fhir4.Timing;
    type TimingRepeat = fhir4.TimingRepeat;
    type ObservationReferenceRange = fhir4.ObservationReferenceRange;
    type ObservationComponent = fhir4.ObservationComponent;
    type DosageDoseAndRate = fhir4.DosageDoseAndRate;
    type AllergyIntoleranceReaction = fhir4.AllergyIntoleranceReaction;
  }
}
