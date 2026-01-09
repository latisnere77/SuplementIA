/**
 * Supplement Variant Detection & Selector Types
 * Handles detection of supplement variants (e.g., Magnesium Glycinate, Citrate, etc.)
 */

export interface SupplementVariant {
  id?: string; // Optional - backend provides, frontend may not
  name?: string; // Legacy field
  type?: string; // e.g., "glycinate", "citrate", "monohydrate"
  displayName: string; // User-friendly name: "Magnesium Glycinate"
  scientificName?: string;
  alternativeNames?: string[];
  studyCount?: number; // Optional - may not always be provided
  confidence?: number; // 0-1, confidence score for this variant (optional)
  description?: string; // e.g., "Better absorption, less laxative effect"
  primaryBenefits?: string[];
  isComplex?: boolean;
}

export interface VariantDetectionResult {
  baseSupplementName: string; // e.g., "Magnesium"
  variants: SupplementVariant[];
  hasVariants: boolean; // true if 2+ significant variants found
  normalizedQuery?: string;
  recommendedVariant?: string; // ID of recommended variant
  detectionConfidence?: number; // 0-100 confidence score
  mostStudied?: SupplementVariant | null; // Legacy field
  recommendedForGenericSearch?: boolean; // Legacy field
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface VariantSelectorResponse {
  success: boolean;
  recommendation?: any; // Main recommendation data
  variantDetection?: VariantDetectionResult;
  suggestVariantSelection?: boolean; // Should frontend show selector?
  message?: string;
}
