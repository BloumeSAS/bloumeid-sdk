import type { BloumeIDResult, FingerprintComponents } from "./types";

export interface BloumeIDServerConfig {
  secretKey: string;
  endpoint?: string;
  timeoutMs?: number;
}

export interface VerifiedRequestResponse {
  verified?: boolean;
  requestId: string;
  visitorId: string;
  siteId: string;
  thumbmark: string;
  hardwareHash: string;
  dangerLevel: number;
  confidence: number;
  flags: {
    isBot: boolean;
    isSpoofed: boolean;
    isVpn: boolean;
    isTor: boolean;
    isDatacenter: boolean;
    isProxy: boolean;
    isIncognito: boolean;
    crossBrowserMatched: boolean;
  };
  network: {
    ipAddress: string;
    ipSubnet: string;
    ja4Hash: string | null;
    asnNumber: number | null;
    asnOrg: string | null;
    country: string | null;
    city: string | null;
  };
  createdAt: string;
  components?: FingerprintComponents;
}

export interface VisitorProfileResponse {
  visitorId: string;
  siteId: string;
  hardwareHash: string;
  firstSeenAt: string;
  lastSeenAt: string;
  visitCount: number;
  maxDangerLevel: number;
  tags: string[];
  notes: string | null;
  recentEvents: Array<{
    requestId: string;
    fullHash: string;
    ipAddress: string;
    dangerLevel: number;
    confidence: number;
    crossBrowserMatched: boolean;
    createdAt: string;
  }>;
}

export class BloumeIDServer {
  private readonly secretKey: string;
  private readonly endpoint: string;
  private readonly timeoutMs: number;

  constructor(config: BloumeIDServerConfig) {
    if (!config.secretKey || !config.secretKey.startsWith("bid_sec_")) {
      throw new Error("BloumeIDServer requires a valid secretKey starting with 'bid_sec_'");
    }
    this.secretKey = config.secretKey;
    this.endpoint = (config.endpoint ?? "http://localhost:3000").replace(/\/+$/, "");
    this.timeoutMs = config.timeoutMs ?? 5000;
  }

  private async request<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.endpoint}${path}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.secretKey}`,
          "X-BloumeID-Secret": this.secretKey,
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error ?? `BloumeID API error (${res.status})`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  public async verifyRequest(requestId: string): Promise<VerifiedRequestResponse> {
    if (!requestId || !/^req_[0-9a-zA-Z_]+$/.test(requestId)) {
      throw new Error("Invalid requestId: must match req_<snowflake>");
    }
    return this.request<VerifiedRequestResponse>(
      `/api/v1/requests/${encodeURIComponent(requestId)}`
    );
  }

  public async getVisitor(visitorId: string): Promise<VisitorProfileResponse> {
    if (!visitorId || !/^vis_[0-9a-zA-Z_]+$/.test(visitorId)) {
      throw new Error("Invalid visitorId: must match vis_<snowflake>");
    }
    return this.request<VisitorProfileResponse>(
      `/api/v1/visitors/${encodeURIComponent(visitorId)}`
    );
  }
}

export type { BloumeIDResult };
export default BloumeIDServer;
