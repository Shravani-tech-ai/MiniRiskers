function Geography({
  geographyForm,
  setGeographyForm,
  geographySaved,
  savingGeography,
  saveGeography,
}) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">

      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-50 p-6">
        <div className="flex items-center justify-between">

          <div>
            <h3 className="font-semibold text-slate-900">
              Geography
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Define geographic exposure and cross-border risk.
            </p>
          </div>

          {geographySaved && (
            <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
              ✓ Saved
            </span>
          )}

        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">

        {/* Country */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Country *
          </label>

          <input
            type="text"
            value={geographyForm.country}
            onChange={(e) =>
              setGeographyForm({
                ...geographyForm,
                country: e.target.value,
              })
            }
            placeholder="India"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Country Code */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Country Code
          </label>

          <input
            type="text"
            value={geographyForm.country_code}
            onChange={(e) =>
              setGeographyForm({
                ...geographyForm,
                country_code: e.target.value,
              })
            }
            placeholder="IN"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm uppercase outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Geographic Exposure */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Geographic Exposure
          </label>

          <select
            value={geographyForm.domestic_or_cross_border}
            onChange={(e) =>
              setGeographyForm({
                ...geographyForm,
                domestic_or_cross_border: e.target.value,
              })
            }
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="DOMESTIC">Domestic</option>
            <option value="CROSS_BORDER">Cross Border</option>
          </select>
        </div>

        {/* Customer Country */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Customer Country
          </label>

          <input
            type="text"
            value={geographyForm.customer_country}
            onChange={(e) =>
              setGeographyForm({
                ...geographyForm,
                customer_country: e.target.value,
              })
            }
            placeholder="India"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Transaction Country */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Transaction Country *
          </label>

          <input
            type="text"
            value={geographyForm.transaction_country}
            onChange={(e) =>
              setGeographyForm({
                ...geographyForm,
                transaction_country: e.target.value,
              })
            }
            placeholder="India"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Beneficiary Country */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Beneficiary Country *
          </label>

          <input
            type="text"
            value={geographyForm.beneficiary_country}
            onChange={(e) =>
              setGeographyForm({
                ...geographyForm,
                beneficiary_country: e.target.value,
              })
            }
            placeholder="UAE"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Risk Characteristics */}
        <div className="md:col-span-2">

          <p className="mb-3 text-sm font-medium text-slate-700">
            Geographic Risk Characteristics
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

            {/* High Risk Jurisdiction */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={geographyForm.high_risk_jurisdiction_flag}
                onChange={(e) =>
                  setGeographyForm({
                    ...geographyForm,
                    high_risk_jurisdiction_flag: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700">
                High-Risk Jurisdiction Exposure
              </span>
            </label>

            {/* Sanctions */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={geographyForm.sanctions_exposure}
                onChange={(e) =>
                  setGeographyForm({
                    ...geographyForm,
                    sanctions_exposure: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700">
                Sanctions Exposure
              </span>
            </label>

          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">

        <button
          onClick={saveGeography}
          disabled={savingGeography}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingGeography
            ? "Saving..."
            : geographySaved
            ? "Update Geography"
            : "Save Geography"}
        </button>

      </div>

    </div>
  );
}

export default Geography;