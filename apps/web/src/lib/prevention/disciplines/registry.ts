import type { MedicalDiscipline } from '@prisma/client';
import type { DisciplineConfig } from './types';

const registry = new Map<MedicalDiscipline, DisciplineConfig>();

export function registerDiscipline(config: DisciplineConfig): void {
  registry.set(config.discipline, config);
}

export function getDisciplineConfig(discipline: MedicalDiscipline): DisciplineConfig | undefined {
  return registry.get(discipline);
}

export function getAllDisciplineConfigs(): DisciplineConfig[] {
  return Array.from(registry.values());
}

export function getRegisteredDisciplines(): MedicalDiscipline[] {
  return Array.from(registry.keys());
}
