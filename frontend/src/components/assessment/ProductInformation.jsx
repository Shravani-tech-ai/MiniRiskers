function ProductInformation({
  productForm,
  setProductForm,
  productSaved,
  savingProduct,
  saveProduct,
  readOnly = false,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-50 p-6">

        <div className="flex items-center justify-between">

          <div>
            <h3 className="font-semibold text-slate-900">
              Product Information
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Define the product characteristics and transaction
              capabilities.
            </p>
          </div>

          {productSaved && (
            <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
              ✓ Saved
            </span>
          )}

        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">

        {/* Product Name */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Product Name *
          </label>

          <input
            type="text"
            value={productForm.product_name}
            onChange={(e) =>
              setProductForm({
                ...productForm,
                product_name: e.target.value,
              })
            }
            placeholder="Digital International Remittance"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Product Category */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Product Category
          </label>

          <input
            type="text"
            value={productForm.product_category}
            onChange={(e) =>
              setProductForm({
                ...productForm,
                product_category: e.target.value,
              })
            }
            placeholder="Remittance / Payments / Lending"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Product Description */}
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">
            Product Description
          </label>

          <textarea
            value={productForm.product_description}
            onChange={(e) =>
              setProductForm({
                ...productForm,
                product_description: e.target.value,
              })
            }
            rows={3}
            placeholder="Describe the product, service and intended use."
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Transaction Type */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Transaction Type *
          </label>

          <input
            type="text"
            value={productForm.transaction_type}
            onChange={(e) =>
              setProductForm({
                ...productForm,
                transaction_type: e.target.value,
              })
            }
            placeholder="International Transfer"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Currency */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Currency
          </label>

          <input
            type="text"
            value={productForm.currency}
            onChange={(e) =>
              setProductForm({
                ...productForm,
                currency: e.target.value,
              })
            }
            placeholder="INR"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Transaction Limit */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Transaction Limit
          </label>

          <input
            type="number"
            value={productForm.transaction_limit}
            onChange={(e) =>
              setProductForm({
                ...productForm,
                transaction_limit: e.target.value,
              })
            }
            placeholder="100000"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Expected Transaction Volume */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Expected Transaction Volume
          </label>

          <input
            type="number"
            value={productForm.expected_transaction_volume}
            onChange={(e) =>
              setProductForm({
                ...productForm,
                expected_transaction_volume: e.target.value,
              })
            }
            placeholder="50000"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Expected Transaction Frequency */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Expected Transaction Frequency
          </label>

          <input
            type="text"
            value={productForm.expected_transaction_frequency}
            onChange={(e) =>
              setProductForm({
                ...productForm,
                expected_transaction_frequency: e.target.value,
              })
            }
            placeholder="Daily / Weekly / Monthly"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Supported Countries */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Supported Countries
          </label>

          <input
            type="text"
            value={productForm.countries_supported}
            onChange={(e) =>
              setProductForm({
                ...productForm,
                countries_supported: e.target.value,
              })
            }
            placeholder="India, UAE, UK, USA"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Product Characteristics */}
        <div className="md:col-span-2">

          <p className="mb-3 text-sm font-medium text-slate-700">
            Product Characteristics
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

            {/* Digital Channel */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={productForm.digital_channel}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    digital_channel: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700">
                Digital Channel
              </span>
            </label>

            {/* Branch Channel */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={productForm.branch_channel}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    branch_channel: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700">
                Branch Channel
              </span>
            </label>

            {/* Agent Channel */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={productForm.agent_channel}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    agent_channel: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700">
                Agent Channel
              </span>
            </label>

            {/* Cross Border */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={productForm.cross_border}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    cross_border: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700">
                Cross Border
              </span>
            </label>

            {/* Cash Involved */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={productForm.cash_involved}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    cash_involved: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700">
                Cash Involved
              </span>
            </label>

          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">

        <button
          onClick={saveProduct}
          disabled={readOnly || savingProduct}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingProduct
            ? "Saving..."
            : productSaved
            ? "Update Product"
            : "Save Product"}
        </button>

      </div>

    </div>
  );
}

export default ProductInformation;