export default function RootLoading() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-white dark:bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-[3px] border-gray-200 border-t-blue-600 animate-spin" />
        <span className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
          Loading...
        </span>
      </div>
    </div>
  );
}
