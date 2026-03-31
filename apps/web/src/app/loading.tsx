export default function RootLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 animate-pulse flex flex-col items-center justify-center">
      <div className="w-full max-w-sm space-y-4 px-8">
        <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-800 mx-auto" />
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded mx-auto" />
        <div className="space-y-3 mt-6">
          <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl w-3/4 mx-auto" />
        </div>
      </div>
    </div>
  );
}
