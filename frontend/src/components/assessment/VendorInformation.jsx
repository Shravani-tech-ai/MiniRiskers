import { SectionFooter, SectionStatus } from "./SectionControls";

function VendorInformation({
  vendorForm,
  setVendorForm,
  vendorSaved,
  savingVendor,
  saveVendor,
  readOnly = false,
  section = {},
}) {
  const locked = readOnly || Boolean(section.locked);

  return (
    <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">

      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6">

        <div className="flex items-center justify-between">

          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Vendor / Third-Party Information
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Capture third-party involvement and outsourcing risk characteristics.
            </p>
          </div>

          <SectionStatus saved={vendorSaved} section={section} />

        </div>

      </div>

      <fieldset disabled={locked} className="min-w-0">
      {/* Form */}
      <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">

        {/* Vendor Name */}
        <div>

          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Vendor Name *
          </label>

          <input
            type="text"
            value={vendorForm.vendor_name}
            onChange={(e) =>
              setVendorForm({
                ...vendorForm,
                vendor_name: e.target.value,
              })
            }
            placeholder="e.g. Global Payments Partner"
            className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:ring-indigo-900/40"
          />

        </div>

        {/* Vendor Type */}
        <div>

          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Vendor Type *
          </label>

          <input
            type="text"
            value={vendorForm.vendor_type}
            onChange={(e) =>
              setVendorForm({
                ...vendorForm,
                vendor_type: e.target.value,
              })
            }
            placeholder="e.g. Payment Processor / Technology Provider"
            className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:ring-indigo-900/40"
          />

        </div>

        {/* Vendor Country */}
        <div>

          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Vendor Country
          </label>

          <input
            type="text"
            value={vendorForm.country}
            onChange={(e) =>
              setVendorForm({
                ...vendorForm,
                country: e.target.value,
              })
            }
            placeholder="e.g. India"
            className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:ring-indigo-900/40"
          />

        </div>

        {/* Criticality */}
        <div>

          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Criticality
          </label>

          <select
            value={vendorForm.criticality}
            onChange={(e) =>
              setVendorForm({
                ...vendorForm,
                criticality: e.target.value,
              })
            }
            className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:ring-indigo-900/40"
          >
            <option value="">Select criticality</option>
            <option value="LOW">
              Low
            </option>

            <option value="MEDIUM">
              Medium
            </option>

            <option value="HIGH">
              High
            </option>

            <option value="CRITICAL">
              Critical
            </option>
          </select>

        </div>

        {/* Outsourcing Type */}
        <div>

          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Outsourcing Type
          </label>

          <input
            type="text"
            value={vendorForm.outsourcing_type}
            onChange={(e) =>
              setVendorForm({
                ...vendorForm,
                outsourcing_type: e.target.value,
              })
            }
            placeholder="e.g. Technology / Payment Processing"
            className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:ring-indigo-900/40"
          />

        </div>

        {/* Service Description */}
        <div className="md:col-span-2">

          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Service Description
          </label>

          <textarea
            rows={3}
            value={vendorForm.service_description}
            onChange={(e) =>
              setVendorForm({
                ...vendorForm,
                service_description: e.target.value,
              })
            }
            placeholder="Describe the services provided by the vendor..."
            className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:ring-indigo-900/40"
          />

        </div>

        {/* Vendor Risk Characteristics */}
        <div className="md:col-span-2">

          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            Vendor Risk Characteristics
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">

            {/* Handles Customer Data */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">

              <input
                type="checkbox"
                checked={vendorForm.handles_customer_data}
                onChange={(e) =>
                  setVendorForm({
                    ...vendorForm,
                    handles_customer_data: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700 dark:text-slate-300">
                Handles Customer Data
              </span>

            </label>

            {/* Handles Transactions */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">

              <input
                type="checkbox"
                checked={vendorForm.handles_transactions}
                onChange={(e) =>
                  setVendorForm({
                    ...vendorForm,
                    handles_transactions: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700 dark:text-slate-300">
                Handles Transactions
              </span>

            </label>

            {/* Handles Payment Data */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">

              <input
                type="checkbox"
                checked={vendorForm.handles_payment_data}
                onChange={(e) =>
                  setVendorForm({
                    ...vendorForm,
                    handles_payment_data: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700 dark:text-slate-300">
                Handles Payment Data
              </span>

            </label>

            {/* Cross-Border Processing */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">

              <input
                type="checkbox"
                checked={vendorForm.cross_border_processing}
                onChange={(e) =>
                  setVendorForm({
                    ...vendorForm,
                    cross_border_processing: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700 dark:text-slate-300">
                Cross-Border Processing
              </span>

            </label>

          </div>

        </div>

        {/* Vendor Governance */}
        <div className="md:col-span-2">

          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            Vendor Governance
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">

            {/* Due Diligence */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">

              <input
                type="checkbox"
                checked={vendorForm.due_diligence_completed}
                onChange={(e) =>
                  setVendorForm({
                    ...vendorForm,
                    due_diligence_completed: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700 dark:text-slate-300">
                Due Diligence Completed
              </span>

            </label>

            {/* Contract */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">

              <input
                type="checkbox"
                checked={vendorForm.contract_completed}
                onChange={(e) =>
                  setVendorForm({
                    ...vendorForm,
                    contract_completed: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700 dark:text-slate-300">
                Contract Completed
              </span>

            </label>

            {/* Audit Rights */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">

              <input
                type="checkbox"
                checked={vendorForm.audit_rights}
                onChange={(e) =>
                  setVendorForm({
                    ...vendorForm,
                    audit_rights: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700 dark:text-slate-300">
                Audit Rights
              </span>

            </label>

            {/* Business Continuity Plan */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">

              <input
                type="checkbox"
                checked={vendorForm.business_continuity_plan}
                onChange={(e) =>
                  setVendorForm({
                    ...vendorForm,
                    business_continuity_plan: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700 dark:text-slate-300">
                Business Continuity Plan
              </span>

            </label>

          </div>

        </div>

      </div>

      </fieldset>

      {/* Footer */}
      <SectionFooter
        section={section}
        saved={vendorSaved}
        saving={savingVendor}
        onSave={saveVendor}
        label="Vendor"
        readOnly={readOnly}
      />

    </div>
  );
}

export default VendorInformation;