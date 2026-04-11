#!/usr/bin/env node

/**
 * Bundle Analyzer & Tracker
 * - Parse Next.js BUILD_MANIFEST.json after build
 * - Extract per-page JS sizes, shared chunks, CSS
 * - Compare against budgets in sprint5-assets/performance-budgets.json
 * - Output: JSON report + console table with green/yellow/red indicators
 * - Fail CI if any critical budget exceeded
 * - Track history in .bundle-history.json for trend analysis
 */

import fs from 'fs';
import path from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

interface BudgetConfig {
  [page: string]: {
    js: number; // KB
    css: number; // KB
    total: number; // KB
    critical?: boolean; // fail CI if exceeded
  };
}

interface BundleEntry {
  path: string;
  size: number; // bytes
  sizeKB: number; // KB
  gzip?: number; // gzip size
  type: 'js' | 'css' | 'html' | 'other';
}

interface BuildManifest {
  pages: {
    [route: string]: {
      files: string[];
    };
  };
  ampFirstPages: string[];
  lowPriorityPages?: string[];
  ampValidationWarnings?: string[];
}

interface BundleReport {
  timestamp: string;
  version: string;
  buildTime: number;
  pages: {
    [page: string]: {
      jsSize: number;
      cssSize: number;
      totalSize: number;
      jsFiles: string[];
      cssFiles: string[];
      budgetStatus: 'PASS' | 'WARN' | 'FAIL';
      budgetDetails: {
        jsUsage: number; // percentage
        cssUsage: number; // percentage
        totalUsage: number; // percentage
      };
    };
  };
  summary: {
    totalJSSize: number;
    totalCSSSize: number;
    criticalBudgetsFailed: string[];
    warnings: string[];
    recommendations: string[];
  };
}

interface BundleHistoryEntry {
  timestamp: string;
  version: string;
  totalJSSize: number;
  totalCSSSize: number;
  pageCount: number;
  failedBudgets: string[];
}

class BundleTracker {
  private buildDir = '.next';
  private manifestPath = path.join(this.buildDir, 'build-manifest.json');
  private budgetsPath = 'sprint5-assets/performance-budgets.json';
  private historyPath = '.bundle-history.json';
  private reportPath = 'bundle-report.json';

  async run() {
    console.log('📦 Starting bundle analysis...\n');

    const startTime = Date.now();

    try {
      // 1. Load manifest and budgets
      const manifest = this.loadManifest();
      const budgets = this.loadBudgets();
      const history = this.loadHistory();

      // 2. Parse bundle sizes
      const report = this.analyzeBundle(manifest, budgets);

      // 3. Track history
      this.updateHistory(history, report);

      // 4. Output results
      this.outputReport(report);
      this.outputConsoleTable(report, budgets);

      // 5. Check for failures
      const hasCriticalFailures = report.summary.criticalBudgetsFailed.length > 0;

      if (hasCriticalFailures) {
        console.error(
          '\n❌ CRITICAL BUDGET EXCEEDED — CI will fail\n'
        );
        console.error('Failed budgets:', report.summary.criticalBudgetsFailed.join(', '));
        process.exit(1);
      } else if (report.summary.warnings.length > 0) {
        console.warn('\n⚠️  Budget warnings (non-critical):\n');
        report.summary.warnings.forEach((w) => console.warn(`  - ${w}`));
      }

      console.log('\n✅ Bundle analysis complete');
      console.log(`   Analyzed ${Object.keys(report.pages).length} pages`);
      console.log(`   Total JS: ${(report.summary.totalJSSize / 1024).toFixed(1)} MB`);
      console.log(`   Total CSS: ${(report.summary.totalCSSSize / 1024).toFixed(1)} MB`);
      console.log(`   Time: ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error);
      process.exit(1);
    }
  }

  private loadManifest(): BuildManifest {
    if (!existsSync(this.manifestPath)) {
      throw new Error(`Build manifest not found at ${this.manifestPath}. Run 'pnpm build' first.`);
    }

    const content = readFileSync(this.manifestPath, 'utf-8');
    return JSON.parse(content);
  }

  private loadBudgets(): BudgetConfig {
    try {
      const content = readFileSync(this.budgetsPath, 'utf-8');
      const budgetsData = JSON.parse(content);
      return budgetsData.budgets || {};
    } catch (err) {
      console.warn('⚠️  Could not load budgets, using defaults');
      return this.getDefaultBudgets();
    }
  }

  private getDefaultBudgets(): BudgetConfig {
    return {
      '/dashboard': { js: 250, css: 50, total: 300, critical: true },
      '/dashboard/clinical-command': { js: 300, css: 50, total: 350, critical: true },
      '/dashboard/comunicacoes': { js: 200, css: 40, total: 240, critical: true },
      '/dashboard/faturamento': { js: 250, css: 50, total: 300, critical: true },
      '/portal/dashboard': { js: 200, css: 40, total: 240, critical: true },
      '/portal/dashboard/lab-results': { js: 220, css: 45, total: 265, critical: true },
      '/portal/dashboard/privacy': { js: 180, css: 35, total: 215, critical: true },
      '/verify/prescription/[hash]': { js: 150, css: 30, total: 180, critical: false },
    };
  }

  private loadHistory(): BundleHistoryEntry[] {
    if (!existsSync(this.historyPath)) {
      return [];
    }
    try {
      const content = readFileSync(this.historyPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  private analyzeBundle(manifest: BuildManifest, budgets: BudgetConfig): BundleReport {
    const report: BundleReport = {
      timestamp: new Date().toISOString(),
      version: this.getPackageVersion(),
      buildTime: 0,
      pages: {},
      summary: {
        totalJSSize: 0,
        totalCSSSize: 0,
        criticalBudgetsFailed: [],
        warnings: [],
        recommendations: [],
      },
    };

    const fileCache: { [file: string]: number } = {};

    // Process each page
    Object.entries(manifest.pages).forEach(([route, pageData]) => {
      const jsFiles: string[] = [];
      const cssFiles: string[] = [];
      let jsSize = 0;
      let cssSize = 0;

      pageData.files.forEach((file) => {
        const fileSize = this.getFileSize(file, fileCache);

        if (file.endsWith('.js')) {
          jsFiles.push(file);
          jsSize += fileSize;
        } else if (file.endsWith('.css')) {
          cssFiles.push(file);
          cssSize += fileSize;
        }
      });

      const totalSize = jsSize + cssSize;
      const budget = budgets[route] || this.getDefaultBudgetForRoute(route);

      const jsUsagePercent = (jsSize / (budget.js * 1024)) * 100;
      const cssUsagePercent = (cssSize / (budget.css * 1024)) * 100;
      const totalUsagePercent = (totalSize / (budget.total * 1024)) * 100;

      const budgetStatus = this.determineBudgetStatus(
        jsUsagePercent,
        cssUsagePercent,
        totalUsagePercent
      );

      report.pages[route] = {
        jsSize,
        cssSize,
        totalSize,
        jsFiles,
        cssFiles,
        budgetStatus,
        budgetDetails: {
          jsUsage: Math.round(jsUsagePercent * 10) / 10,
          cssUsage: Math.round(cssUsagePercent * 10) / 10,
          totalUsage: Math.round(totalUsagePercent * 10) / 10,
        },
      };

      report.summary.totalJSSize += jsSize;
      report.summary.totalCSSSize += cssSize;

      // Track failures
      if (budgetStatus === 'FAIL') {
        const failMsg = `${route}: ${(totalSize / 1024).toFixed(1)}KB (budget: ${budget.total}KB)`;
        if (budget.critical) {
          report.summary.criticalBudgetsFailed.push(failMsg);
        } else {
          report.summary.warnings.push(failMsg);
        }
      } else if (budgetStatus === 'WARN') {
        report.summary.warnings.push(
          `${route}: ${totalUsagePercent.toFixed(0)}% of budget (${(totalSize / 1024).toFixed(1)}KB)`
        );
      }
    });

    // Recommendations
    if (report.summary.totalJSSize > 350 * 1024) {
      report.summary.recommendations.push(
        'Total JS exceeds 350KB. Consider code splitting, lazy loading, or tree-shaking unused dependencies.'
      );
    }
    if (report.summary.criticalBudgetsFailed.length > 2) {
      report.summary.recommendations.push(
        'Multiple budgets exceeded. Review dynamic imports and shared chunk configuration.'
      );
    }

    return report;
  }

  private determineBudgetStatus(
    jsPercent: number,
    cssPercent: number,
    totalPercent: number
  ): 'PASS' | 'WARN' | 'FAIL' {
    if (totalPercent > 100) return 'FAIL';
    if (totalPercent > 90 || jsPercent > 95 || cssPercent > 95) return 'WARN';
    return 'PASS';
  }

  private getFileSize(file: string, cache: { [file: string]: number }): number {
    if (cache[file] !== undefined) return cache[file];

    const filePath = path.join(this.buildDir, file);
    try {
      const stats = fs.statSync(filePath);
      cache[file] = stats.size;
      return stats.size;
    } catch {
      console.warn(`⚠️  Could not stat file: ${filePath}`);
      return 0;
    }
  }

  private getDefaultBudgetForRoute(route: string) {
    return { js: 250, css: 50, total: 300 };
  }

  private getPackageVersion(): string {
    try {
      const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
      return pkg.version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  private updateHistory(history: BundleHistoryEntry[], report: BundleReport) {
    const entry: BundleHistoryEntry = {
      timestamp: report.timestamp,
      version: report.version,
      totalJSSize: report.summary.totalJSSize,
      totalCSSSize: report.summary.totalCSSSize,
      pageCount: Object.keys(report.pages).length,
      failedBudgets: report.summary.criticalBudgetsFailed,
    };

    history.push(entry);

    // Keep last 30 entries
    if (history.length > 30) {
      history.shift();
    }

    writeFileSync(this.historyPath, JSON.stringify(history, null, 2));
  }

  private outputReport(report: BundleReport) {
    writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to ${this.reportPath}`);
  }

  private outputConsoleTable(report: BundleReport, budgets: BudgetConfig) {
    console.log('\n📊 Bundle Sizes by Page:\n');

    const rows: any[] = [];

    Object.entries(report.pages).forEach(([route, data]) => {
      const budget = budgets[route] || this.getDefaultBudgetForRoute(route);
      const statusIcon =
        data.budgetStatus === 'PASS'
          ? '✅'
          : data.budgetStatus === 'WARN'
          ? '⚠️ '
          : '❌';

      rows.push({
        page: route,
        'JS (KB)': `${(data.jsSize / 1024).toFixed(1)}/${budget.js}`,
        'CSS (KB)': `${(data.cssSize / 1024).toFixed(1)}/${budget.css}`,
        'Total (KB)': `${(data.totalSize / 1024).toFixed(1)}/${budget.total}`,
        'Usage %': `${data.budgetDetails.totalUsage.toFixed(0)}%`,
        Status: statusIcon,
      });
    });

    console.table(rows);
  }
}

// Run if executed directly
if (require.main === module) {
  new BundleTracker().run();
}

export { BundleTracker, BundleReport, BundleHistoryEntry };
