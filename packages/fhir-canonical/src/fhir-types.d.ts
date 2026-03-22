/**
 * Ambient type alias: maps `fhir` namespace → `fhir4`
 *
 * @types/fhir exposes types under the global `fhir4` namespace.
 * This file creates a `fhir` namespace alias so source files can use
 * fhir.Patient, fhir.Bundle, etc. without any import statements.
 */

/// <reference types="@types/fhir" />

declare namespace fhir {
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
