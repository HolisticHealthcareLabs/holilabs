'use client';

/**
 * Dark Mode Showcase Component
 *
 * Demonstrates all CSS variables in both light and dark modes.
 * Useful for testing theme implementation and visual consistency.
 *
 * Usage:
 * import DarkModeShowcase from '@/components/DarkModeShowcase';
 * <DarkModeShowcase />
 */

import { useTheme } from '@/providers/ThemeProvider';

export default function DarkModeShowcase() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const colorSwatches = [
    { name: 'Background', class: 'bg-background border-border' },
    { name: 'Foreground', class: 'bg-foreground' },
    { name: 'Card', class: 'bg-card border-border' },
    { name: 'Primary', class: 'bg-primary' },
    { name: 'Secondary', class: 'bg-secondary' },
    { name: 'Muted', class: 'bg-muted' },
    { name: 'Accent', class: 'bg-accent' },
    { name: 'Destructive', class: 'bg-destructive' },
    { name: 'Success', class: 'bg-success' },
    { name: 'Warning', class: 'bg-warning' },
    { name: 'Info', class: 'bg-info' },
    { name: 'Error', class: 'bg-error' },
  ];

  const chartColors = [
    { name: 'Chart 1 (Blue)', class: 'bg-chart-1' },
    { name: 'Chart 2 (Green)', class: 'bg-chart-2' },
    { name: 'Chart 3 (Purple)', class: 'bg-chart-3' },
    { name: 'Chart 4 (Orange)', class: 'bg-chart-4' },
    { name: 'Chart 5 (Red)', class: 'bg-chart-5' },
    { name: 'Chart 6 (Teal)', class: 'bg-chart-6' },
    { name: 'Chart 7 (Pink)', class: 'bg-chart-7' },
    { name: 'Chart 8 (Yellow)', class: 'bg-chart-8' },
  ];

  const statusColors = [
    { name: 'Online', class: 'bg-status-online' },
    { name: 'Offline', class: 'bg-status-offline' },
    { name: 'Busy', class: 'bg-status-busy' },
    { name: 'Away', class: 'bg-status-away' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Dark Mode Showcase</h1>
          <p className="text-muted-foreground mb-4">
            All CSS variables in {resolvedTheme} mode
          </p>

          {/* Theme Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`px-4 py-2 rounded-lg ${
                theme === 'light'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-4 py-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setTheme('auto')}
              className={`px-4 py-2 rounded-lg ${
                theme === 'auto'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              Auto
            </button>
          </div>
        </div>

        {/* Core Colors */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Core Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {colorSwatches.map((swatch) => (
              <div
                key={swatch.name}
                className="bg-card border-border border rounded-lg p-4 shadow-sm"
              >
                <div className={`${swatch.class} h-20 rounded mb-2 border`}></div>
                <p className="text-sm font-medium">{swatch.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Chart Colors */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Chart Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {chartColors.map((color) => (
              <div
                key={color.name}
                className="bg-card border-border border rounded-lg p-4 shadow-sm"
              >
                <div className={`${color.class} h-20 rounded mb-2`}></div>
                <p className="text-sm font-medium">{color.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Status Colors */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Status Indicators</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statusColors.map((status) => (
              <div
                key={status.name}
                className="bg-card border-border border rounded-lg p-4 shadow-sm"
              >
                <div className={`${status.class} h-20 rounded mb-2`}></div>
                <p className="text-sm font-medium">{status.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Shadows */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Shadows</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="bg-card rounded-lg p-6 shadow-sm">
              <p className="font-medium">shadow-sm</p>
            </div>
            <div className="bg-card rounded-lg p-6 shadow-md">
              <p className="font-medium">shadow-md</p>
            </div>
            <div className="bg-card rounded-lg p-6 shadow-lg">
              <p className="font-medium">shadow-lg</p>
            </div>
            <div className="bg-card rounded-lg p-6 shadow-xl">
              <p className="font-medium">shadow-xl</p>
            </div>
          </div>
        </section>

        {/* Component Examples */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Component Examples</h2>

          {/* Buttons */}
          <div className="mb-8">
            <h3 className="text-xl font-medium mb-3">Buttons</h3>
            <div className="flex flex-wrap gap-3">
              <button className="bg-primary text-primary-foreground hover:opacity-90 px-4 py-2 rounded-lg shadow-sm">
                Primary Button
              </button>
              <button className="bg-secondary text-secondary-foreground hover:bg-hover px-4 py-2 rounded-lg shadow-sm">
                Secondary Button
              </button>
              <button className="bg-accent text-accent-foreground hover:opacity-90 px-4 py-2 rounded-lg shadow-sm">
                Accent Button
              </button>
              <button className="bg-destructive text-destructive-foreground hover:opacity-90 px-4 py-2 rounded-lg shadow-sm">
                Destructive Button
              </button>
              <button className="text-foreground hover:bg-hover px-4 py-2 rounded-lg">
                Ghost Button
              </button>
            </div>
          </div>

          {/* Alerts */}
          <div className="mb-8">
            <h3 className="text-xl font-medium mb-3">Alerts</h3>
            <div className="space-y-3">
              <div className="bg-success-light border-success border-l-4 p-4 rounded">
                <p className="text-success-dark font-semibold">Success Alert</p>
                <p className="text-success-dark">This is a success message.</p>
              </div>
              <div className="bg-warning-light border-warning border-l-4 p-4 rounded">
                <p className="text-warning-dark font-semibold">Warning Alert</p>
                <p className="text-warning-dark">This is a warning message.</p>
              </div>
              <div className="bg-error-light border-error border-l-4 p-4 rounded">
                <p className="text-error-dark font-semibold">Error Alert</p>
                <p className="text-error-dark">This is an error message.</p>
              </div>
              <div className="bg-info-light border-info border-l-4 p-4 rounded">
                <p className="text-info-dark font-semibold">Info Alert</p>
                <p className="text-info-dark">This is an info message.</p>
              </div>
            </div>
          </div>

          {/* Cards */}
          <div className="mb-8">
            <h3 className="text-xl font-medium mb-3">Cards</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-card text-card-foreground border-border border rounded-lg shadow-md p-6">
                <h4 className="text-lg font-semibold mb-2">Card Title</h4>
                <p className="text-muted-foreground">
                  This is a card with default styling.
                </p>
              </div>
              <div className="bg-card text-card-foreground border-border border rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h4 className="text-lg font-semibold mb-2">Hoverable Card</h4>
                <p className="text-muted-foreground">
                  Hover over this card to see the shadow change.
                </p>
              </div>
              <div className="bg-secondary text-secondary-foreground border-border border rounded-lg shadow-sm p-6">
                <h4 className="text-lg font-semibold mb-2">Secondary Card</h4>
                <p className="text-muted-foreground">
                  This card uses secondary background color.
                </p>
              </div>
            </div>
          </div>

          {/* Inputs */}
          <div className="mb-8">
            <h3 className="text-xl font-medium mb-3">Form Inputs</h3>
            <div className="space-y-3 max-w-md">
              <input
                type="text"
                placeholder="Text input"
                className="w-full bg-background text-foreground border-input border rounded-lg px-3 py-2 focus:ring-2 focus:ring-ring focus:outline-none"
              />
              <input
                type="text"
                placeholder="Disabled input"
                disabled
                className="w-full bg-disabled text-disabled-foreground border-input border rounded-lg px-3 py-2"
              />
              <textarea
                placeholder="Textarea"
                rows={3}
                className="w-full bg-background text-foreground border-input border rounded-lg px-3 py-2 focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </div>
          </div>

          {/* Status Badges */}
          <div className="mb-8">
            <h3 className="text-xl font-medium mb-3">Status Badges</h3>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 bg-status-online/10 text-status-online px-3 py-1 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-status-online rounded-full"></span>
                Online
              </span>
              <span className="inline-flex items-center gap-1 bg-status-offline/10 text-status-offline px-3 py-1 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-status-offline rounded-full"></span>
                Offline
              </span>
              <span className="inline-flex items-center gap-1 bg-status-busy/10 text-status-busy px-3 py-1 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-status-busy rounded-full"></span>
                Busy
              </span>
              <span className="inline-flex items-center gap-1 bg-status-away/10 text-status-away px-3 py-1 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-status-away rounded-full"></span>
                Away
              </span>
            </div>
          </div>

          {/* Skeleton Loading */}
          <div className="mb-8">
            <h3 className="text-xl font-medium mb-3">Skeleton Loading</h3>
            <div className="space-y-3 max-w-md">
              <div className="animate-pulse">
                <div className="h-4 bg-skeleton-base rounded mb-2"></div>
                <div className="h-4 bg-skeleton-base rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-skeleton-base rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive States */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Interactive States</h2>
          <div className="space-y-2 max-w-md">
            <div className="bg-background hover:bg-hover p-4 rounded-lg border-border border cursor-pointer transition-colors">
              Hover State (hover:bg-hover)
            </div>
            <div className="bg-background active:bg-active p-4 rounded-lg border-border border cursor-pointer transition-colors">
              Active State (active:bg-active)
            </div>
            <div className="bg-disabled text-disabled-foreground p-4 rounded-lg border-border border cursor-not-allowed">
              Disabled State
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
