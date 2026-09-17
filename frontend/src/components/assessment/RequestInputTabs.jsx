const INPUT_TABS = [
  { id: "product", label: "Product" },
  { id: "customer", label: "Customer" },
  { id: "geography", label: "Geography" },
  { id: "transaction", label: "Transaction" },
  { id: "channel", label: "Channel" },
  { id: "vendor", label: "Vendor" },
];

function RequestInputTabs({ activeTab, onTabChange, children }) {
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
    </div>
  );
}

export { INPUT_TABS };
export default RequestInputTabs;
