/**
 * Casbin Prisma Adapter
 *
 * SOC 2 Control: CC6.3 (Authorization & Principle of Least Privilege)
 *
 * Custom adapter that stores Casbin policies in PostgreSQL via Prisma.
 * Implements the Casbin Adapter interface for loading and saving policies.
 *
 * Based on the official Casbin adapter pattern:
 * https://casbin.org/docs/adapters
 *
 * Database Schema:
 * - ptype: Policy type (p = policy, g = grouping/role)
 * - v0: Subject (role or user)
 * - v1: Object (resource)
 * - v2: Action (read, write, delete, etc.)
 * - v3: Domain (organization ID or *)
 * - v4: Effect (allow, deny)
 * - v5: Condition (optional)
 */

import { Adapter, Model, Helper } from 'casbin';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { CasbinRule } from '@prisma/client';

/**
 * Casbin line structure
 */
interface CasbinLine {
  ptype: string;
  v0?: string;
  v1?: string;
  v2?: string;
  v3?: string;
  v4?: string;
  v5?: string;
}

/**
 * PrismaAdapter - Casbin adapter using Prisma ORM
 */
export class PrismaAdapter implements Adapter {
  /**
   * Load all policies from database
   *
   * Called by Casbin enforcer during initialization.
   */
  async loadPolicy(model: Model): Promise<void> {
    try {
      logger.info({ event: 'casbin_load_policy_started' }, 'Loading Casbin policies from database');

      const rules = await prisma.casbinRule.findMany();

      for (const rule of rules) {
        this.loadPolicyLine(rule, model);
      }

      logger.info({
        event: 'casbin_load_policy_completed',
        rulesLoaded: rules.length,
      }, 'Successfully loaded Casbin policies');
    } catch (error) {
      logger.error({
        event: 'casbin_load_policy_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to load Casbin policies');

      throw new Error(`Failed to load policies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save all policies to database
   *
   * Called by Casbin enforcer when policies are modified.
   */
  async savePolicy(model: Model): Promise<boolean> {
    try {
      logger.info({ event: 'casbin_save_policy_started' }, 'Saving Casbin policies to database');

      // Clear existing policies
      await prisma.casbinRule.deleteMany();

      const lines: CasbinLine[] = [];

      // Extract all policies from model
      const policyMap = model.model.get('p');
      if (policyMap) {
        for (const [key, ast] of policyMap) {
          for (const rule of ast.policy) {
            const line = this.savePolicyLine(key, rule);
            lines.push(line);
          }
        }
      }

      // Extract all role mappings
      const roleMap = model.model.get('g');
      if (roleMap) {
        for (const [key, ast] of roleMap) {
          for (const rule of ast.policy) {
            const line = this.savePolicyLine(key, rule);
            lines.push(line);
          }
        }
      }

      // Bulk insert
      if (lines.length > 0) {
        await prisma.casbinRule.createMany({
          data: lines,
        });
      }

      logger.info({
        event: 'casbin_save_policy_completed',
        rulesSaved: lines.length,
      }, 'Successfully saved Casbin policies');

      return true;
    } catch (error) {
      logger.error({
        event: 'casbin_save_policy_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to save Casbin policies');

      return false;
    }
  }

  /**
   * Add a single policy rule
   *
   * @param sec - Section (p or g)
   * @param ptype - Policy type
   * @param rule - Policy rule array
   */
  async addPolicy(sec: string, ptype: string, rule: string[]): Promise<void> {
    try {
      const line = this.savePolicyLine(ptype, rule);

      await prisma.casbinRule.create({
        data: line,
      });

      logger.info({
        event: 'casbin_policy_added',
        ptype,
        rule,
      }, 'Casbin policy added');
    } catch (error) {
      logger.error({
        event: 'casbin_add_policy_failed',
        ptype,
        rule,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to add Casbin policy');

      throw error;
    }
  }

  /**
   * Add multiple policy rules
   *
   * @param sec - Section (p or g)
   * @param ptype - Policy type
   * @param rules - Array of policy rules
   */
  async addPolicies(sec: string, ptype: string, rules: string[][]): Promise<void> {
    try {
      const lines = rules.map((rule) => this.savePolicyLine(ptype, rule));

      await prisma.casbinRule.createMany({
        data: lines,
      });

      logger.info({
        event: 'casbin_policies_added',
        ptype,
        count: rules.length,
      }, 'Casbin policies added');
    } catch (error) {
      logger.error({
        event: 'casbin_add_policies_failed',
        ptype,
        count: rules.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to add Casbin policies');

      throw error;
    }
  }

  /**
   * Remove a single policy rule
   *
   * @param sec - Section (p or g)
   * @param ptype - Policy type
   * @param rule - Policy rule array
   */
  async removePolicy(sec: string, ptype: string, rule: string[]): Promise<void> {
    try {
      const line = this.savePolicyLine(ptype, rule);

      await prisma.casbinRule.deleteMany({
        where: {
          ptype: line.ptype,
          v0: line.v0,
          v1: line.v1,
          v2: line.v2,
          v3: line.v3,
          v4: line.v4,
          v5: line.v5,
        },
      });

      logger.info({
        event: 'casbin_policy_removed',
        ptype,
        rule,
      }, 'Casbin policy removed');
    } catch (error) {
      logger.error({
        event: 'casbin_remove_policy_failed',
        ptype,
        rule,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to remove Casbin policy');

      throw error;
    }
  }

  /**
   * Remove multiple policy rules
   *
   * @param sec - Section (p or g)
   * @param ptype - Policy type
   * @param rules - Array of policy rules
   */
  async removePolicies(sec: string, ptype: string, rules: string[][]): Promise<void> {
    try {
      for (const rule of rules) {
        await this.removePolicy(sec, ptype, rule);
      }

      logger.info({
        event: 'casbin_policies_removed',
        ptype,
        count: rules.length,
      }, 'Casbin policies removed');
    } catch (error) {
      logger.error({
        event: 'casbin_remove_policies_failed',
        ptype,
        count: rules.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to remove Casbin policies');

      throw error;
    }
  }

  /**
   * Remove all policies matching a filter
   *
   * @param sec - Section (p or g)
   * @param ptype - Policy type
   * @param fieldIndex - Field index to filter
   * @param fieldValues - Values to match
   */
  async removeFilteredPolicy(
    sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ): Promise<void> {
    try {
      const where: any = { ptype };

      // Map field index to v0-v5
      const fieldMap = ['v0', 'v1', 'v2', 'v3', 'v4', 'v5'];

      for (let i = 0; i < fieldValues.length; i++) {
        const fieldName = fieldMap[fieldIndex + i];
        if (fieldName && fieldValues[i]) {
          where[fieldName] = fieldValues[i];
        }
      }

      await prisma.casbinRule.deleteMany({ where });

      logger.info({
        event: 'casbin_filtered_policies_removed',
        ptype,
        fieldIndex,
        fieldValues,
      }, 'Casbin filtered policies removed');
    } catch (error) {
      logger.error({
        event: 'casbin_remove_filtered_policy_failed',
        ptype,
        fieldIndex,
        fieldValues,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to remove filtered Casbin policies');

      throw error;
    }
  }

  /**
   * Load a single policy line into the model
   *
   * @param line - Database rule
   * @param model - Casbin model
   */
  private loadPolicyLine(line: CasbinRule, model: Model): void {
    const result = line.ptype;
    const tokens: string[] = [result];

    if (line.v0) tokens.push(line.v0);
    if (line.v1) tokens.push(line.v1);
    if (line.v2) tokens.push(line.v2);
    if (line.v3) tokens.push(line.v3);
    if (line.v4) tokens.push(line.v4);
    if (line.v5) tokens.push(line.v5);

    const key = tokens[0];
    const sec = key.substring(0, 1);

    Helper.loadPolicyLine(tokens.join(', '), model);
  }

  /**
   * Convert policy rule to database line format
   *
   * @param ptype - Policy type
   * @param rule - Policy rule array
   * @returns Database line
   */
  private savePolicyLine(ptype: string, rule: string[]): CasbinLine {
    const line: CasbinLine = { ptype };

    if (rule.length > 0) line.v0 = rule[0];
    if (rule.length > 1) line.v1 = rule[1];
    if (rule.length > 2) line.v2 = rule[2];
    if (rule.length > 3) line.v3 = rule[3];
    if (rule.length > 4) line.v4 = rule[4];
    if (rule.length > 5) line.v5 = rule[5];

    return line;
  }
}

/**
 * Create a new PrismaAdapter instance
 *
 * @returns PrismaAdapter
 *
 * @example
 * ```typescript
 * const adapter = await newAdapter();
 * const enforcer = await newEnforcer('casbin-model.conf', adapter);
 * ```
 */
export async function newAdapter(): Promise<PrismaAdapter> {
  const adapter = new PrismaAdapter();

  logger.info({ event: 'casbin_adapter_created' }, 'Casbin PrismaAdapter initialized');

  return adapter;
}
