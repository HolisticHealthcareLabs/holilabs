export default function HelpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Help &amp; Support</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Need assistance? We&apos;re here to help.</p>
        <a
          href="mailto:support@holilabs.com"
          className="inline-flex items-center px-6 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold hover:opacity-90 transition-opacity"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
