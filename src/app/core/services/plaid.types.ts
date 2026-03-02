import { BankAccountDTO } from '../api/model/bankAccountDTO';

// ─── Plaid Link JS SDK types ────────────────────────────────────────

export interface PlaidLinkAccount {
  id: string;
  name: string;
  mask: string;
  type: string;
  subtype: string;
}

export interface PlaidLinkInstitution {
  name: string;
  institution_id: string;
}

export interface PlaidLinkOnSuccessMetadata {
  institution: PlaidLinkInstitution;
  accounts: PlaidLinkAccount[];
  link_session_id: string;
}

export interface PlaidLinkOnExitMetadata {
  institution: PlaidLinkInstitution | null;
  status: string | null;
  link_session_id: string;
  request_id: string;
}

export interface PlaidLinkHandler {
  open: () => void;
  exit: (options?: { force: boolean }) => void;
  destroy: () => void;
}

export interface PlaidLinkConfig {
  token: string;
  onSuccess: (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => void;
  onExit: (error: PlaidLinkError | null, metadata: PlaidLinkOnExitMetadata) => void;
  onLoad?: () => void;
  onEvent?: (eventName: string, metadata: Record<string, unknown>) => void;
}

export interface PlaidLinkError {
  error_type: string;
  error_code: string;
  error_message: string;
  display_message: string | null;
}

// ─── Backend API request / response types ───────────────────────────

export interface LinkTokenResponse {
  linkToken: string;
}

export interface PlaidAccountLink {
  plaidAccountId: string;
  existingBankAccountId?: string;
  accountName: string;
  accountType: string;
  mask: string;
}

export interface ExchangeTokenRequest {
  publicToken: string;
  institutionId: string;
  institutionName: string;
  accountLinks: PlaidAccountLink[];
}

export interface PlaidItemDTO {
  id: string;
  institutionId: string;
  institutionName: string;
  status: string;
  lastSyncedAt?: string;
  createdAt?: string;
  accounts?: BankAccountDTO[];
}

// Global window augmentation for Plaid Link SDK
declare global {
  interface Window {
    Plaid?: {
      create: (config: PlaidLinkConfig) => PlaidLinkHandler;
    };
  }
}
