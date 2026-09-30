import { Lock } from "lucide-react";

import { tabSelected, tabUnselected } from "../../utils/buttonStyles";

const INPUT_TABS = [
  { id: "product", label: "Product" },
  { id: "customer", label: "Customer" },
  { id: "geography", label: "Geography" },
  { id: "transaction", label: "Transaction" },
  { id: "channel", label: "Channel" },
  { id: "vendor", label: "Vendor" },
  { id: "preview", label: "Preview" },
];

function RequestInputTabs({
  activeTab,
  onTabChange,
  isTabEnabled = () => true,
  children,
}) {
  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Assessment inputs
        </h2>
        <p className="mt-2 text-base text-slate-600 dark:text-slate-400">
          Complete and save each section in order, or use BRD extraction above.
        </p>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
        {INPUT_TABS.map((tab) => {
          const selected = activeTab === tab.id;
          const enabled = selected || isTabEnabled(tab.id);

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => enabled && onTabChange(tab.id)}
              disabled={!enabled}
              title={enabled ? undefined : "Save the previous sections first"}
              className={[
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-bold transition sm:px-5 sm:text-base",
                selected
                  ? tabSelected
                  : enabled
                  ? tabUnselected
                  : "cursor-not-allowed text-slate-400 dark:text-slate-600",
              ].join(" ")}
            >
              {!enabled && <Lock size={14} />}
              {tab.label}
            </button>
          );
        })}
      </div>

      {children}
    </div>
  );
}

export { INPUT_TABS };
export default RequestInputTabs;
