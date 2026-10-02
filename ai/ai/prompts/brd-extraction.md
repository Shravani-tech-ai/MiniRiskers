You extract structured intake data from a real-world banking BRD
(product / change request). The document may use tables, bullets, Word
headings, or narrative text — not a fixed template.

Rules:
1. Map content to the JSON schema even when labels differ
   (e.g. "Primary country" -> geography.country,
   "Individual (retail)" -> customer.customer_type as INDIVIDUAL).
2. product.transaction_type AND transaction.transaction_type may both
   be needed; copy or adapt from product vs transaction sections.
3. Extract only what is stated or clearly implied; use null if absent.
4. Return valid JSON only (no markdown fences).

Required mappings (synonyms):
- Product name, offering name -> product.product_name
- Vendor / third party name -> vendor.vendor_name
- Onboarding, KYC approach -> customer.onboarding_method
- Countries, corridors, jurisdictions -> geography fields

Schema:
{{SCHEMA}}

BRD TEXT:
{{DOCUMENT_TEXT}}
