export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--tf-panel-bg)] px-[18px] pb-[18px] text-[var(--tf-text)] max-[700px]:px-[10px] max-[700px]:pb-[10px]">
      {/* Header Skeleton */}
      <header className="flex h-[60px] items-center justify-between border-b border-[var(--tf-border)] bg-white px-5 dark:border-[#39353e] dark:bg-[#26232a] max-[700px]:h-auto max-[700px]:min-h-[60px] max-[700px]:gap-2">
        <div className="flex items-center gap-2">
          <div className="mr-0.5 h-10 w-[14px] rounded-[7px] bg-[var(--tf-purple)]" />
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--tf-purple)] text-lg text-white font-medium">
            M
          </div>
          <div className="h-5 w-28 rounded-md tf-shimmer" />
        </div>

        <nav className="flex items-center gap-6 max-[700px]:hidden">
          {["Forms", "Contacts", "Automations", "Insights", "Pages"].map((item) => (
            <span key={item} className="text-sm font-medium text-[var(--tf-muted)]">
              {item}
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="h-9 w-24 rounded-md tf-shimmer" />
          <div className="h-8 w-8 rounded-full tf-shimmer" />
        </div>
      </header>

      {/* Main Grid: Sidebar + Canvas */}
      <div className="grid flex-1 grid-cols-[260px_1fr] overflow-hidden rounded-b-2xl max-[900px]:grid-cols-1">
        {/* Left Sidebar Skeleton */}
        <aside className="flex flex-col border-r border-[var(--tf-border)] bg-[#faf9fa] p-4 text-[var(--tf-text)] dark:border-[#39353e] dark:bg-[#211f25] max-[900px]:hidden">
          <div className="h-10 w-full rounded-lg bg-[#262627]/80 dark:bg-[#343039] opacity-75" />

          <div className="mt-3.5 flex h-11 items-center gap-2.5 rounded-md border-y border-[var(--tf-border)] px-3">
            <span className="text-[var(--tf-muted)]">⌕</span>
            <div className="h-4 w-20 rounded tf-shimmer" />
          </div>

          <div className="flex items-center justify-between px-3 pb-2 pt-[18px]">
            <span className="text-sm text-[var(--tf-muted)]">▦ Workspaces</span>
            <div className="h-8 w-8 rounded-md tf-shimmer" />
          </div>

          <div className="px-3.5 py-3 text-sm font-semibold text-[var(--tf-text)]">Private</div>

          <div className="space-y-1 px-1">
            {[1, 2].map((k) => (
              <div key={k} className="flex h-10 items-center justify-between rounded-md px-3">
                <div className="h-4 w-24 rounded tf-shimmer" />
                <div className="h-4 w-5 rounded tf-shimmer" />
              </div>
            ))}
          </div>

          <div className="flex-1" />

          <div className="border-t border-[var(--tf-border)] pt-[18px]">
            <div className="text-xs text-[var(--tf-muted)]">Responses collected</div>
            <div className="my-2 h-1.5 w-full rounded-sm bg-neutral-200 dark:bg-neutral-800">
              <div className="h-full w-1/4 rounded-sm bg-[var(--tf-purple)]" />
            </div>
            <div className="h-5 w-16 rounded tf-shimmer" />
          </div>

          <div className="mt-3.5 flex min-h-12 items-center rounded-lg border border-[#dcd5df] bg-white p-2 dark:border-[#39353e] dark:bg-[#19191c]">
            <div className="h-4 w-28 rounded tf-shimmer" />
          </div>
        </aside>

        {/* Main Canvas Skeleton */}
        <main className="min-w-0 overflow-auto bg-white p-8 text-[var(--tf-text)] max-[700px]:p-[22px_16px] dark:bg-[#1d1b20]">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-44 rounded-lg tf-shimmer" />
              <div className="h-7 w-16 rounded-md tf-shimmer" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-32 rounded-lg tf-shimmer" />
              <div className="h-9 w-24 rounded-lg tf-shimmer" />
            </div>
          </div>

          <hr className="my-6 border-0 border-t border-[#e6e6e6] dark:border-[#39353e]" />

          {/* Banner Skeleton Cards */}
          <div className="mb-[34px] grid grid-cols-2 gap-5 max-[900px]:grid-cols-1">
            {[0, 1].map((idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 rounded-[10px] bg-[#faf8fa] p-5 dark:bg-[#26232a]"
              >
                <div className="h-10 w-10 flex-none rounded-lg tf-shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded tf-shimmer" />
                  <div className="h-4 w-1/2 rounded tf-shimmer" />
                  <div className="h-7 w-24 rounded-md tf-shimmer" />
                </div>
              </div>
            ))}
          </div>

          {/* Form List Table Skeleton */}
          <div className="grid grid-cols-[minmax(220px,1fr)_100px_110px_110px_130px_110px_44px] items-center gap-1.5 px-4 pb-3.5 text-base text-[var(--tf-muted)] dark:text-[#aaa2ae] max-[900px]:grid-cols-[1fr_44px]">
            <span />
            <span className="max-[900px]:hidden">Contacts</span>
            <span className="max-[900px]:hidden">Responses</span>
            <span className="max-[900px]:hidden">Completed</span>
            <span className="max-[900px]:hidden">Updated</span>
            <span className="max-[900px]:hidden">Integrations</span>
            <span />
          </div>

          {[1, 2, 3].map((k) => (
            <div
              key={k}
              className="mb-2 grid h-[60px] grid-cols-[minmax(220px,1fr)_100px_110px_110px_130px_110px_44px] items-center gap-1.5 rounded-xl border border-[var(--tf-border)] bg-white px-4 dark:border-[#39353e] dark:bg-[#26232a] max-[900px]:grid-cols-[1fr_44px] max-[900px]:[&>*:not(:first-child):not(:last-child)]:hidden"
            >
              <div className="flex min-w-0 items-center gap-2.5 overflow-hidden">
                <div className="h-10 w-10 shrink-0 rounded-lg tf-shimmer" />
                <div className="h-4 w-32 rounded-md tf-shimmer" />
                <div className="h-4 w-14 rounded-[10px] tf-shimmer" />
              </div>
              <div className="h-3.5 w-4 rounded tf-shimmer" />
              <div className="h-3.5 w-6 rounded tf-shimmer" />
              <div className="h-3.5 w-6 rounded tf-shimmer" />
              <div className="h-3.5 w-20 rounded tf-shimmer" />
              <div className="h-6 w-6 rounded tf-shimmer" />
              <div className="h-4 w-4 rounded tf-shimmer" />
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
