/**
 * Supplement Variant Detection & Selector Types
 * Handles detection of supplement variants (e.g., Magnesium Glycinate, Citrate, etc.)
 */

export interface SupplementVariant {
  name: string;
  type: string; // e.g., "glycinate", "citrate", "monohydrate"
  displayName: string; // User-friendly name: "Magnesium Glycinate"
  studyCount: number;
  confidence: number; // 0-1, confidence score for this variant
  description?: string; // e.g., "Better absorption, less laxative effect"
}

export interface VariantDetectionResult {
  baseSupplementName: string; // e.g., "Magnesium"
  variants: SupplementVariant[];
  hasVariants: boolean; // true if 2+ significant variants found
  mostStudied: SupplementVariant | null; // Variant with most studies
  recommendedForGenericSearch: boolean; // true if user should be asked which variant
}

export interface VariantSelectorResponse {
  success: boolean;
  recommendation?: any; // Main recommendation data
  variantDetection?: VariantDetectionResult;
  suggestVariantSelection?: boolean; // Should frontend show selector?
  message?: string;
}
