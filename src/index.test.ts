import { describe, expect, it, vi } from "vitest";
import {
  BloumeID,
  FingerprintJS,
  load,
  OS_FONT_CANDIDATES,
  SDK_VERSION,
  computeAntiReplaySignature,
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
  it("reports v1.0.0 and instantiates with default and custom options", () => {
    expect(SDK_VERSION).toBe("1.0.0");
    const client = new BloumeID({
      apiKey: "bid_pub_test123",
      endpoint: "https://id.bloume.example/",
      options: { exclude: ["webrtc"], timeout: 4000, cacheLifetimeMs: 1000 },
    });
    expect(client.version).toBe("1.0.0");
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
    expect(fpResult.confidence.revision).toBe("1.0.0");
    expect(fpResult.linkedId).toBe("acct_999");
    expect(fpResult.tag).toEqual({ flow: "signup" });
    expect(fpResult.info.collectorCount).toBeGreaterThanOrEqual(70);
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

  it("sends anti-replay signed payload to endpoint when apiKey and endpoint are configured", async () => {
    const mockServerResult = {
      visitorId: "vis_72819283719283712",
      thumbmark: "a".repeat(64),
      hardwareHash: "b".repeat(64),
      requestId: "req_72819283719283713",
      visitorFound: true,
      confidence: { score: 0.99, revision: "1.0.0" },
      incognito: false,
      browserName: "Chrome",
      browserVersion: "131.0",
      os: "Linux",
      osVersion: "",
      device: "Desktop",
      ip: "127.0.0.1",
      ipLocation: {},
      firstSeenAt: { global: null, subscription: null },
      lastSeenAt: { global: null, subscription: null },
      components: {} as never,
      info: {
        dangerLevel: 0,
        action: "allow",
        isBot: false,
        isSpoofed: false,
        isIncognito: false,
        isVpn: false,
        isTor: false,
        isDatacenter: false,
        isProxy: false,
        crossBrowserMatched: false,
        durationMs: 12,
        collectorCount: 72,
      },
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockServerResult), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const sdk = new BloumeID({
      apiKey: "bid_pub_livekey",
      endpoint: "https://bloumeid.internal",
      options: { exclude: ["webrtc", "audio", "webgpu"], cacheLifetimeMs: 1000 },
    });

    const res = await sdk.get({ linkedId: "user_1" });
    expect(res.visitorId).toBe("vis_72819283719283712");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it("validates BloumeIDServer verifyRequest and getVisitor methods", async () => {
    expect(() => new BloumeIDServer({ secretKey: "invalid" })).toThrow();

    const server = new BloumeIDServer({
      secretKey: "bid_sec_valid_secret_key",
      endpoint: "https://bloumeid.internal/",
    });

    await expect(server.verifyRequest("bad_id")).rejects.toThrow();
    await expect(server.getVisitor("bad_vis")).rejects.toThrow();

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
});
