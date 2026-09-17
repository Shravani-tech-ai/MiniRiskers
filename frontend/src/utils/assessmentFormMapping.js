export function mapInputsToFormState(inputs) {
  if (!inputs) {
    return null;
  }

  const product = inputs.product || {};
  const customer = inputs.customer || {};
  const geography = inputs.geography || {};
  const transaction = inputs.transaction || {};
  const channel = inputs.channel || {};
  const vendor = inputs.vendor || {};

  return {
    productForm: {
      product_name: product.product_name ?? "",
      product_category: product.product_category ?? "",
      product_description: product.product_description ?? "",
      digital_channel: product.digital_channel ?? true,
      branch_channel: product.branch_channel ?? false,
      agent_channel: product.agent_channel ?? false,
      cross_border: product.cross_border ?? true,
      cash_involved: product.cash_involved ?? false,
      transaction_type: product.transaction_type ?? "",
      transaction_limit:
        product.transaction_limit ?? "",
      expected_transaction_volume:
        product.expected_transaction_volume ?? "",
      expected_transaction_frequency:
        product.expected_transaction_frequency ?? "",
      currency: product.currency ?? "INR",
      countries_supported: product.countries_supported ?? "",
      new_product_flag: product.new_product_flag ?? true,
    },
    customerForm: {
      customer_type: customer.customer_type ?? "INDIVIDUAL",
      customer_segment: customer.customer_segment ?? "",
      individual_customer: customer.individual_customer ?? true,
      business_customer: customer.business_customer ?? false,
      foreign_customer: customer.foreign_customer ?? false,
      onboarding_method: customer.onboarding_method ?? "",
      kyc_required: customer.kyc_required ?? true,
      kyc_method: customer.kyc_method ?? "",
      beneficial_owner_required:
        customer.beneficial_owner_required ?? false,
      pep_exposure: customer.pep_exposure ?? false,
      high_risk_customer_exposure:
        customer.high_risk_customer_exposure ?? false,
      expected_customer_count:
        customer.expected_customer_count ?? "",
      customer_geographic_distribution:
        customer.customer_geographic_distribution ?? "",
    },
    geographyForm: {
      country: geography.country ?? "",
      country_code: geography.country_code ?? "",
      domestic_or_cross_border:
        geography.domestic_or_cross_border ?? "CROSS_BORDER",
      customer_country: geography.customer_country ?? "India",
      transaction_country: geography.transaction_country ?? "",
      beneficiary_country: geography.beneficiary_country ?? "",
      high_risk_jurisdiction_flag:
        geography.high_risk_jurisdiction_flag ?? false,
      sanctions_exposure: geography.sanctions_exposure ?? false,
    },
    transactionForm: {
      transaction_type: transaction.transaction_type ?? "",
      average_transaction_amount:
        transaction.average_transaction_amount ?? "",
      maximum_transaction_amount:
        transaction.maximum_transaction_amount ?? "",
      expected_daily_volume:
        transaction.expected_daily_volume ?? "",
      expected_monthly_volume:
        transaction.expected_monthly_volume ?? "",
      expected_frequency: transaction.expected_frequency ?? "",
      cash_involved: transaction.cash_involved ?? false,
      cross_border: transaction.cross_border ?? true,
      number_of_countries: transaction.number_of_countries ?? 4,
      transaction_velocity: transaction.transaction_velocity ?? 8,
      round_amount_risk: transaction.round_amount_risk ?? false,
      rapid_movement_possible:
        transaction.rapid_movement_possible ?? false,
    },
    channelForm: {
      channel_type: channel.channel_type ?? "DIGITAL",
      mobile_banking: channel.mobile_banking ?? true,
      internet_banking: channel.internet_banking ?? false,
      branch: channel.branch ?? false,
      agent: channel.agent ?? false,
      api: channel.api ?? false,
      third_party_channel: channel.third_party_channel ?? false,
      remote_onboarding: channel.remote_onboarding ?? true,
    },
    vendorForm: {
      vendor_name: vendor.vendor_name ?? "",
      vendor_type: vendor.vendor_type ?? "",
      country: vendor.country ?? "India",
      india_based: vendor.india_based ?? true,
      service_description: vendor.service_description ?? "",
      handles_customer_data: vendor.handles_customer_data ?? false,
      handles_transactions: vendor.handles_transactions ?? false,
      handles_payment_data: vendor.handles_payment_data ?? false,
      criticality: vendor.criticality ?? "MEDIUM",
      outsourcing_type: vendor.outsourcing_type ?? "",
      due_diligence_completed:
        vendor.due_diligence_completed ?? false,
      contract_completed: vendor.contract_completed ?? false,
      audit_rights: vendor.audit_rights ?? false,
      business_continuity_plan:
        vendor.business_continuity_plan ?? false,
      cross_border_processing:
        vendor.cross_border_processing ?? false,
    },
  };
}

export function mergeExtractedPreview(currentForms, mergedPreview) {
  const mapped = mapInputsToFormState(mergedPreview);
  if (!mapped) {
    return currentForms;
  }

  return mapped;
}
