import { useEffect, useState } from "react";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AssessmentHeader from "../components/assessment/AssessmentHeader";
import ProductInformation from "../components/assessment/ProductInformation";
import CustomerProfile from "../components/assessment/CustomerProfile";
import Geography from "../components/assessment/Geography";
import TransactionProfile from "../components/assessment/TransactionProfile";
import ChannelInformation from "../components/assessment/ChannelInformation";
import VendorInformation from "../components/assessment/VendorInformation";
import RiskOverview from "../components/assessment/RiskOverview";
import ControlsSection from "../components/assessment/ControlsSection";
import AIAssessment from "../components/assessment/AIAssessment";
import AnalystReview, {
  DeferralNotice,
} from "../components/assessment/AnalystReview";
import AuditTrail from "../components/assessment/AuditTrail";
import ConditionsTracker from "../components/assessment/ConditionsTracker";
import DecisionOutcome from "../components/assessment/DecisionOutcome";
import CommitteeDecision from "../components/assessment/CommitteeDecision";
import IntakePanel from "../components/assessment/IntakePanel";
import RegulatoryEvidence from "../components/assessment/RegulatoryEvidence";
import SimilarCasesPanel from "../components/assessment/SimilarCasesPanel";
import RiskMethodologyModal from "../components/assessment/RiskMethodologyModal";
import AnalystOutcome, {
  AwaitingAnalystReview,
} from "../components/assessment/AnalystOutcome";
import RequestInputTabs, {
  INPUT_TABS,
} from "../components/assessment/RequestInputTabs";
import AssessmentPreview from "../components/assessment/AssessmentPreview";
import ConfirmDialog from "../components/assessment/ConfirmDialog";
import ResultDialog from "../components/assessment/ResultDialog";
import AssessmentStageFooter from "../components/assessment/AssessmentStageFooter";
import SubmissionBanner from "../components/assessment/SubmissionBanner";
import {
  WORKFLOW_STAGES,
  canNavigateToWorkflowStage,
  normalizeWorkflowStage,
} from "../components/assessment/workflowStages";
import {
  EMPTY_ASSESSMENT_FORMS,
  formatMissingFieldLabels,
  getPersistedSectionFlags,
  mapInputsToFormState,
  formsToAssessmentInputs,
  getMissingSectionFields,
} from "../utils/assessmentFormMapping";
import PageContainer from "../components/layout/PageContainer";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  ROLES,
  canExportAuditPack,
  getDefaultView,
  getLockedStages,
  getRequestPermissions,
} from "../utils/rolePermissions";
import { isResidualPending } from "../utils/riskDisplay";

const STAGE_VIEW_LABELS = {
  REQUEST_CREATED: "Request details",
  RISK_ASSESSMENT: "Risk assessment",
  ANALYST_REVIEW: "Analyst review",
  COMMITTEE_REVIEW: "Committee review",
  COMPLETED: "Outcome",
};

function Assessment() {
  const { changeRequestId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [changeRequest, setChangeRequest] = useState(null);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [controls, setControls] = useState([]);
  const [regulatoryEvidence, setRegulatoryEvidence] = useState([]);
  const [riskFactors, setRiskFactors] = useState([]);
  const [showMethodology, setShowMethodology] = useState(false);
  const [analystReviewRecord, setAnalystReviewRecord] = useState(null);
  const [aiAssessment, setAiAssessment] = useState(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [runningRiskAssessment, setRunningRiskAssessment] = useState(false);
  const [analystRating, setAnalystRating] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [consequences, setConsequences] = useState("");
  const [analystReviewed, setAnalystReviewed] = useState(false);
  const [committeeDecision, setCommitteeDecision] = useState("");
  const [committeeReason, setCommitteeReason] = useState("");
  const [committeeConditions, setCommitteeConditions] = useState([
    { description: "", due_date: "" },
  ]);
  const [deferTarget, setDeferTarget] = useState("");
  const [overrideAcknowledgement, setOverrideAcknowledgement] = useState("");
  const [committeeSubmitted, setCommitteeSubmitted] = useState(false);
  const [committeeRecord, setCommitteeRecord] = useState(null);
  const [committeeHistory, setCommitteeHistory] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [productSaved, setProductSaved] = useState(false);
  const [customerSaved, setCustomerSaved] = useState(false);

  const [savingProduct, setSavingProduct] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [productForm, setProductForm] = useState({
    ...EMPTY_ASSESSMENT_FORMS.productForm,
  });

  const [customerForm, setCustomerForm] = useState({
    ...EMPTY_ASSESSMENT_FORMS.customerForm,
  });

  const [geographySaved, setGeographySaved] = useState(false);
  const [transactionSaved, setTransactionSaved] = useState(false);

  const [savingGeography, setSavingGeography] = useState(false);
  const [savingTransaction, setSavingTransaction] = useState(false);

  const [geographyForm, setGeographyForm] = useState({
    ...EMPTY_ASSESSMENT_FORMS.geographyForm,
  });

  const [transactionForm, setTransactionForm] = useState({
    ...EMPTY_ASSESSMENT_FORMS.transactionForm,
  });

  const [channelSaved, setChannelSaved] = useState(false);
  const [vendorSaved, setVendorSaved] = useState(false);

  const [savingChannel, setSavingChannel] = useState(false);
  const [savingVendor, setSavingVendor] = useState(false);

  const [channelForm, setChannelForm] = useState({
    ...EMPTY_ASSESSMENT_FORMS.channelForm,
  });

  const [vendorForm, setVendorForm] = useState({
    ...EMPTY_ASSESSMENT_FORMS.vendorForm,
  });

  const [intakeMode, setIntakeMode] = useState("brd");
  const [completenessPercent, setCompletenessPercent] = useState(0);
  const [missingFields, setMissingFields] = useState([]);
  const [activeView, setActiveView] = useState("REQUEST_CREATED");
  const [inputTab, setInputTab] = useState("product");
  const [editingSection, setEditingSection] = useState(null);
  const [sectionError, setSectionError] = useState("");
  const [advancingStage, setAdvancingStage] = useState(false);

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submittingForAnalyst, setSubmittingForAnalyst] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const permissions = getRequestPermissions(user?.role, changeRequest);
  const isBusinessOwner = user?.role === ROLES.BUSINESS_OWNER;
  const lockedStages = getLockedStages(user?.role);

  const applyFormValues = (mapped) => {
    if (!mapped) {
      return;
    }

    setProductForm(mapped.productForm);
    setCustomerForm(mapped.customerForm);
    setGeographyForm(mapped.geographyForm);
    setTransactionForm(mapped.transactionForm);
    setChannelForm(mapped.channelForm);
    setVendorForm(mapped.vendorForm);
  };

  const applyMappedForms = (mapped, inputs) => {
    if (!mapped) {
      return;
    }

    applyFormValues(mapped);

    const persisted = getPersistedSectionFlags(inputs);
    setProductSaved(persisted.productSaved);
    setCustomerSaved(persisted.customerSaved);
    setGeographySaved(persisted.geographySaved);
    setTransactionSaved(persisted.transactionSaved);
    setChannelSaved(persisted.channelSaved);
    setVendorSaved(persisted.vendorSaved);
  };

  const refreshCompleteness = async () => {
    try {
      const response = await api.get(
        `/change-requests/${changeRequestId}/intake/completeness`
      );
      setCompletenessPercent(response.data.completeness_percent ?? 0);
      setMissingFields(response.data.missing_fields ?? []);
    } catch {
      setCompletenessPercent(0);
      setMissingFields([]);
    }
  };

  const hydrateAssessmentInputs = async () => {
    try {
      const response = await api.get(
        `/change-requests/${changeRequestId}/assessment-inputs`
      );
      const mapped = mapInputsToFormState(response.data.inputs);
      if (mapped) {
        applyMappedForms(mapped, response.data.inputs);
      }
      setCompletenessPercent(response.data.completeness_percent ?? 0);
      setMissingFields(response.data.missing_fields ?? []);
    } catch (inputsError) {
      console.log("No assessment inputs yet.", inputsError);
      await refreshCompleteness();
    }
  };

  const handleExtractionApplied = (mergedPreview) => {
    const mapped = mapInputsToFormState(mergedPreview);
    applyFormValues(mapped);
  };

  useEffect(() => {
    loadAssessment();
  }, [changeRequestId]);

  useEffect(() => {
    if (location.state?.activeView) {
      setActiveView(location.state.activeView);
    }
  }, [location.state?.activeView]);

  useEffect(() => {
    sessionStorage.setItem("lastChangeRequestId", changeRequestId);
  }, [changeRequestId]);

  const loadAssessment = async () => {
    try {
      setLoading(true);
      setError("");
      setProductSaved(false);
      setCustomerSaved(false);
      setGeographySaved(false);
      setTransactionSaved(false);
      setChannelSaved(false);
      setVendorSaved(false);
      setProductForm({ ...EMPTY_ASSESSMENT_FORMS.productForm });
      setCustomerForm({ ...EMPTY_ASSESSMENT_FORMS.customerForm });
      setGeographyForm({ ...EMPTY_ASSESSMENT_FORMS.geographyForm });
      setTransactionForm({ ...EMPTY_ASSESSMENT_FORMS.transactionForm });
      setChannelForm({ ...EMPTY_ASSESSMENT_FORMS.channelForm });
      setVendorForm({ ...EMPTY_ASSESSMENT_FORMS.vendorForm });

      // 1. Change Request
      const changeRequestResponse = await api.get(
        `/change-requests/${changeRequestId}`
      );

      setChangeRequest(changeRequestResponse.data);
      const stage = normalizeWorkflowStage(
        changeRequestResponse.data.current_stage
      );
      setActiveView(getDefaultView(user?.role, stage));

      await hydrateAssessmentInputs();

      // 2. Risk Assessment
      try {
        const riskAssessmentResponse = await api.get(
          `/change-requests/${changeRequestId}/risk-assessment`
        );

        setRiskAssessment(riskAssessmentResponse.data);
      } catch (riskError) {
        console.log("No risk assessment available yet.");
        setRiskAssessment(null);
      }

      // 3. Regulatory Evidence
      try {
        const evidenceResponse = await api.get(
          `/change-requests/${changeRequestId}/regulatory-evidence`
        );

        setRegulatoryEvidence(
          evidenceResponse.data.evidence || []
        );
      } catch (evidenceError) {
        console.log("No regulatory evidence available yet.");
        setRegulatoryEvidence([]);
      }

      try {
        const factorsResponse = await api.get(
          `/change-requests/${changeRequestId}/risk-factors`
        );
        setRiskFactors(factorsResponse.data.risk_factors || []);
      } catch {
        setRiskFactors([]);
      }

      try {
        const controlsResponse = await api.get(
          `/change-requests/${changeRequestId}/controls`
        );
        setControls(controlsResponse.data.controls || []);
      } catch {
        setControls([]);
      }

      try {
        const aiResponse = await api.get(
          `/change-requests/${changeRequestId}/ai-assessment`
        );
        setAiAssessment(aiResponse.data);
      } catch {
        setAiAssessment(null);
      }

      // 4. Analyst Review
      try {
        const analystReviewResponse = await api.get(
          `/change-requests/${changeRequestId}/analyst-review`
        );

        if (analystReviewResponse.data.reviewed) {
          const review = analystReviewResponse.data.review;

          setAnalystReviewed(true);
          setAnalystReviewRecord(review);

          setAnalystRating(review.analyst_rating || "");
          setOverrideReason(review.override_reason || "");
          setConsequences(review.consequences || "");
        } else {
          // Nothing recorded for the current revision (new request, or the
          // committee deferred it back for another review).
          setAnalystReviewed(false);
          setAnalystReviewRecord(null);
          setAnalystRating("");
          setOverrideReason("");
          setConsequences("");
        }
      } catch (error) {
        console.error(
          "Failed to load analyst review:",
          error
        );
      }

      // 5. Committee Decision
      try {
        const committeeResponse = await api.get(
          `/change-requests/${changeRequestId}/committee-decision`
        );

        setCommitteeHistory(committeeResponse.data.history || []);

        if (committeeResponse.data.decided) {
          const decision = committeeResponse.data.decision;

          setCommitteeSubmitted(true);
          setCommitteeRecord(decision);
          setCommitteeDecision(decision.decision || "");
          setCommitteeReason(decision.rationale || "");
          setDeferTarget(decision.deferred_to || "");
          setCommitteeConditions(
            decision.condition_items?.length
              ? decision.condition_items.map((item) => ({
                  description: item.description,
                  due_date: (item.due_date || "").slice(0, 10),
                }))
              : [{ description: "", due_date: "" }]
          );
        } else {
          setCommitteeSubmitted(false);
          setCommitteeRecord(null);
          setCommitteeDecision("");
          setCommitteeReason("");
          setDeferTarget("");
          setOverrideAcknowledgement("");
          setCommitteeConditions([{ description: "", due_date: "" }]);
        }
      } catch (error) {
        console.error(
          "Failed to load committee decision:",
          error
        );
      }

      // 6. Audit Trail
      try {
        const auditResponse = await api.get(
          `/change-requests/${changeRequestId}/audit-events`
        );

        // If backend returns an array
        if (Array.isArray(auditResponse.data)) {
          setAuditEvents(auditResponse.data);
        }
        // If backend returns { events: [...] }
        else {
          setAuditEvents(
            auditResponse.data.events || []
          );
        }
      } catch (error) {
        console.error(
          "Failed to load audit events:",
          error
        );

        // Audit failure should NOT stop the Assessment page
        setAuditEvents([]);
      }

    } catch (error) {
      console.error(
        "Failed to load change request:",
        error
      );

      setError(
        error.response?.data?.detail ||
        "Unable to load the change request."
      );
    } finally {
      setLoading(false);
    }
  };

  const validateSection = (section, form) => {
    const missing = getMissingSectionFields(section, form);

    if (missing.length > 0) {
      setSectionError(
        `Please fill in the required fields: ${missing
          .map((item) => item.label)
          .join(", ")}.`
      );
      return false;
    }

    return true;
  };

  const handleSectionSaved = async () => {
    setEditingSection(null);
    setSectionError("");
    await refreshCompleteness();
  };

  const saveProduct = async () => {
    if (!validateSection("product", productForm)) {
      return;
    }

    try {
      setSavingProduct(true);
      setSectionError("");

      const payload = {
        product_name: productForm.product_name,
        product_category: productForm.product_category,
        product_description: productForm.product_description,

        digital_channel: productForm.digital_channel,
        branch_channel: productForm.branch_channel,
        agent_channel: productForm.agent_channel,

        cross_border: productForm.cross_border,
        cash_involved: productForm.cash_involved,

        transaction_type: productForm.transaction_type,

        transaction_limit:
          productForm.transaction_limit === ""
            ? null
            : Number(productForm.transaction_limit),

        expected_transaction_volume:
          productForm.expected_transaction_volume === ""
            ? null
            : Number(productForm.expected_transaction_volume),

        expected_transaction_frequency:
          productForm.expected_transaction_frequency,

        currency: productForm.currency,

        countries_supported:
          productForm.countries_supported,

        new_product_flag: productForm.new_product_flag,
      };

      await api.post(
        `/change-requests/${changeRequestId}/product`,
        null,
        {
          params: payload,
        }
      );

      setProductSaved(true);
      await handleSectionSaved();

    } catch (error) {
      console.error("Failed to save product:", error);

      setSectionError(
        error.response?.data?.detail ||
        "Unable to save product information."
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const saveCustomerProfile = async () => {
    if (!validateSection("customer", customerForm)) {
      return;
    }

    try {
      setSavingCustomer(true);
      setSectionError("");

      const payload = {
        customer_type: customerForm.customer_type,
        customer_segment: customerForm.customer_segment,

        individual_customer:
          customerForm.individual_customer,

        business_customer:
          customerForm.business_customer,

        foreign_customer:
          customerForm.foreign_customer,

        onboarding_method:
          customerForm.onboarding_method,

        kyc_required:
          customerForm.kyc_required,

        kyc_method:
          customerForm.kyc_method,

        beneficial_owner_required:
          customerForm.beneficial_owner_required,

        pep_exposure:
          customerForm.pep_exposure,

        high_risk_customer_exposure:
          customerForm.high_risk_customer_exposure,

        expected_customer_count:
          customerForm.expected_customer_count === ""
            ? null
            : Number(customerForm.expected_customer_count),

        customer_geographic_distribution:
          customerForm.customer_geographic_distribution,
      };

      await api.post(
        `/change-requests/${changeRequestId}/customer-profile`,
        null,
        {
          params: payload,
        }
      );

      setCustomerSaved(true);
      await handleSectionSaved();

    } catch (error) {
      console.error(
        "Failed to save customer profile:",
        error
      );

      setSectionError(
        error.response?.data?.detail ||
        "Unable to save customer profile."
      );
    } finally {
      setSavingCustomer(false);
    }
  };

  const saveChannel = async () => {
    if (!validateSection("channel", channelForm)) {
      return;
    }

    try {
      setSavingChannel(true);
      setSectionError("");

      await api.post(
        `/change-requests/${changeRequestId}/channel`,
        null,
        {
          params: channelForm,
        }
      );

      setChannelSaved(true);
      await handleSectionSaved();

    } catch (error) {
      console.error("Failed to save channel:", error);

      setSectionError(
        error.response?.data?.detail ||
        "Unable to save channel information."
      );
    } finally {
      setSavingChannel(false);
    }
  };


  const saveVendor = async () => {
    if (!validateSection("vendor", vendorForm)) {
      return;
    }

    try {
      setSavingVendor(true);
      setSectionError("");

      await api.post(
        `/change-requests/${changeRequestId}/vendor`,
        null,
        {
          params: vendorForm,
        }
      );

      setVendorSaved(true);
      await handleSectionSaved();

    } catch (error) {
      console.error("Failed to save vendor:", error);

      setSectionError(
        error.response?.data?.detail ||
        "Unable to save vendor information."
      );
    } finally {
      setSavingVendor(false);
    }
  };

  const saveGeography = async () => {
    if (!validateSection("geography", geographyForm)) {
      return;
    }

    try {
      setSavingGeography(true);
      setSectionError("");

      const payload = {
        country: geographyForm.country,
        country_code: geographyForm.country_code,

        domestic_or_cross_border:
          geographyForm.domestic_or_cross_border,

        customer_country:
          geographyForm.customer_country,

        transaction_country:
          geographyForm.transaction_country,

        beneficiary_country:
          geographyForm.beneficiary_country,

        high_risk_jurisdiction_flag:
          geographyForm.high_risk_jurisdiction_flag,

        sanctions_exposure:
          geographyForm.sanctions_exposure,
      };

      await api.post(
        `/change-requests/${changeRequestId}/geography`,
        null,
        {
          params: payload,
        }
      );

      setGeographySaved(true);
      await handleSectionSaved();

    } catch (error) {
      console.error(
        "Failed to save geography:",
        error
      );

      setSectionError(
        error.response?.data?.detail ||
        "Unable to save geography information."
      );
    } finally {
      setSavingGeography(false);
    }
  };

    const saveTransactionProfile = async () => {
    if (!validateSection("transaction", transactionForm)) {
      return;
    }

    try {
      setSavingTransaction(true);
      setSectionError("");

      const payload = {
        transaction_type:
          transactionForm.transaction_type,

        average_transaction_amount:
          transactionForm.average_transaction_amount === ""
            ? null
            : Number(
                transactionForm.average_transaction_amount
              ),

        maximum_transaction_amount:
          transactionForm.maximum_transaction_amount === ""
            ? null
            : Number(
                transactionForm.maximum_transaction_amount
              ),

        expected_daily_volume:
          transactionForm.expected_daily_volume === ""
            ? null
            : Number(
                transactionForm.expected_daily_volume
              ),

        expected_monthly_volume:
          transactionForm.expected_monthly_volume === ""
            ? null
            : Number(
                transactionForm.expected_monthly_volume
              ),

        expected_frequency:
          transactionForm.expected_frequency,

        cash_involved:
          transactionForm.cash_involved,

        cross_border:
          transactionForm.cross_border,

        number_of_countries:
          transactionForm.number_of_countries === ""
            ? null
            : Number(
                transactionForm.number_of_countries
              ),

        transaction_velocity:
          transactionForm.transaction_velocity === ""
            ? null
            : Number(
                transactionForm.transaction_velocity
              ),

        round_amount_risk:
          transactionForm.round_amount_risk,

        rapid_movement_possible:
          transactionForm.rapid_movement_possible,
      };

      await api.post(
        `/change-requests/${changeRequestId}/transaction-profile`,
        null,
        {
          params: payload,
        }
      );

      setTransactionSaved(true);
      await handleSectionSaved();

    } catch (error) {
      console.error(
        "Failed to save transaction profile:",
        error
      );

      setSectionError(
        error.response?.data?.detail ||
        "Unable to save transaction profile."
      );
    } finally {
      setSavingTransaction(false);
    }
  };

  const runRiskAssessment = async () => {
    try {
      setRunningRiskAssessment(true);
      setError("");

      const syncResponse = await api.post(
        `/change-requests/${changeRequestId}/assessment-inputs/sync`,
        {
          inputs: formsToAssessmentInputs({
            productForm,
            customerForm,
            geographyForm,
            transactionForm,
            channelForm,
            vendorForm,
          }),
        }
      );
      setCompletenessPercent(syncResponse.data.completeness_percent ?? 0);
      setMissingFields(syncResponse.data.missing_fields ?? []);
      if ((syncResponse.data.missing_fields || []).length > 0) {
        setError(
          `Complete required intake fields before risk calculation (${syncResponse.data.missing_fields.length} missing).`
        );
        setRunningRiskAssessment(false);
        return false;
      }

      // Step 1: Generate risk factors from intake data
      await api.post(
        `/change-requests/${changeRequestId}/generate-risk-factors`
      );

      // Step 2: Calculate inherent risk (residual stays pending until controls)
      await api.post(
        `/change-requests/${changeRequestId}/calculate-risk`
      );

      // Step 3: Generate regulatory evidence
      await api.post(
        `/change-requests/${changeRequestId}/generate-regulatory-evidence`
      );

      // Step 4: Reload risk assessment + evidence
      await loadAssessment();
      return true;

    } catch (error) {
      console.error(
        "Failed to run risk assessment:",
        error
      );

      setError(
        error.response?.data?.detail ||
        "Unable to complete the risk assessment."
      );
      return false;
    } finally {
      setRunningRiskAssessment(false);
    }
  };

  const generateAIAssessment = async () => {
    try {
      setGeneratingAI(true);
      setError("");

      const response = await api.post(
        `/change-requests/${changeRequestId}/generate-ai-assessment`
      );

      setAiAssessment(response.data);
      return true;

    } catch (error) {
      console.error("Failed to generate AI assessment:", error);

      setError(
        error.response?.data?.detail ||
        "Unable to generate AI assessment."
      );
      return false;
    } finally {
      setGeneratingAI(false);
    }
  };

  const submitAnalystReview = async () => {
    if (!analystRating) {
      setError("Please select an analyst rating.");
      return;
    }

    if (
      analystRating !== riskAssessment?.residual_rating &&
      !overrideReason.trim()
    ) {
      setError(
        "Please provide a reason when overriding the system rating."
      );
      return;
    }

    try {
      setError("");

      await api.post(
        `/change-requests/${changeRequestId}/analyst-review`,
        null,
        {
          params: {
            analyst_rating: analystRating,
            override_reason: overrideReason,
            consequences: consequences,
          },
        }
      );

      setAnalystReviewed(true);
      await loadAssessment();
      setActiveView("COMMITTEE_REVIEW");

    } catch (error) {
      console.error("Failed to submit analyst review:", error);

      setError(
        error.response?.data?.detail ||
        "Unable to submit analyst review."
      );
    }
  };

  const submitCommitteeDecision = async () => {
    if (!committeeDecision) {
      setError("Please select a committee decision.");
      return;
    }

    const conditions = committeeConditions.filter((item) =>
      item.description.trim()
    );

    if (committeeDecision === "APPROVE_WITH_CONDITIONS" && !conditions.length) {
      setError("Please specify at least one condition for approval.");
      return;
    }

    if (committeeDecision === "DEFER" && !deferTarget) {
      setError("Choose who the deferred request goes back to.");
      return;
    }

    if (!committeeReason.trim()) {
      setError("Please provide the rationale for the committee decision.");
      return;
    }

    try {
      setError("");

      const response = await api.post(
        `/change-requests/${changeRequestId}/committee-decision`,
        {
          decision: committeeDecision,
          rationale: committeeReason,
          conditions:
            committeeDecision === "APPROVE_WITH_CONDITIONS"
              ? conditions.map((item) => ({
                  description: item.description,
                  due_date: item.due_date || null,
                }))
              : [],
          deferred_to: committeeDecision === "DEFER" ? deferTarget : null,
          override_acknowledgement: overrideAcknowledgement || null,
        }
      );

      await loadAssessment();
      const nextStage = normalizeWorkflowStage(
        response.data?.change_request?.current_stage
      );
      setActiveView(getDefaultView(user?.role, nextStage));

    } catch (error) {
      console.error(
        "Failed to submit committee decision:",
        error
      );

      setError(
        error.response?.data?.detail ||
        "Unable to submit committee decision."
      );
    }
  };

  const submitForAnalystReview = async () => {
    try {
      setSubmittingForAnalyst(true);
      setShowSubmitConfirm(false);

      const response = await api.post(
        `/change-requests/${changeRequestId}/submit-for-analyst`
      );

      setSubmitResult({
        success: true,
        message:
          response.data?.message ||
          "Change request submitted for Risk Analyst review.",
      });
      await loadAssessment();
    } catch (error) {
      setSubmitResult({
        success: false,
        message:
          error.response?.data?.detail ||
          "Unable to submit the change request.",
      });
    } finally {
      setSubmittingForAnalyst(false);
    }
  };

  const completeRequestStage = async () => {
    try {
      setAdvancingStage(true);
      const ok = await runRiskAssessment();
      if (ok) {
        setActiveView("RISK_ASSESSMENT");
      }
    } finally {
      setAdvancingStage(false);
    }
  };

  const advanceToAnalystStage = async () => {
    try {
      setAdvancingStage(true);

      // Generate (or regenerate, on a new revision) the AI draft: that is
      // what moves the request into analyst review.
      if (!aiAssessment || changeRequest?.current_stage !== "ANALYST_REVIEW") {
        const generated = await generateAIAssessment();
        if (!generated) {
          return;
        }
      }

      await loadAssessment();
      setActiveView("ANALYST_REVIEW");
    } finally {
      setAdvancingStage(false);
    }
  };

  const savedByTab = {
    product: productSaved,
    customer: customerSaved,
    geography: geographySaved,
    transaction: transactionSaved,
    channel: channelSaved,
    vendor: vendorSaved,
  };

  // Business Owners fill the sections in order: a tab unlocks only once every
  // section before it has been saved. Read-only viewers can browse freely.
  const isTabEnabled = (tabId) => {
    if (!permissions.canEditIntake) {
      return true;
    }

    if (editingSection && editingSection !== tabId) {
      return false;
    }

    const index = INPUT_TABS.findIndex((tab) => tab.id === tabId);
    return INPUT_TABS.slice(0, index).every(
      (tab) => tab.id === "preview" || savedByTab[tab.id]
    );
  };

  const changeInputTab = (tabId) => {
    if (tabId === inputTab || !isTabEnabled(tabId)) {
      return;
    }

    setInputTab(tabId);
    setSectionError("");
  };

  const buildSection = (tabId) => {
    const index = INPUT_TABS.findIndex((tab) => tab.id === tabId);
    const previousTab = INPUT_TABS[index - 1];
    const nextTab = INPUT_TABS[index + 1];
    const editing = editingSection === tabId;

    return {
      locked:
        !permissions.canEditIntake || (savedByTab[tabId] && !editing),
      editing,
      canEdit: permissions.canEditIntake,
      onEdit: () => {
        setEditingSection(tabId);
        setSectionError("");
      },
      onCancel: async () => {
        setEditingSection(null);
        setSectionError("");
        await hydrateAssessmentInputs();
      },
      error: sectionError,
      previousTab,
      nextTab,
      canGoPrevious: !editing,
      canGoNext: !editing && Boolean(nextTab) && isTabEnabled(nextTab.id),
      onNavigate: changeInputTab,
    };
  };

  const submitDisabledReason =
    permissions.canSubmit && missingFields.length > 0
      ? `Complete and save the required fields first: ${formatMissingFieldLabels(
          missingFields
        )}.`
      : "";

  const currentStage = normalizeWorkflowStage(changeRequest?.current_stage);
  const isIntakeStage = currentStage === "REQUEST_CREATED";

  // Risk inputs (controls, AI draft) are only editable while the request sits
  // in the risk stage; once it moves on, the risk view is a read-only record.
  const riskEditable =
    permissions.canRunRiskPipeline && currentStage === "RISK_ASSESSMENT";

  // A missed control can still be added until the analyst submits the final
  // review. Doing so from analyst review recalculates residual risk and moves
  // the request back to the risk step, where the AI draft is regenerated.
  const controlsEditable =
    permissions.canRunRiskPipeline &&
    (currentStage === "RISK_ASSESSMENT" || currentStage === "ANALYST_REVIEW");

  // In the risk stage an existing AI draft predates the current risk numbers
  // (generating it is what moves the request on to analyst review).
  const aiAssessmentStale = riskEditable && Boolean(aiAssessment);

  // Previous/next stage views this user can open, so completed steps stay
  // reachable after the request has moved forward.
  const canOpenView = (view) =>
    canNavigateToWorkflowStage(view, changeRequest?.current_stage) &&
    !lockedStages.includes(view);

  const getAdjacentViews = (view) => {
    const order = WORKFLOW_STAGES.map((stage) => stage.key);
    const index = order.indexOf(view);
    return {
      previous: order.slice(0, index).reverse().find(canOpenView),
      next: order.slice(index + 1).find(canOpenView),
    };
  };

  const openView = (view) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderStageNavButton = (view, direction) =>
    view ? (
      <button
        type="button"
        onClick={() => openView(view)}
        className={
          direction === "previous"
            ? "rounded-xl border border-slate-300 dark:border-slate-600 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 sm:mr-auto"
            : "rounded-xl border border-indigo-300 bg-indigo-50 px-5 py-3 text-sm font-semibold text-indigo-800 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
        }
      >
        {direction === "previous"
          ? `← ${STAGE_VIEW_LABELS[view]}`
          : `${STAGE_VIEW_LABELS[view]} →`}
      </button>
    ) : null;

  // The committee's most recent deferral, if it opened the current revision.
  const lastDecision = committeeHistory[committeeHistory.length - 1];
  const activeDeferral =
    lastDecision?.decision === "DEFER" &&
    (lastDecision.revision || 1) === (changeRequest?.revision || 1) - 1
      ? lastDecision
      : null;
  const canExportAudit = canExportAuditPack(user?.role);

  let requestStageHint = null;
  if (permissions.canRunRiskPipeline && !isIntakeStage) {
    requestStageHint =
      "Risk has already been calculated for this request. Intake details are shown for reference.";
  } else if (permissions.canRunRiskPipeline) {
    requestStageHint =
      "Syncs intake, generates risk factors, calculates scores, and retrieves regulatory evidence.";
  } else if (permissions.canSubmit) {
    requestStageHint =
      missingFields.length > 0
        ? "Complete all required fields, then preview and submit for Risk Analyst review."
        : "All required fields are complete. Preview and submit for Risk Analyst review.";
  } else if (permissions.ownsIntake && permissions.submitted && isIntakeStage) {
    requestStageHint =
      "This request is in the Risk Analyst queue and will move forward once they run the risk assessment.";
  }

  if (loading) {
    return (
      <PageContainer>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Loading risk assessment...
        </p>
      </PageContainer>
    );
  }

  if (error && !changeRequest) {
    return (
      <PageContainer>
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-6 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ArrowLeft size={16} />
          Back to Change Requests
        </button>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/40">
          <div className="flex items-center gap-3">
            <AlertTriangle
              size={20}
              className="text-red-600 dark:text-red-400"
            />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <div className="w-full">
      <AssessmentHeader
        changeRequest={changeRequest}
        navigate={navigate}
      />

      <PageContainer className="pb-12">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {activeView === "REQUEST_CREATED" && (
          <>
        {activeDeferral?.deferred_to === "BUSINESS_OWNER" && isIntakeStage && (
          <DeferralNotice deferral={activeDeferral} audience="BUSINESS_OWNER" />
        )}
        {permissions.submitted && (
          <SubmissionBanner
            changeRequest={changeRequest}
            auditEvents={auditEvents}
            ownsIntake={permissions.ownsIntake && !permissions.canEditIntake}
            readOnly={!permissions.canEditIntake}
          />
        )}

        <div
          className={
            permissions.canEditIntake
              ? "space-y-8 xl:grid xl:grid-cols-12 xl:items-start xl:gap-10 xl:space-y-0"
              : ""
          }
        >
          {permissions.canEditIntake && (
          <div className="space-y-6 xl:col-span-5">
        <IntakePanel
          changeRequestId={changeRequestId}
          intakeMode={intakeMode}
          setIntakeMode={setIntakeMode}
          completenessPercent={completenessPercent}
          onExtractionApplied={handleExtractionApplied}
          setError={setError}
          readOnly={!permissions.canEditIntake}
        />
          </div>
          )}

          <div className={permissions.canEditIntake ? "xl:col-span-7" : ""}>
        <RequestInputTabs
          activeTab={inputTab}
          onTabChange={changeInputTab}
          isTabEnabled={isTabEnabled}
        >
          {inputTab === "product" && (
            <ProductInformation
              productForm={productForm}
              setProductForm={setProductForm}
              productSaved={productSaved}
              savingProduct={savingProduct}
              saveProduct={saveProduct}
              readOnly={!permissions.canEditIntake}
              section={buildSection("product")}
            />
          )}
          {inputTab === "customer" && (
            <CustomerProfile
              customerForm={customerForm}
              setCustomerForm={setCustomerForm}
              customerSaved={customerSaved}
              savingCustomer={savingCustomer}
              saveCustomerProfile={saveCustomerProfile}
              readOnly={!permissions.canEditIntake}
              section={buildSection("customer")}
            />
          )}
          {inputTab === "geography" && (
            <Geography
              geographyForm={geographyForm}
              setGeographyForm={setGeographyForm}
              geographySaved={geographySaved}
              savingGeography={savingGeography}
              saveGeography={saveGeography}
              readOnly={!permissions.canEditIntake}
              section={buildSection("geography")}
            />
          )}
          {inputTab === "transaction" && (
            <TransactionProfile
              transactionForm={transactionForm}
              setTransactionForm={setTransactionForm}
              transactionSaved={transactionSaved}
              savingTransaction={savingTransaction}
              saveTransactionProfile={saveTransactionProfile}
              readOnly={!permissions.canEditIntake}
              section={buildSection("transaction")}
            />
          )}
          {inputTab === "channel" && (
            <ChannelInformation
              channelForm={channelForm}
              setChannelForm={setChannelForm}
              channelSaved={channelSaved}
              savingChannel={savingChannel}
              saveChannel={saveChannel}
              readOnly={!permissions.canEditIntake}
              section={buildSection("channel")}
            />
          )}
          {inputTab === "vendor" && (
            <VendorInformation
              vendorForm={vendorForm}
              setVendorForm={setVendorForm}
              vendorSaved={vendorSaved}
              savingVendor={savingVendor}
              saveVendor={saveVendor}
              readOnly={!permissions.canEditIntake}
              section={buildSection("vendor")}
            />
          )}
          {inputTab === "preview" && (
            <AssessmentPreview
              productForm={productForm}
              customerForm={customerForm}
              geographyForm={geographyForm}
              transactionForm={transactionForm}
              channelForm={channelForm}
              vendorForm={vendorForm}
              onSubmit={() => setShowSubmitConfirm(true)}
              submitting={submittingForAnalyst}
              canSubmit={
                permissions.canSubmit && missingFields.length === 0
              }
              alreadySubmitted={permissions.submitted}
              hideActions={!permissions.ownsIntake}
              onPrevious={() => changeInputTab("vendor")}
              disabledReason={submitDisabledReason}
            />
          )}
        </RequestInputTabs>
          </div>
        </div>

        <AssessmentStageFooter hint={requestStageHint}>
          <button
            type="button"
            onClick={() => openView("RISK_ASSESSMENT")}
            disabled={
              !canNavigateToWorkflowStage(
                "RISK_ASSESSMENT",
                changeRequest?.current_stage
              )
            }
            className="rounded-xl border border-slate-300 dark:border-slate-600 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            View risk step
          </button>
          {permissions.canRunRiskPipeline && isIntakeStage ? (
            <button
              type="button"
              onClick={completeRequestStage}
              disabled={advancingStage || runningRiskAssessment}
              className="rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60 border border-green-300 bg-green-50 text-green-800 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400 dark:hover:bg-green-900/40"
            >
              {advancingStage || runningRiskAssessment
                ? "Calculating risk..."
                : "Run risk assessment →"}
            </button>
          ) : permissions.canSubmit ? (
            <button
              type="button"
              onClick={() => changeInputTab("preview")}
              disabled={!isTabEnabled("preview")}
              className="rounded-xl bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Preview & submit →
            </button>
          ) : permissions.submitted && isIntakeStage ? (
            <span className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-5 py-3 text-sm font-semibold text-amber-800">
              Awaiting Risk Analyst
            </span>
          ) : null}
        </AssessmentStageFooter>
          </>
        )}

        {activeView === "RISK_ASSESSMENT" && (
          <>
        {isBusinessOwner && !analystReviewRecord ? (
          <AwaitingAnalystReview
            riskCalculated={!isIntakeStage}
          />
        ) : (
        <div className="space-y-8 xl:grid xl:grid-cols-12 xl:items-stretch xl:gap-10 xl:space-y-0">
          {/* Both columns stretch to the same height: the last card in each
              column fills the remaining space so their bottoms line up. */}
          <div className="space-y-8 xl:col-span-7 xl:flex xl:flex-col">
            {isBusinessOwner && (
              <div className="mt-8">
                <AnalystOutcome review={analystReviewRecord} />
              </div>
            )}
            <RiskOverview
              riskAssessment={riskAssessment}
              runningRiskAssessment={runningRiskAssessment}
              runRiskAssessment={runRiskAssessment}
              canRun={riskEditable && !riskAssessment}
              onViewMethodology={
                isBusinessOwner ? undefined : () => setShowMethodology(true)
              }
            />
            {permissions.canRunRiskPipeline && riskAssessment && (
              <ControlsSection
                changeRequestId={changeRequestId}
                controls={controls}
                riskAssessment={riskAssessment}
                onControlsChanged={loadAssessment}
                setError={setError}
                readOnly={!controlsEditable}
                reopensRiskStage={currentStage === "ANALYST_REVIEW"}
              />
            )}
            {permissions.canViewAnalystReview && (
              <AIAssessment
                aiAssessment={aiAssessment}
                generatingAI={generatingAI}
                generateAIAssessment={generateAIAssessment}
                canGenerate={riskEditable}
                changeRequestId={changeRequestId}
                requestNumber={changeRequest?.request_number}
                stale={aiAssessmentStale}
                className="xl:flex-1"
              />
            )}
          </div>
          <div className="space-y-8 xl:col-span-5 xl:flex xl:flex-col">
            <SimilarCasesPanel changeRequestId={changeRequestId} />
            <RegulatoryEvidence
              regulatoryEvidence={regulatoryEvidence}
              riskFactors={riskFactors}
              fillHeight
            />
          </div>
        </div>
        )}

        {riskEditable ? (
        <AssessmentStageFooter
          hint={
            riskAssessment && isResidualPending(riskAssessment)
              ? "Document controls above to calculate residual risk, then continue to analyst review."
              : "Continuing generates the AI assessment and moves the request to analyst review."
          }
        >
          {renderStageNavButton(
            getAdjacentViews("RISK_ASSESSMENT").previous,
            "previous"
          )}
          <button
            type="button"
            onClick={advanceToAnalystStage}
            disabled={
              advancingStage ||
              generatingAI ||
              !riskAssessment ||
              isResidualPending(riskAssessment)
            }
            className="rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60 border border-green-300 bg-green-50 text-green-800 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400 dark:hover:bg-green-900/40"
          >
            {advancingStage || generatingAI
              ? "Preparing analyst step..."
              : "Continue to analyst review →"}
          </button>
        </AssessmentStageFooter>
        ) : (
        <AssessmentStageFooter
          hint={
            controlsEditable
              ? "Missed a control? Add it above before submitting your analyst review — residual risk is recalculated and the AI assessment is regenerated when you continue."
              : permissions.canRunRiskPipeline
              ? "Risk assessment is complete for this request. This view is a read-only record of how the risk was calculated."
              : "Risk assessment is performed by the Risk Analyst. This view is read-only."
          }
        >
          {renderStageNavButton(
            getAdjacentViews("RISK_ASSESSMENT").previous,
            "previous"
          )}
          {renderStageNavButton(
            getAdjacentViews("RISK_ASSESSMENT").next,
            "next"
          )}
        </AssessmentStageFooter>
        )}
          </>
        )}

        {activeView === "ANALYST_REVIEW" && permissions.canViewAnalystReview && (
          <>

<div className="mb-8">
  <div>
<AnalystReview
  changeRequestId={changeRequestId}
  deferral={activeDeferral?.deferred_to === "RISK_ANALYST" ? activeDeferral : null}
  riskAssessment={riskAssessment}
  analystRating={analystRating}
  setAnalystRating={setAnalystRating}
  overrideReason={overrideReason}
  setOverrideReason={setOverrideReason}
  consequences={consequences}
  setConsequences={setConsequences}
  analystReviewed={analystReviewed}
  submitAnalystReview={submitAnalystReview}
  canSubmit={permissions.canAnalystReview}
 />
  </div>
</div>

        <AssessmentStageFooter>
          {renderStageNavButton(
            getAdjacentViews("ANALYST_REVIEW").previous,
            "previous"
          )}
          {renderStageNavButton(
            getAdjacentViews("ANALYST_REVIEW").next,
            "next"
          )}
        </AssessmentStageFooter>

          </>
        )}

        {activeView === "COMMITTEE_REVIEW" && (
          <>

<CommitteeDecision
  riskAssessment={riskAssessment}
  analystRating={analystRating}
  analystReview={analystReviewRecord}
  deferTarget={deferTarget}
  setDeferTarget={setDeferTarget}
  overrideAcknowledgement={overrideAcknowledgement}
  setOverrideAcknowledgement={setOverrideAcknowledgement}
  aiAssessment={aiAssessment}
  committeeDecision={committeeDecision}
  setCommitteeDecision={setCommitteeDecision}
  committeeConditions={committeeConditions}
  setCommitteeConditions={setCommitteeConditions}
  committeeReason={committeeReason}
  setCommitteeReason={setCommitteeReason}
  committeeSubmitted={committeeSubmitted}
  submitCommitteeDecision={submitCommitteeDecision}
  canSubmit={permissions.canCommitteeDecide}
 />

        <AssessmentStageFooter>
          {renderStageNavButton(
            getAdjacentViews("COMMITTEE_REVIEW").previous,
            "previous"
          )}
          {renderStageNavButton(
            getAdjacentViews("COMMITTEE_REVIEW").next,
            "next"
          )}
        </AssessmentStageFooter>

          </>
        )}

        {activeView === "COMPLETED" && (
          <>
            <DecisionOutcome
              changeRequest={changeRequest}
              riskAssessment={riskAssessment}
              decision={committeeRecord}
            />

            {committeeRecord?.decision === "APPROVE_WITH_CONDITIONS" && (
              <ConditionsTracker
                changeRequestId={changeRequestId}
                role={user?.role}
                onChanged={loadAssessment}
              />
            )}

            <AssessmentStageFooter>
              {renderStageNavButton(
                getAdjacentViews("COMPLETED").previous,
                "previous"
              )}
            </AssessmentStageFooter>
          </>
        )}

        {(activeView === "COMPLETED" || user?.role === ROLES.AUDITOR) && (
          <AuditTrail
            changeRequestId={changeRequestId}
            requestNumber={changeRequest?.request_number}
            auditEvents={auditEvents}
            canExport={canExportAudit}
          />
        )}

      </PageContainer>

      {showMethodology && (
        <RiskMethodologyModal
          changeRequestId={changeRequestId}
          onClose={() => setShowMethodology(false)}
        />
      )}

      {showSubmitConfirm && (
        <ConfirmDialog
          title="Submit this change request?"
          message="Once submitted, it will move into the Risk Analyst queue for review. Do you really want to submit?"
          confirmLabel="Yes, submit"
          onConfirm={submitForAnalystReview}
          onCancel={() => setShowSubmitConfirm(false)}
          confirmDisabled={submittingForAnalyst}
        />
      )}

      {submitResult && (
        <ResultDialog
          success={submitResult.success}
          title={submitResult.success ? "Submitted successfully" : "Submission failed"}
          message={submitResult.message}
          onClose={() => setSubmitResult(null)}
        />
      )}
    </div>
  );
}

export default Assessment;