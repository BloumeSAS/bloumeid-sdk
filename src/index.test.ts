import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import sdkPkg from "../package.json";
import {
  BloumeID,
  FingerprintJS,
  load,
  OS_FONT_CANDIDATES,
  SDK_VERSION,
  computeAntiReplaySignature,
  encryptFingerprintEnvelope,
  generateNonce,
  hmacSha256Hex,
  sha256Hex,
  stableStringify,
} from "./index";
import { BloumeIDServer } from "./server";
import {
  collectAudio,
  collectCanvas,
  collectConnection,
  collectCssMediaMatrix,
  collectFonts,
  collectHardware,
  collectLanguages,
  collectMath,
  collectMediaCodecs,
  collectScreen,
  collectSpeech,
  collectStorage,
  collectTimezoneIntl,
  collectUserAgentData,
  collectWebGL,
  collectWebGPU,
  collectWebRTC,
} from "./collectors";
import { runAntiSpoofProbes } from "./probes";

describe("@bloume/id v1.0.0 — 70+ Signals, Anti-Spoof, Dual API (ThumbmarkJS + Fingerprint.com) & Server Client", () => {
  it("reports dynamic SDK_VERSION and instantiates with default and custom options", () => {
    expect(SDK_VERSION).toBe(sdkPkg.version);
    const client = new BloumeID({
      apiKey: "bid_pub_test123",
      endpoint: "https://id.bloume.example/",
      options: { exclude: ["webrtc"], timeout: 4000, cacheLifetimeMs: 1000 },
    });
    expect(client.version).toBe(SDK_VERSION);
    expect(client.getOptions().apiKey).toBe("bid_pub_test123");
    expect(client.getOptions().endpoint).toBe("https://id.bloume.example");
    expect(client.getOptions().options.exclude).toEqual(["webrtc"]);

    client.setOption("timeout", 2500);
    expect(client.getOptions().options.timeout).toBe(2500);
  });

  it("computes deterministic SHA-256, HMAC-SHA256 and anti-replay signatures", () => {
    expect(sha256Hex("bloumeid")).toHaveLength(64);
    expect(sha256Hex("bloumeid")).toBe(sha256Hex("bloumeid"));
    expect(hmacSha256Hex("bid_pub_key", "payload")).toHaveLength(64);
    expect(hmacSha256Hex("k".repeat(90), "payload")).toHaveLength(64);

    const nonce = generateNonce(24);
    expect(nonce).toHaveLength(24);
    const sig1 = computeAntiReplaySignature("bid_pub_1", 1700000000000, nonce, "f_hash", "hw_hash");
    const sig2 = computeAntiReplaySignature("bid_pub_1", 1700000000000, nonce, "f_hash", "hw_hash");
    expect(sig1).toBe(sig2);
    expect(stableStringify({ b: 2, a: [1, { d: 4, c: 3 }] })).toBe('{"a":[1,{"c":3,"d":4}],"b":2}');
  });

  it("collects 70+ signals including emoji subpixels, CSS media matrix, media codecs, WebGL pixel hash & WebGPU limits", async () => {
    expect(OS_FONT_CANDIDATES.length).toBeGreaterThanOrEqual(80);

    const canvas = collectCanvas();
    expect(canvas.hash).toHaveLength(64);
    expect(canvas.emojiSubpixelHash).toHaveLength(64);

    const webgl = collectWebGL();
    expect(webgl.extensionsHash).toHaveLength(64);
    expect(webgl.pixelRenderHash).toHaveLength(64);

    const webgpu = await collectWebGPU();
    expect(webgpu.limitsHash).toHaveLength(64);

    const audio = await collectAudio();
    expect(audio.sampleHash).toHaveLength(64);

    const hardware = collectHardware();
    expect(hardware.hardwareConcurrency).toBeGreaterThanOrEqual(1);
    expect(typeof hardware.globalPrivacyControl).toBe("boolean");

    const screen = collectScreen();
    expect(screen.colorDepth).toBeGreaterThan(0);

    const cssMedia = collectCssMediaMatrix();
    expect(typeof cssMedia.prefersColorScheme).toBe("string");
    expect(typeof cssMedia.anyPointer).toBe("string");

    const codecs = await collectMediaCodecs();
    expect(codecs.keyboardLayoutHash).toHaveLength(64);
    expect(typeof codecs.av1Supported).toBe("boolean");

    const fonts = collectFonts();
    expect(fonts.hash).toHaveLength(64);

    const tz = collectTimezoneIntl();
    expect(tz.timezone.length).toBeGreaterThan(0);
    expect(typeof tz.dstConsistent).toBe("boolean");

    const langs = collectLanguages();
    expect(langs.languages.length).toBeGreaterThan(0);

    const uaData = await collectUserAgentData();
    expect(uaData.fullVersionListHash).toHaveLength(64);

    const storage = await collectStorage();
    expect(typeof storage.localStorage).toBe("boolean");

    const speech = collectSpeech();
    expect(speech.voicesHash).toHaveLength(64);

    const math = collectMath();
    expect(math.constantsHash).toHaveLength(64);

    const webrtc = await collectWebRTC(50);
    expect(webrtc.sdpFeedbackHash).toHaveLength(64);

    const conn = collectConnection();
    expect(typeof conn.available).toBe("boolean");

    const probes = await runAntiSpoofProbes({
      canvas,
      audio,
      hardware,
      webgl,
      languages: langs,
      storage,
      timezoneIntl: tz,
    });
    expect(typeof probes.isBot).toBe("boolean");
    expect(typeof probes.isSpoofed).toBe("boolean");
    expect(Array.isArray(probes.tamperedFunctions)).toBe(true);
  });

  it("detects VM renderers, DST tampering and double-render noise in anti-spoof probes", async () => {
    const baseAudio = await collectAudio();
    const baseStorage = await collectStorage();
    const canvas = { ...collectCanvas(), doubleRenderConsistent: false };
    const audio = { ...baseAudio, doubleRenderConsistent: false };
    const hardware = collectHardware();
    const webgl = { ...collectWebGL(), unmaskedRenderer: "Google SwiftShader" };
    const languages = { language: "fr-FR", languages: ["en-US"], consistentMainLanguage: false };
    const storage = { ...baseStorage, quotaBytes: 50 * 1024 * 1024 };
    const tz = { ...collectTimezoneIntl(), dstConsistent: false };

    const result = await runAntiSpoofProbes({
      canvas,
      audio,
      hardware,
      webgl,
      languages,
      storage,
      timezoneIntl: tz,
    });

    expect(result.isSpoofed).toBe(true);
    expect(result.isIncognito).toBe(true);
    expect(result.isVirtualMachine).toBe(true);
    expect(result.timezoneDstMismatch).toBe(true);
    expect(result.canvasNoiseDetected).toBe(true);
    expect(result.audioNoiseDetected).toBe(true);
    expect(result.reasons.length).toBeGreaterThanOrEqual(4);
  });

  it("supports both ThumbmarkJS Pro API and Fingerprint.com (FingerprintJS.load) API", async () => {
    // 1. Fingerprint.com compatible agent
    const fpAgent = await FingerprintJS.load({
      options: { exclude: ["webrtc"], cacheLifetimeMs: 5000 },
    });
    const fpResult = await fpAgent.get({
      extendedResult: true,
      linkedId: "acct_999",
      tag: { flow: "signup" },
    });

    expect(fpResult.visitorId).toMatch(/^vis_/);
    expect(fpResult.requestId).toMatch(/^req_/);
    expect(typeof fpResult.visitorFound).toBe("boolean");
    expect(fpResult.confidence.revision).toBe(SDK_VERSION);
    expect(fpResult.linkedId).toBe("acct_999");
    expect(fpResult.tag).toEqual({ flow: "signup" });
    expect(fpResult.info.collectorCount).toBe(104);
    expect(fpResult.firstSeenAt.global).toBeTruthy();

    // 2. Direct load() helper + exclusions
    const sdk = await load({
      options: {
        exclude: [
          "webrtc",
          "canvas",
          "webgl",
          "webgpu",
          "audio",
          "hardware",
          "screen",
          "cssMedia",
          "mediaCodecs",
          "fonts",
          "timezone",
          "languages",
          "userAgentData",
          "storage",
          "speech",
          "math",
          "connection",
          "antiSpoof",
        ],
        cacheLifetimeMs: 5000,
      },
    });

    const hash = await sdk.getFingerprint();
    expect(hash).toHaveLength(64);
    const r1 = await sdk.get();
    const r2 = await sdk.get();
    expect(r1.requestId).toBe(r2.requestId);
  });

  it("sends encrypted v2 AES-256-GCM envelope and parses minimal server response + sealedResult", async () => {
    const mockServerResult = {
      visitorId: "vis_72819283719283712",
      requestId: "req_72819283719283713",
      visitorFound: true,
      thumbmark: "a".repeat(64),
      confidence: { score: 0.99, revision: SDK_VERSION },
      sealedResult: "v1.stub_iv.stub_cipher.stub_tag",
    };

    let capturedBody: Record<string, unknown> = {};
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementationOnce(async (_url, init) => {
      capturedBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return new Response(JSON.stringify(mockServerResult), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const sdk = new BloumeID({
      apiKey: "bid_pub_livekey",
      endpoint: "https://bloumeid.internal",
      options: { exclude: ["webrtc", "audio", "webgpu"], cacheLifetimeMs: 1000 },
    });

    const res = await sdk.get({ linkedId: "user_1" });
    expect(res.visitorId).toBe("vis_72819283719283712");
    expect(res.thumbmark).toBe("a".repeat(64));
    expect(res.sealedResult).toBe("v1.stub_iv.stub_cipher.stub_tag");
    expect(res.info.collectorCount).toBe(104);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    if (globalThis.crypto?.subtle) {
      expect(capturedBody.v).toBe(2);
      expect(typeof capturedBody.iv).toBe("string");
      expect(typeof capturedBody.ciphertext).toBe("string");
      expect(capturedBody.components).toBeUndefined();
    }
    fetchSpy.mockRestore();

    const directEncrypted = await encryptFingerprintEnvelope({
      publicKey: "bid_pub_test",
      ts: Date.now(),
      nonce: "nonce_test_aes_123456",
      origin: "https://app.bloume.fr",
      payload: { hello: "bloumeid" },
    });
    expect(directEncrypted?.v).toBe(2);
  });

  it("fixes Windows x86_64 architectureHint (AppleWebKit false positive) & detects Tor Browser markers", async () => {
    const origNav = globalThis.navigator;
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        ...origNav,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36",
        platform: "Win32",
        hardwareConcurrency: 12,
        cookieEnabled: true,
        language: "en-US",
        languages: ["en-US"],
      },
    });
    const hw = collectHardware();
    expect(hw.architectureHint).toBe("x86_64");

    const client = new BloumeID({
      options: { exclude: ["webrtc", "audio", "webgpu", "canvas", "webgl", "fonts"] },
    });
    const res = await client.get();
    expect(res.browserName).toBe("Chrome");
    expect(res.browserVersion).toBe("158.0");
    expect(res.os).toBe("Windows");
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: origNav });

    const torProbes = await runAntiSpoofProbes({
      canvas: { ...collectCanvas(), doubleRenderConsistent: false },
      audio: await collectAudio(),
      hardware: { ...hw, globalPrivacyControl: true, deviceMemory: 0 },
      webgl: { ...collectWebGL(), vendor: "Mozilla", renderer: "Mozilla" },
      languages: { language: "en-US", languages: ["en-US"], consistentMainLanguage: true },
      storage: await collectStorage(),
      timezoneIntl: { ...collectTimezoneIntl(), timezone: "Atlantic/Reykjavik" },
      speech: { available: false, voiceCount: 0, defaultVoice: "none", voicesHash: "x" },
      webrtc: { available: false, candidateTypes: [], localIpPresent: false, sdpFeedbackHash: "x" },
    });
    expect(torProbes.isTorBrowser).toBe(true);
    expect(torProbes.reasons).toContain("Tor Browser environment signature detected");
  });

  it("validates BloumeIDServer verifyRequest, getVisitor and unsealResult AES-256-GCM decryption", async () => {
    expect(() => new BloumeIDServer({ secretKey: "invalid" })).toThrow();

    const secretKey = "bid_sec_valid_secret_key";
    const server = new BloumeIDServer({
      secretKey,
      endpoint: "https://bloumeid.internal/",
    });

    await expect(server.verifyRequest("bad_id")).rejects.toThrow();
    await expect(server.getVisitor("bad_vis")).rejects.toThrow();

    // Test local AES-256-GCM unsealResult
    const sealPayload = {
      verified: true,
      requestId: "req_9999999999999999",
      visitorId: "vis_8888888888888888",
      siteId: "site_123",
      thumbmark: "a".repeat(64),
      hardwareHash: "b".repeat(64),
      dangerLevel: 4,
      confidence: 0.99,
      flags: {
        isBot: false,
        isSpoofed: true,
        isVpn: false,
        isTor: true,
        isDatacenter: false,
        isProxy: false,
        isIncognito: true,
        crossBrowserMatched: false,
      },
      network: {
        ipAddress: "185.220.101.4",
        ipSubnet: "185.220.101.0/24",
        ja4Hash: "t13d1516h2_abcdef123456_123456abcdef",
        asnNumber: 24940,
        asnOrg: "Tor Exit",
        country: "DE",
        city: "Frankfurt",
      },
      createdAt: new Date().toISOString(),
    };
    const key = crypto.createHash("sha256").update(`bloumeid-seal-v1:${secretKey}`, "utf8").digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(sealPayload), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const sealedToken = `v1.${iv.toString("base64url")}.${encrypted.toString("base64url")}.${tag.toString("base64url")}`;

    const unsealed = server.unsealResult(sealedToken);
    expect(unsealed.requestId).toBe("req_9999999999999999");
    expect(unsealed.dangerLevel).toBe(4);
    expect(unsealed.flags.isTor).toBe(true);

    const wrongServer = new BloumeIDServer({ secretKey: "bid_sec_wrong_secret_key" });
    expect(() => wrongServer.unsealResult(sealedToken)).toThrow();
    expect(() => server.unsealResult("v1.bad.token.here")).toThrow();

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            requestId: "req_123",
            visitorId: "vis_456",
            siteId: "site_789",
            thumbmark: "a".repeat(64),
            hardwareHash: "b".repeat(64),
            dangerLevel: 1,
            confidence: 0.99,
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            visitorId: "vis_456",
            siteId: "site_789",
            hardwareHash: "b".repeat(64),
            visitCount: 4,
            maxDangerLevel: 1,
            tags: ["verified"],
            notes: null,
            recentEvents: [],
          }),
          { status: 200 }
        )
      );

    const verified = await server.verifyRequest("req_123");
    expect(verified.visitorId).toBe("vis_456");

    const visitor = await server.getVisitor("vis_456");
    expect(visitor.visitCount).toBe(4);
    fetchSpy.mockRestore();
  });

  it("terminates Web Worker, revokes Blob URL on probe timeout, and clears fetch timers on error", async () => {
    const origWorker = globalThis.Worker;
    const origCreateObjectUrl = URL.createObjectURL;
    const origRevokeObjectUrl = URL.revokeObjectURL;

    let terminated = false;
    let revokedUrl: string | null = null;
    class HangingWorkerStub {
      public onmessage: ((evt: MessageEvent) => void) | null = null;
      public onerror: (() => void) | null = null;
      public postMessage() {
        // Deliberately never respond to exercise timeout cleanup
      }
      public terminate() {
        terminated = true;
      }
    }

    Object.defineProperty(globalThis, "Worker", {
      value: HangingWorkerStub,
      configurable: true,
      writable: true,
    });
    URL.createObjectURL = vi.fn(() => "blob:bloumeid-worker-test");
    URL.revokeObjectURL = vi.fn((u: string) => {
      revokedUrl = u;
    });

    try {
      const probeResult = await runAntiSpoofProbes({
        canvas: collectCanvas(),
        audio: await collectAudio(),
        hardware: collectHardware(),
        webgl: collectWebGL(),
        languages: collectLanguages(),
        storage: await collectStorage(),
        timezoneIntl: collectTimezoneIntl(),
      });
      expect(probeResult.workerMismatch).toBe(false);
      expect(terminated).toBe(true);
      expect(revokedUrl).toBe("blob:bloumeid-worker-test");
    } finally {
      Object.defineProperty(globalThis, "Worker", {
        value: origWorker,
        configurable: true,
        writable: true,
      });
      URL.createObjectURL = origCreateObjectUrl;
      URL.revokeObjectURL = origRevokeObjectUrl;
    }

    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("Network offline"));

    const sdk = new BloumeID({
      apiKey: "bid_pub_offline_test",
      endpoint: "https://bloumeid.internal",
      options: { exclude: ["webrtc", "audio", "webgpu"], timeout: 0 },
    });
    const res = await sdk.get();
    expect(res.visitorId).toMatch(/^vis_local_/);
    expect(clearTimeoutSpy).toHaveBeenCalled();

    fetchSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });
});
