export const EMPTY_ASSESSMENT_FORMS = {
  productForm: {
    product_name: "",
    product_category: "",
    product_description: "",
    digital_channel: false,
    branch_channel: false,
    agent_channel: false,
    cross_border: false,
    cash_involved: false,
    transaction_type: "",
    transaction_limit: "",
    expected_transaction_volume: "",
    expected_transaction_frequency: "",
    currency: "",
    countries_supported: "",
    new_product_flag: false,
  },
  customerForm: {
    customer_type: "",
    customer_segment: "",
    individual_customer: false,
    business_customer: false,
    foreign_customer: false,
    onboarding_method: "",
    kyc_required: false,
    kyc_method: "",
    beneficial_owner_required: false,
    pep_exposure: false,
    high_risk_customer_exposure: false,
    expected_customer_count: "",
    customer_geographic_distribution: "",
  },
  geographyForm: {
    country: "",
    country_code: "",
    domestic_or_cross_border: "",
    customer_country: "",
    transaction_country: "",
    beneficiary_country: "",
    high_risk_jurisdiction_flag: false,
    sanctions_exposure: false,
  },
  transactionForm: {
    transaction_type: "",
    average_transaction_amount: "",
    maximum_transaction_amount: "",
    expected_daily_volume: "",
    expected_monthly_volume: "",
    expected_frequency: "",
    cash_involved: false,
    cross_border: false,
    number_of_countries: "",
    transaction_velocity: "",
    round_amount_risk: false,
    rapid_movement_possible: false,
  },
  channelForm: {
    channel_type: "",
    mobile_banking: false,
    internet_banking: false,
    branch: false,
    agent: false,
    api: false,
    third_party_channel: false,
    remote_onboarding: false,
  },
  vendorForm: {
    vendor_name: "",
    vendor_type: "",
    country: "",
    india_based: false,
    service_description: "",
    handles_customer_data: false,
    handles_transactions: false,
    handles_payment_data: false,
    criticality: "",
    outsourcing_type: "",
    due_diligence_completed: false,
    contract_completed: false,
    audit_rights: false,
    business_continuity_plan: false,
    cross_border_processing: false,
  },
};

function normalizeNumericField(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return value;
}

function mapSection(sectionData, emptySection) {
  const mapped = { ...emptySection };

  if (!sectionData || typeof sectionData !== "object") {
    return mapped;
  }

  for (const key of Object.keys(emptySection)) {
    if (!(key in sectionData)) {
      continue;
    }

    const value = sectionData[key];
    if (value === null || value === undefined) {
      continue;
    }

    if (typeof emptySection[key] === "boolean") {
      mapped[key] = Boolean(value);
      continue;
    }

    if (typeof emptySection[key] === "number" || key.includes("limit") || key.includes("volume") || key.includes("amount") || key.includes("velocity") || key.includes("count")) {
      mapped[key] = normalizeNumericField(value);
      continue;
    }

    mapped[key] = value;
  }

  return mapped;
}

export function mapInputsToFormState(inputs) {
  if (!inputs) {
    return null;
  }

  return {
    productForm: mapSection(inputs.product, EMPTY_ASSESSMENT_FORMS.productForm),
    customerForm: mapSection(
      inputs.customer,
      EMPTY_ASSESSMENT_FORMS.customerForm
    ),
    geographyForm: mapSection(
      inputs.geography,
      EMPTY_ASSESSMENT_FORMS.geographyForm
    ),
    transactionForm: mapSection(
      inputs.transaction,
      EMPTY_ASSESSMENT_FORMS.transactionForm
    ),
    channelForm: mapSection(inputs.channel, EMPTY_ASSESSMENT_FORMS.channelForm),
    vendorForm: mapSection(inputs.vendor, EMPTY_ASSESSMENT_FORMS.vendorForm),
  };
}
export function mergeExtractedPreview(currentForms, mergedPreview) {
  const mapped = mapInputsToFormState(mergedPreview);
  if (!mapped) {
    return currentForms;
  }

  return mapped;
}

export function formsToAssessmentInputs({
  productForm,
  customerForm,
  geographyForm,
  transactionForm,
  channelForm,
  vendorForm,
}) {
  return {
    product: { ...productForm },
    customer: { ...customerForm },
    geography: { ...geographyForm },
    transaction: { ...transactionForm },
    channel: { ...channelForm },
    vendor: { ...vendorForm },
  };
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function getPersistedSectionFlags(inputs) {
  const product = inputs?.product || {};
  const customer = inputs?.customer || {};
  const geography = inputs?.geography || {};
  const transaction = inputs?.transaction || {};
  const channel = inputs?.channel || {};
  const vendor = inputs?.vendor || {};

  return {
    productSaved: hasText(product.product_name),
    customerSaved:
      hasText(customer.customer_type) && hasText(customer.onboarding_method),
    geographySaved: hasText(geography.country),
    transactionSaved: hasText(transaction.transaction_type),
    channelSaved: hasText(channel.channel_type),
    vendorSaved: hasText(vendor.vendor_name),
  };
}

export function formatMissingFieldLabels(missingFields) {
  if (!Array.isArray(missingFields)) {
    return "";
  }

  return missingFields
    .map((field) => {
      if (typeof field === "string") {
        return field;
      }
      if (field && typeof field === "object") {
        return field.label || field.key || field.field || "";
      }
      return "";
    })
    .filter(Boolean)
    .join(", ");
}
