import { ArrowLeft, Loader2 } from "lucide-react";

function formatValue(value) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (value === "" || value === null || value === undefined) {
    return "—";
  }
  return String(value);
}

function Field({ label, value }) {
  return (
    <div className="border-b border-slate-100 dark:border-slate-800 py-2.5 last:border-b-0">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-slate-900 dark:text-slate-100">{formatValue(value)}</p>
    </div>
  );
}

function Section({ title, description, fields }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-5 py-3">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-x-6 px-5 sm:grid-cols-2">
        {fields.map((field) => (
          <Field key={field.label} label={field.label} value={field.value} />
        ))}
      </div>
    </div>
  );
}

function AssessmentPreview({
  productForm,
  customerForm,
  geographyForm,
  transactionForm,
  channelForm,
  vendorForm,
  onSubmit,
  submitting,
  canSubmit,
  alreadySubmitted,
  hideActions = false,
  onPrevious,
  previousLabel = "Vendor",
  disabledReason = "",
}) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
      <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Review &amp; Submit</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Read-only summary of everything captured across all sections. Scroll
          to review, then submit for Risk Analyst review.
        </p>
      </div>

      <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
        <Section
          title="Product Information"
          fields={[
            { label: "Product Name", value: productForm.product_name },
            { label: "Product Category", value: productForm.product_category },
            {
              label: "Product Description",
              value: productForm.product_description,
            },
            { label: "Transaction Type", value: productForm.transaction_type },
            { label: "Currency", value: productForm.currency },
            {
              label: "Transaction Limit",
              value: productForm.transaction_limit,
            },
            {
              label: "Expected Transaction Volume",
              value: productForm.expected_transaction_volume,
            },
            {
              label: "Expected Transaction Frequency",
              value: productForm.expected_transaction_frequency,
            },
            {
              label: "Supported Countries",
              value: productForm.countries_supported,
            },
            { label: "Digital Channel", value: productForm.digital_channel },
            { label: "Branch Channel", value: productForm.branch_channel },
            { label: "Agent Channel", value: productForm.agent_channel },
            { label: "Cross Border", value: productForm.cross_border },
            { label: "Cash Involved", value: productForm.cash_involved },
          ]}
        />

        <Section
          title="Customer Profile"
          fields={[
            { label: "Customer Type", value: customerForm.customer_type },
            {
              label: "Customer Segment",
              value: customerForm.customer_segment,
            },
            {
              label: "Onboarding Method",
              value: customerForm.onboarding_method,
            },
            { label: "KYC Method", value: customerForm.kyc_method },
            {
              label: "Expected Customer Count",
              value: customerForm.expected_customer_count,
            },
            {
              label: "Customer Geographic Distribution",
              value: customerForm.customer_geographic_distribution,
            },
            {
              label: "Individual Customers",
              value: customerForm.individual_customer,
            },
            {
              label: "Business Customers",
              value: customerForm.business_customer,
            },
            {
              label: "Foreign Customer Exposure",
              value: customerForm.foreign_customer,
            },
            { label: "KYC Required", value: customerForm.kyc_required },
            {
              label: "Beneficial Owner Required",
              value: customerForm.beneficial_owner_required,
            },
            { label: "PEP Exposure", value: customerForm.pep_exposure },
            {
              label: "High-Risk Customer Exposure",
              value: customerForm.high_risk_customer_exposure,
            },
          ]}
        />

        <Section
          title="Geography"
          fields={[
            { label: "Country", value: geographyForm.country },
            { label: "Country Code", value: geographyForm.country_code },
            {
              label: "Geographic Exposure",
              value: geographyForm.domestic_or_cross_border,
            },
            {
              label: "Customer Country",
              value: geographyForm.customer_country,
            },
            {
              label: "Transaction Country",
              value: geographyForm.transaction_country,
            },
            {
              label: "Beneficiary Country",
              value: geographyForm.beneficiary_country,
            },
            {
              label: "High-Risk Jurisdiction Exposure",
              value: geographyForm.high_risk_jurisdiction_flag,
            },
            {
              label: "Sanctions Exposure",
              value: geographyForm.sanctions_exposure,
            },
          ]}
        />

        <Section
          title="Transaction Profile"
          fields={[
            {
              label: "Transaction Type",
              value: transactionForm.transaction_type,
            },
            {
              label: "Expected Frequency",
              value: transactionForm.expected_frequency,
            },
            {
              label: "Average Transaction Amount",
              value: transactionForm.average_transaction_amount,
            },
            {
              label: "Maximum Transaction Amount",
              value: transactionForm.maximum_transaction_amount,
            },
            {
              label: "Expected Daily Volume",
              value: transactionForm.expected_daily_volume,
            },
            {
              label: "Expected Monthly Volume",
              value: transactionForm.expected_monthly_volume,
            },
            {
              label: "Number of Countries",
              value: transactionForm.number_of_countries,
            },
            {
              label: "Transaction Velocity",
              value: transactionForm.transaction_velocity,
            },
            { label: "Cash Involved", value: transactionForm.cash_involved },
            {
              label: "Cross-Border Transactions",
              value: transactionForm.cross_border,
            },
            {
              label: "Round Amount Pattern",
              value: transactionForm.round_amount_risk,
            },
            {
              label: "Rapid Movement Possible",
              value: transactionForm.rapid_movement_possible,
            },
          ]}
        />

        <Section
          title="Channel Information"
          fields={[
            { label: "Channel Type", value: channelForm.channel_type },
            { label: "Mobile Banking", value: channelForm.mobile_banking },
            { label: "Internet Banking", value: channelForm.internet_banking },
            { label: "Branch", value: channelForm.branch },
            { label: "Agent", value: channelForm.agent },
            { label: "API", value: channelForm.api },
            {
              label: "Third-Party Channel",
              value: channelForm.third_party_channel,
            },
            {
              label: "Remote Onboarding",
              value: channelForm.remote_onboarding,
            },
          ]}
        />

        <Section
          title="Vendor / Third-Party Information"
          fields={[
            { label: "Vendor Name", value: vendorForm.vendor_name },
            { label: "Vendor Type", value: vendorForm.vendor_type },
            { label: "Vendor Country", value: vendorForm.country },
            { label: "Criticality", value: vendorForm.criticality },
            { label: "Outsourcing Type", value: vendorForm.outsourcing_type },
            {
              label: "Service Description",
              value: vendorForm.service_description,
            },
            {
              label: "Handles Customer Data",
              value: vendorForm.handles_customer_data,
            },
            {
              label: "Handles Transactions",
              value: vendorForm.handles_transactions,
            },
            {
              label: "Handles Payment Data",
              value: vendorForm.handles_payment_data,
            },
            {
              label: "Cross-Border Processing",
              value: vendorForm.cross_border_processing,
            },
            {
              label: "Due Diligence Completed",
              value: vendorForm.due_diligence_completed,
            },
            {
              label: "Contract Completed",
              value: vendorForm.contract_completed,
            },
            { label: "Audit Rights", value: vendorForm.audit_rights },
            {
              label: "Business Continuity Plan",
              value: vendorForm.business_continuity_plan,
            },
          ]}
        />
      </div>

      {(!hideActions || onPrevious) && (
        <div className="flex flex-col gap-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {onPrevious && (
              <button
                type="button"
                onClick={onPrevious}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ArrowLeft size={16} />
                Previous: {previousLabel}
              </button>
            )}
          </div>

          {!hideActions && (
            <div className="flex flex-col gap-2 sm:items-end">
              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit || submitting || alreadySubmitted}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {alreadySubmitted
                  ? "Submitted"
                  : submitting
                  ? "Submitting..."
                  : "Submit for Risk Analyst review"}
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-right">
                {alreadySubmitted
                  ? "This request has already been submitted for Risk Analyst review."
                  : disabledReason ||
                    "Submitting hands this request off to the Risk Analyst queue. You won't be able to submit it again."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AssessmentPreview;
