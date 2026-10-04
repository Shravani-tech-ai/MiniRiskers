import { SectionFooter, SectionStatus } from "./SectionControls";

function CustomerProfile({
  customerForm,
  setCustomerForm,
  customerSaved,
  savingCustomer,
  saveCustomerProfile,
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
              Customer Profile
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Define the customer population, onboarding and
              customer-related risk characteristics.
            </p>
          </div>

          <SectionStatus saved={customerSaved} section={section} />

        </div>
      </div>

      <fieldset disabled={locked} className="min-w-0">
      {/* Form */}
      <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">

        {/* Customer Type */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Customer Type *
          </label>

          <select
            value={customerForm.customer_type}
            onChange={(e) =>
              setCustomerForm({
                ...customerForm,
                customer_type: e.target.value,
              })
            }
            className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:ring-indigo-900/40"
          >
            <option value="">Select customer type</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="BUSINESS">Business</option>
            <option value="BOTH">Individual & Business</option>
          </select>
        </div>

        {/* Customer Segment */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Customer Segment
          </label>

          <input
            type="text"
            value={customerForm.customer_segment}
            onChange={(e) =>
              setCustomerForm({
                ...customerForm,
                customer_segment: e.target.value,
              })
            }
            placeholder="e.g. Retail / SME / Corporate / HNI"
            className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:ring-indigo-900/40"
          />
        </div>

        {/* Onboarding Method */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Onboarding Method *
          </label>

          <input
            type="text"
            value={customerForm.onboarding_method}
            onChange={(e) =>
              setCustomerForm({
                ...customerForm,
                onboarding_method: e.target.value,
              })
            }
            placeholder="e.g. Digital / Branch / Agent"
            className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:ring-indigo-900/40"
          />
        </div>

        {/* KYC Method */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            KYC Method
          </label>

          <input
            type="text"
            value={customerForm.kyc_method}
            onChange={(e) =>
              setCustomerForm({
                ...customerForm,
                kyc_method: e.target.value,
              })
            }
            placeholder="e.g. Aadhaar / Video KYC / Branch KYC"
            className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:ring-indigo-900/40"
          />
        </div>

        {/* Expected Customer Count */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Expected Customer Count
          </label>

          <input
            type="number"
            value={customerForm.expected_customer_count}
            onChange={(e) =>
              setCustomerForm({
                ...customerForm,
                expected_customer_count: e.target.value,
              })
            }
            placeholder="e.g. 10000"
            className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:ring-indigo-900/40"
          />
        </div>

        {/* Customer Geographic Distribution */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Customer Geographic Distribution
          </label>

          <input
            type="text"
            value={customerForm.customer_geographic_distribution}
            onChange={(e) =>
              setCustomerForm({
                ...customerForm,
                customer_geographic_distribution: e.target.value,
              })
            }
            placeholder="e.g. India / UAE / UK / USA"
            className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:ring-indigo-900/40"
          />
        </div>

        {/* Customer Risk Characteristics */}
        <div className="md:col-span-2">

          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            Customer Risk Characteristics
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

            {/* Foreign Customer */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <input
                type="checkbox"
                checked={customerForm.foreign_customer}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    foreign_customer: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700 dark:text-slate-300">
                Foreign Customer Exposure
              </span>
            </label>

            {/* Beneficial Owner */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <input
                type="checkbox"
                checked={customerForm.beneficial_owner_required}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    beneficial_owner_required: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700 dark:text-slate-300">
                Beneficial Owner Required
              </span>
            </label>

            {/* PEP Exposure */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <input
                type="checkbox"
                checked={customerForm.pep_exposure}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    pep_exposure: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700 dark:text-slate-300">
                PEP Exposure
              </span>
            </label>

            {/* High Risk Customer */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <input
                type="checkbox"
                checked={customerForm.high_risk_customer_exposure}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    high_risk_customer_exposure: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700 dark:text-slate-300">
                High-Risk Customer Exposure
              </span>
            </label>

            {/* KYC Required */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <input
                type="checkbox"
                checked={customerForm.kyc_required}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    kyc_required: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700 dark:text-slate-300">
                KYC Required
              </span>
            </label>

            {/* Individual Customer */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <input
                type="checkbox"
                checked={customerForm.individual_customer}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    individual_customer: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700 dark:text-slate-300">
                Individual Customers
              </span>
            </label>

            {/* Business Customer */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <input
                type="checkbox"
                checked={customerForm.business_customer}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    business_customer: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700 dark:text-slate-300">
                Business Customers
              </span>
            </label>

          </div>
        </div>

      </div>

      </fieldset>

      {/* Footer */}
      <SectionFooter
        section={section}
        saved={customerSaved}
        saving={savingCustomer}
        onSave={saveCustomerProfile}
        label="Customer Profile"
        readOnly={readOnly}
      />

    </div>
  );
}

export default CustomerProfile;