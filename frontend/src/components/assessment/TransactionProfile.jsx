function TransactionProfile({
  transactionForm,
  setTransactionForm,
  transactionSaved,
  savingTransaction,
  saveTransactionProfile,
  readOnly = false,
}) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">

      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-50 p-6">

        <div className="flex items-center justify-between">

          <div>
            <h3 className="font-semibold text-slate-900">
              Transaction Profile
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Define transaction volumes, amounts, frequency and
              transaction behaviour.
            </p>
          </div>

          {transactionSaved && (
            <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
              ✓ Saved
            </span>
          )}

        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">

        {/* Transaction Type */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Transaction Type *
          </label>

          <input
            type="text"
            value={transactionForm.transaction_type}
            onChange={(e) =>
              setTransactionForm({
                ...transactionForm,
                transaction_type: e.target.value,
              })
            }
            placeholder="International Transfer"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Expected Frequency */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Expected Frequency
          </label>

          <input
            type="text"
            value={transactionForm.expected_frequency}
            onChange={(e) =>
              setTransactionForm({
                ...transactionForm,
                expected_frequency: e.target.value,
              })
            }
            placeholder="Daily / Weekly / Monthly"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Average Transaction Amount */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Average Transaction Amount
          </label>

          <input
            type="number"
            value={transactionForm.average_transaction_amount}
            onChange={(e) =>
              setTransactionForm({
                ...transactionForm,
                average_transaction_amount: e.target.value,
              })
            }
            placeholder="25000"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Maximum Transaction Amount */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Maximum Transaction Amount
          </label>

          <input
            type="number"
            value={transactionForm.maximum_transaction_amount}
            onChange={(e) =>
              setTransactionForm({
                ...transactionForm,
                maximum_transaction_amount: e.target.value,
              })
            }
            placeholder="100000"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Daily Volume */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Expected Daily Volume
          </label>

          <input
            type="number"
            value={transactionForm.expected_daily_volume}
            onChange={(e) =>
              setTransactionForm({
                ...transactionForm,
                expected_daily_volume: e.target.value,
              })
            }
            placeholder="50000"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Monthly Volume */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Expected Monthly Volume
          </label>

          <input
            type="number"
            value={transactionForm.expected_monthly_volume}
            onChange={(e) =>
              setTransactionForm({
                ...transactionForm,
                expected_monthly_volume: e.target.value,
              })
            }
            placeholder="1500000"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Number of Countries */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Number of Countries
          </label>

          <input
            type="number"
            value={transactionForm.number_of_countries}
            onChange={(e) =>
              setTransactionForm({
                ...transactionForm,
                number_of_countries: e.target.value,
              })
            }
            placeholder="4"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Transaction Velocity */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Transaction Velocity
          </label>

          <input
            type="number"
            value={transactionForm.transaction_velocity}
            onChange={(e) =>
              setTransactionForm({
                ...transactionForm,
                transaction_velocity: e.target.value,
              })
            }
            placeholder="8"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Transaction Characteristics */}
        <div className="md:col-span-2">

          <p className="mb-3 text-sm font-medium text-slate-700">
            Transaction Characteristics
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

            {/* Cash */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={transactionForm.cash_involved}
                onChange={(e) =>
                  setTransactionForm({
                    ...transactionForm,
                    cash_involved: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700">
                Cash Involved
              </span>
            </label>

            {/* Cross Border */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={transactionForm.cross_border}
                onChange={(e) =>
                  setTransactionForm({
                    ...transactionForm,
                    cross_border: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700">
                Cross-Border Transactions
              </span>
            </label>

            {/* Round Amount */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={transactionForm.round_amount_risk}
                onChange={(e) =>
                  setTransactionForm({
                    ...transactionForm,
                    round_amount_risk: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700">
                Round Amount Pattern
              </span>
            </label>

            {/* Rapid Movement */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={transactionForm.rapid_movement_possible}
                onChange={(e) =>
                  setTransactionForm({
                    ...transactionForm,
                    rapid_movement_possible: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700">
                Rapid Movement Possible
              </span>
            </label>

          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">

        <button
          onClick={saveTransactionProfile}
          disabled={readOnly || savingTransaction}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingTransaction
            ? "Saving..."
            : transactionSaved
            ? "Update Transaction Profile"
            : "Save Transaction Profile"}
        </button>

      </div>

    </div>
  );
}

export default TransactionProfile;