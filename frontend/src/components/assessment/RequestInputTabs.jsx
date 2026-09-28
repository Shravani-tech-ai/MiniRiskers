import { ArrowLeft, ArrowRight } from "lucide-react";

const INPUT_TABS = [
  { id: "product", label: "Product" },
  { id: "customer", label: "Customer" },
  { id: "geography", label: "Geography" },
  { id: "transaction", label: "Transaction" },
  { id: "channel", label: "Channel" },
  { id: "vendor", label: "Vendor" },
  { id: "preview", label: "Preview" },
];

function RequestInputTabs({ activeTab, onTabChange, children }) {
  const activeIndex = INPUT_TABS.findIndex((tab) => tab.id === activeTab);
  const previousTab = INPUT_TABS[activeIndex - 1];
  const nextTab = INPUT_TABS[activeIndex + 1];

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-slate-900">
          Assessment inputs
        </h2>
        <p className="mt-2 text-base text-slate-600">
          Complete each section or use BRD extraction above.
        </p>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
        {INPUT_TABS.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={[
                "shrink-0 rounded-lg px-4 py-2.5 text-sm font-bold transition sm:px-5 sm:text-base",
                selected
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {children}

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => previousTab && onTabChange(previousTab.id)}
          disabled={!previousTab}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft size={16} />
          Previous{previousTab ? `: ${previousTab.label}` : ""}
        </button>

        <button
          type="button"
          onClick={() => nextTab && onTabChange(nextTab.id)}
          disabled={!nextTab}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next{nextTab ? `: ${nextTab.label}` : ""}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

export { INPUT_TABS };
export default RequestInputTabs;
