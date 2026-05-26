import { createHash } from 'crypto';

export interface RedactionResult {
  allowed: boolean;
  redactedQuery?: string;
  queryFingerprint?: string;
  rejectionReasons: string[];
}

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const URL_PATTERN = /\bhttps?:\/\/\S+|\bwww\.\S+/i;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/;
const ACCOUNT_PATTERN = /\b(?:ssn|curp|rfc|account|cuenta|passport|pasaporte|id)\b/i;
const ADDRESS_PATTERN = /\b(?:calle|avenida|av\.|street|st\.|road|rd\.|colonia|zip|cp)\b/i;
const MEDICAL_NARRATIVE_PATTERN =
  /\b(tengo|padezco|diagnosticado|diagnosticada|doctor|medico|m[eé]dico|medication|medicamento|embarazada|embarazo|dolor|sangrado|presi[oó]n|diabetes|cancer|c[aá]ncer)\b/i;

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function fingerprintQuery(value: string): string {
  return createHash('sha256').update(value.toLowerCase()).digest('hex').slice(0, 16);
}

export function redactAuditQuery(query: string): RedactionResult {
  const rejectionReasons: string[] = [];
  const trimmed = query.trim();

  if (!trimmed) {
    rejectionReasons.push('query is empty');
  }

  if (/[\n\r]/.test(trimmed)) {
    rejectionReasons.push('query contains multiple lines');
  }

  if (trimmed.length > 120) {
    rejectionReasons.push('query exceeds 120 characters');
  }

  if (EMAIL_PATTERN.test(trimmed)) {
    rejectionReasons.push('query contains an email address');
  }

  if (URL_PATTERN.test(trimmed)) {
    rejectionReasons.push('query contains a URL');
  }

  if (PHONE_PATTERN.test(trimmed)) {
    rejectionReasons.push('query contains a phone-like number');
  }

  if (ACCOUNT_PATTERN.test(trimmed)) {
    rejectionReasons.push('query contains personal identifier language');
  }

  if (ADDRESS_PATTERN.test(trimmed)) {
    rejectionReasons.push('query contains address-like language');
  }

  if (MEDICAL_NARRATIVE_PATTERN.test(trimmed) && trimmed.split(/\s+/).length > 4) {
    rejectionReasons.push('query appears to contain a personal medical narrative');
  }

  if (/[<>]/.test(trimmed)) {
    rejectionReasons.push('query contains unsafe markup characters');
  }

  if (rejectionReasons.length > 0) {
    return { allowed: false, rejectionReasons };
  }

  const redactedQuery = normalizeSpaces(trimmed);
  return {
    allowed: true,
    redactedQuery,
    queryFingerprint: fingerprintQuery(redactedQuery),
    rejectionReasons: [],
  };
}

