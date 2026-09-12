import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function NewRequest() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    request_number: "",
    title: "",
    description: "",
    change_type: "",
    product_type: "",
    business_unit: "",
    customer_segment: "",
    requested_by: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (
      !formData.request_number ||
      !formData.title ||
      !formData.description ||
      !formData.change_type ||
      !formData.product_type ||
      !formData.business_unit ||
      !formData.customer_segment ||
      !formData.requested_by
    ) {
      setError("Please complete all required fields.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post(
        "/change-requests",
        null,
        {
          params: formData,
        }
      );

      console.log("Change request created:", response.data);

      navigate("/");
    } catch (err) {
      console.error("Failed to create change request:", err);

      setError(
        err.response?.data?.detail ||
        "Unable to create the change request."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}

      <div className="border-b border-slate-200 bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              MiniRiskers
            </h1>

            <p className="text-sm text-slate-500">
              FCRM Risk Assessment Workbench
            </p>
          </div>

        </div>

      </div>


      {/* Main */}

      <main className="mx-auto max-w-4xl px-6 py-8">

        {/* Back */}

        <button
          onClick={() => navigate("/")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Change Requests
        </button>


        {/* Page heading */}

        <div className="mb-8">

          <h2 className="text-3xl font-bold text-slate-900">
            New Change Request
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Submit a new product, process, vendor, geography, or
            customer change for financial crime risk assessment.
          </p>

        </div>


        {/* Error */}

        {error && (

          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>

        )}


        {/* Form */}

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white shadow-sm"
        >

          <div className="space-y-8 p-8">


            {/* Request Information */}

            <section>

              <h3 className="text-lg font-semibold text-slate-900">
                Request Information
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Basic information about the proposed change.
              </p>


              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">

                {/* Request Number */}

                <div>

                  <label className="text-sm font-medium text-slate-700">
                    Request Number *
                  </label>

                  <input
                    name="request_number"
                    value={formData.request_number}
                    onChange={handleChange}
                    placeholder="CR-2026-002"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />

                </div>


                {/* Requested By */}

                <div>

                  <label className="text-sm font-medium text-slate-700">
                    Requested By *
                  </label>

                  <input
                    name="requested_by"
                    value={formData.requested_by}
                    onChange={handleChange}
                    placeholder="Product Owner"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />

                </div>


                {/* Title */}

                <div className="md:col-span-2">

                  <label className="text-sm font-medium text-slate-700">
                    Request Title *
                  </label>

                  <input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Example: New Digital International Remittance Product"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />

                </div>


                {/* Description */}

                <div className="md:col-span-2">

                  <label className="text-sm font-medium text-slate-700">
                    Description *
                  </label>

                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Describe the proposed product, process, feature, vendor, geography, or customer change..."
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />

                </div>

              </div>

            </section>


            {/* Classification */}

            <section className="border-t border-slate-200 pt-8">

              <h3 className="text-lg font-semibold text-slate-900">
                Change Classification
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Classify the type of change and the affected business area.
              </p>


              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">

                {/* Change Type */}

                <div>

                  <label className="text-sm font-medium text-slate-700">
                    Change Type *
                  </label>

                  <select
                    name="change_type"
                    value={formData.change_type}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >

                    <option value="">
                      Select change type
                    </option>

                    <option value="NEW_PRODUCT">
                      New Product
                    </option>

                    <option value="PRODUCT_CHANGE">
                      Product Change
                    </option>

                    <option value="PROCESS_CHANGE">
                      Process Change
                    </option>

                    <option value="VENDOR_CHANGE">
                      Vendor Change
                    </option>

                    <option value="GEOGRAPHY_CHANGE">
                      Geography Change
                    </option>

                    <option value="CUSTOMER_SEGMENT_CHANGE">
                      Customer Segment Change
                    </option>

                  </select>

                </div>


                {/* Product Type */}

                <div>

                  <label className="text-sm font-medium text-slate-700">
                    Product Type *
                  </label>

                  <input
                    name="product_type"
                    value={formData.product_type}
                    onChange={handleChange}
                    placeholder="DIGITAL_REMITTANCE"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm uppercase outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />

                </div>


                {/* Business Unit */}

                <div>

                  <label className="text-sm font-medium text-slate-700">
                    Business Unit *
                  </label>

                  <select
                    name="business_unit"
                    value={formData.business_unit}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >

                    <option value="">
                      Select business unit
                    </option>

                    <option value="Retail Banking">
                      Retail Banking
                    </option>

                    <option value="Commercial Banking">
                      Commercial Banking
                    </option>

                    <option value="Payments">
                      Payments
                    </option>

                    <option value="Wealth Management">
                      Wealth Management
                    </option>

                  </select>

                </div>


                {/* Customer Segment */}

                <div>

                  <label className="text-sm font-medium text-slate-700">
                    Customer Segment *
                  </label>

                  <select
                    name="customer_segment"
                    value={formData.customer_segment}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >

                    <option value="">
                      Select customer segment
                    </option>

                    <option value="Retail Customers">
                      Retail Customers
                    </option>

                    <option value="Business Customers">
                      Business Customers
                    </option>

                    <option value="Retail and Business Customers">
                      Retail and Business Customers
                    </option>

                    <option value="High Net Worth Customers">
                      High Net Worth Customers
                    </option>

                  </select>

                </div>

              </div>

            </section>


          </div>


          {/* Footer */}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-8 py-5">

            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>


            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >

              <Plus size={17} />

              {loading
                ? "Creating..."
                : "Create Change Request"}

            </button>

          </div>

        </form>

      </main>

    </div>
  );
}

export default NewRequest;