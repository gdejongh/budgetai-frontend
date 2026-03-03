import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';

import { BASE_PATH } from '../api/variables';
import {
  ExchangeTokenRequest,
  LinkTokenResponse,
  PlaidItemDTO,
  PlaidLinkHandler,
  PlaidLinkOnSuccessMetadata,
  PlaidLinkError,
  PlaidLinkOnExitMetadata,
} from './plaid.types';

const PLAID_LINK_SCRIPT_URL = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';

export interface PlaidLinkResult {
  publicToken: string;
  metadata: PlaidLinkOnSuccessMetadata;
}

export interface SyncResult {
  itemsSynced: number;
  itemsFailed: number;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class PlaidService {
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(BASE_PATH, { optional: true }) ?? 'http://localhost:8080';

  private scriptLoaded = false;
  private linkHandler: PlaidLinkHandler | null = null;

  // ─── API calls ──────────────────────────────────────────────────

  createLinkToken(): Observable<LinkTokenResponse> {
    return this.http.post<LinkTokenResponse>(`${this.basePath}/api/plaid/link-token`, {});
  }

  exchangeToken(request: ExchangeTokenRequest): Observable<void> {
    return this.http.post<void>(`${this.basePath}/api/plaid/exchange-token`, request);
  }

  getPlaidItems(): Observable<PlaidItemDTO[]> {
    return this.http.get<PlaidItemDTO[]>(`${this.basePath}/api/plaid/items`);
  }

  unlinkItem(itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.basePath}/api/plaid/items/${itemId}`);
  }

  syncAccounts(): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.basePath}/api/plaid/sync`, {});
  }

  // ─── Plaid Link JS SDK ──────────────────────────────────────────

  /**
   * Loads the Plaid Link JS script, creates a link token, opens the
   * Plaid Link modal, and returns a promise that resolves on success
   * or rejects on exit / error.
   */
  async openPlaidLink(): Promise<PlaidLinkResult> {
    await this.loadScript();
    const { linkToken } = await firstValueFrom(this.createLinkToken());
    return this.openLink(linkToken);
  }

  /** Destroy any active Plaid Link handler. */
  destroyLink(): void {
    this.linkHandler?.destroy();
    this.linkHandler = null;
  }

  // ─── Private helpers ────────────────────────────────────────────

  private loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.scriptLoaded && window.Plaid) {
        resolve();
        return;
      }

      // Check if the script tag already exists
      const existing = document.querySelector(`script[src="${PLAID_LINK_SCRIPT_URL}"]`);
      if (existing) {
        existing.addEventListener('load', () => {
          this.scriptLoaded = true;
          resolve();
        });
        if (window.Plaid) {
          this.scriptLoaded = true;
          resolve();
        }
        return;
      }

      const script = document.createElement('script');
      script.src = PLAID_LINK_SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Plaid Link script'));
      document.head.appendChild(script);
    });
  }

  private openLink(linkToken: string): Promise<PlaidLinkResult> {
    return new Promise<PlaidLinkResult>((resolve, reject) => {
      if (!window.Plaid) {
        reject(new Error('Plaid Link SDK not loaded'));
        return;
      }

      this.linkHandler = window.Plaid.create({
        token: linkToken,
        onSuccess: (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
          resolve({ publicToken, metadata });
          this.linkHandler = null;
        },
        onExit: (error: PlaidLinkError | null, _metadata: PlaidLinkOnExitMetadata) => {
          if (error) {
            reject(new Error(error.display_message ?? error.error_message));
          } else {
            reject(new Error('PLAID_LINK_DISMISSED'));
          }
          this.linkHandler = null;
        },
      });

      this.linkHandler.open();
    });
  }
}
