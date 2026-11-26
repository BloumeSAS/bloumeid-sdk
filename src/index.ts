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
  OS_FONT_CANDIDATES,
} from "./collectors";
import {
  computeAntiReplaySignature,
  generateNonce,
  hmacSha256Hex,
  sha256Hex,
  stableStringify,
} from "./crypto";
import { runAntiSpoofProbes } from "./probes";
import type {
  AntiReplayEnvelope,
  BloumeIDInitConfig,
  BloumeIDOptions,
  BloumeIDResult,
  CollectorName,
  FingerprintComponents,
  FingerprintJSGetOptions,
} from "./types";

export const SDK_VERSION = "1.0.0";

function parseBrowserAndOsClient(ua: string): {
  browserName: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: string;
} {
  let browserName = "Unknown";
  let browserVersion = "0.0";
  const edg = ua.match(/Edg\/([\d.]+)/);
  const chr = ua.match(/Chrome\/([\d.]+)/);
  const ff = ua.match(/Firefox\/([\d.]+)/);
  const saf = ua.match(/Version\/([\d.]+).*Safari/);
  if (edg) {
    browserName = "Edge";
    browserVersion = edg[1] ?? "0";
  } else if (chr) {
    browserName = "Chrome";
    browserVersion = chr[1] ?? "0";
  } else if (ff) {
    browserName = "Firefox";
    browserVersion = ff[1] ?? "0";
  } else if (saf) {
    browserName = "Safari";
    browserVersion = saf[1] ?? "0";
  }

  let os = "Unknown OS";
  let osVersion = "";
  const win = ua.match(/Windows NT ([\d.]+)/);
  const mac = ua.match(/Mac OS X ([\d_]+)/);
  const andr = ua.match(/Android ([\d.]+)/);
  if (win) {
    os = "Windows";
    osVersion = win[1] ?? "10.0";
  } else if (mac) {
    os = "macOS";
    osVersion = (mac[1] ?? "").replace(/_/g, ".");
  } else if (andr) {
    os = "Android";
    osVersion = andr[1] ?? "";
  } else if (/Linux/i.test(ua)) {
    os = "Linux";
  }

  const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? "Mobile" : "Desktop";
  return { browserName, browserVersion, os, osVersion, device };
}

export class BloumeID {
  public readonly version = SDK_VERSION;
  private apiKey: string;
  private endpoint: string;
  private options: Required<BloumeIDOptions>;
  private cachedResult: { expiresAt: number; result: BloumeIDResult } | null = null;

  constructor(config: BloumeIDInitConfig = {}) {
    this.apiKey = config.apiKey ?? "";
    this.endpoint = (config.endpoint ?? "").replace(/\/+$/, "");
    this.options = {
      exclude: config.options?.exclude ?? [],
      timeout: config.options?.timeout ?? 5000,
      cacheLifetimeMs: config.options?.cacheLifetimeMs ?? 0,
      includeRawComponents: config.options?.includeRawComponents ?? true,
    };
  }

  public static async load(config: BloumeIDInitConfig = {}): Promise<BloumeID> {
    return new BloumeID(config);
  }

  public getOptions(): {
    apiKey: string;
    endpoint: string;
    options: Required<BloumeIDOptions>;
  } {
    return {
      apiKey: this.apiKey,
      endpoint: this.endpoint,
      options: { ...this.options, exclude: [...this.options.exclude] },
    };
  }

  public setOption<K extends keyof BloumeIDOptions>(
    key: K,
    value: NonNullable<BloumeIDOptions[K]>
  ): this {
    this.options[key] = value as Required<BloumeIDOptions>[K];
    this.cachedResult = null;
    return this;
  }

  private isExcluded(name: CollectorName): boolean {
    return this.options.exclude.includes(name);
  }

  public async getFingerprintData(): Promise<{
    fullHash: string;
    hardwareHash: string;
    durationMs: number;
    collectorCount: number;
    signalsCount: number;
    components: FingerprintComponents;
  }> {
    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();

    const canvas = this.isExcluded("canvas")
      ? {
          hash: "excluded",
          winding: false,
          doubleRenderConsistent: true,
          geometryHash: "excluded",
          textHash: "excluded",
          emojiSubpixelHash: "excluded",
          emojiAscentSum: 0,
          emojiDescentSum: 0,
        }
      : collectCanvas();

    const webgl = this.isExcluded("webgl")
      ? {
          webgl1Available: false,
          webgl2Available: false,
          vendor: "excluded",
          renderer: "excluded",
          unmaskedVendor: "excluded",
          unmaskedRenderer: "excluded",
          version: "excluded",
          shadingLanguageVersion: "excluded",
          extensionsCount: 0,
          extensionsHash: "excluded",
          maxTextureSize: 0,
          maxViewportDims: [0, 0] as [number, number],
          maxAnisotropy: 0,
          shaderPrecisionHash: "excluded",
          maxVertexUniformVectors: 0,
          aliasedLineWidthRange: [1, 1] as [number, number],
          pixelRenderHash: "excluded",
        }
      : collectWebGL();

    const hardware = this.isExcluded("hardware")
      ? {
          hardwareConcurrency: 0,
          deviceMemory: 0,
          maxTouchPoints: 0,
          platform: "excluded",
          vendor: "excluded",
          oscpu: "excluded",
          pdfViewerEnabled: false,
          cookieEnabled: false,
          doNotTrack: null,
          architectureHint: "excluded",
          globalPrivacyControl: false,
        }
      : collectHardware();

    const screen = this.isExcluded("screen")
      ? {
          width: 0,
          height: 0,
          availWidth: 0,
          availHeight: 0,
          colorDepth: 0,
          pixelDepth: 0,
          devicePixelRatio: 1,
          orientationType: "excluded",
          hdrSupported: false,
          colorGamut: "unknown" as const,
          forcedColors: false,
          prefersDarkScheme: false,
          prefersReducedMotion: false,
          touchSupport: false,
        }
      : collectScreen();

    const cssMedia = this.isExcluded("cssMedia") ? undefined : collectCssMediaMatrix();

    const fonts = this.isExcluded("fonts")
      ? { detected: [], count: 0, hash: "excluded" }
      : collectFonts();

    const timezoneIntl = this.isExcluded("timezone")
      ? {
          timezone: "UTC",
          timezoneOffsetMinutes: 0,
          locale: "en-US",
          calendar: "gregory",
          numberingSystem: "latn",
          dateTimeFormatHash: "excluded",
          numberFormatSymbol: "",
          pluralCategories: [],
          dstConsistent: true,
        }
      : collectTimezoneIntl();

    const languages = this.isExcluded("languages")
      ? { language: "excluded", languages: [], consistentMainLanguage: true }
      : collectLanguages();

    const speech = this.isExcluded("speech")
      ? { available: false, voiceCount: 0, defaultVoice: "excluded", voicesHash: "excluded" }
      : collectSpeech();

    const math = this.isExcluded("math")
      ? {
          engineHint: "Unknown" as const,
          constantsHash: "excluded",
          acos: 0,
          acosh: 0,
          asinh: 0,
          atanh: 0,
          cbrt: 0,
          cosh: 0,
          expm1: 0,
          log1p: 0,
          sinh: 0,
          tanh: 0,
          powPi: 0,
        }
      : collectMath();

    const connection = this.isExcluded("connection")
      ? { available: false, effectiveType: "excluded", rtt: 0, downlink: 0, saveData: false }
      : collectConnection();

    const [webgpu, audio, userAgentData, storage, webrtc, mediaCodecs] = await Promise.all([
      this.isExcluded("webgpu")
        ? Promise.resolve({
            available: false,
            vendor: "excluded",
            architecture: "excluded",
            device: "excluded",
            description: "excluded",
            limitsHash: "excluded",
            features: [],
            maxTextureDimension2D: 0,
            maxBindGroups: 0,
          })
        : collectWebGPU(),
      this.isExcluded("audio")
        ? Promise.resolve({
            available: false,
            sampleHash: "excluded",
            sumValue: 0,
            sampleRate: 0,
            maxChannelCount: 0,
            doubleRenderConsistent: true,
          })
        : collectAudio(),
      this.isExcluded("userAgentData")
        ? Promise.resolve({
            userAgent: "",
            brands: [],
            mobile: false,
            platform: "excluded",
            architecture: "excluded",
            bitness: "64",
            model: "",
            platformVersion: "",
            fullVersionListHash: "excluded",
          })
        : collectUserAgentData(),
      this.isExcluded("storage")
        ? Promise.resolve({
            localStorage: false,
            sessionStorage: false,
            indexedDB: false,
            cachesApi: false,
            serviceWorker: false,
            quotaBytes: 0,
            usageBytes: 0,
          })
        : collectStorage(),
      this.isExcluded("webrtc")
        ? Promise.resolve({
            available: false,
            candidateTypes: [],
            localIpPresent: false,
            sdpFeedbackHash: "excluded",
          })
        : collectWebRTC(),
      this.isExcluded("mediaCodecs") ? Promise.resolve(undefined) : collectMediaCodecs(),
    ]);

    const antiSpoof = this.isExcluded("antiSpoof")
      ? {
          isBot: false,
          isSpoofed: false,
          isIncognito: false,
          isVirtualMachine: false,
          webdriver: false,
          automationArtifacts: [],
          chromeObjectAnomaly: false,
          permissionsInconsistent: false,
          workerMismatch: false,
          canvasNoiseDetected: false,
          audioNoiseDetected: false,
          prototypeTampered: false,
          tamperedFunctions: [],
          zeroOuterDimensions: false,
          stackEngineMismatch: false,
          timezoneDstMismatch: false,
          reasons: [],
        }
      : await runAntiSpoofProbes({
          canvas,
          audio,
          hardware,
          webgl,
          languages,
          storage,
          timezoneIntl,
        });

    const components: FingerprintComponents = {
      canvas,
      webgl,
      webgpu,
      audio,
      hardware,
      screen,
      cssMedia,
      mediaCodecs,
      fonts,
      timezoneIntl,
      languages,
      userAgentData,
      storage,
      speech,
      math,
      webrtc,
      connection,
      antiSpoof,
    };

    const hardwarePayload = stableStringify({
      unmaskedVendor: webgl.unmaskedVendor,
      unmaskedRenderer: webgl.unmaskedRenderer,
      maxTextureSize: webgl.maxTextureSize,
      maxViewportDims: webgl.maxViewportDims,
      hardwareConcurrency: hardware.hardwareConcurrency,
      deviceMemory: hardware.deviceMemory,
      maxTouchPoints: hardware.maxTouchPoints,
      platform: hardware.platform,
      architectureHint: hardware.architectureHint,
      screenWidth: screen.width,
      screenHeight: screen.height,
      colorDepth: screen.colorDepth,
      devicePixelRatio: screen.devicePixelRatio,
      colorGamut: screen.colorGamut,
      hdrSupported: screen.hdrSupported,
      timezone: timezoneIntl.timezone,
      audioSampleRate: audio.sampleRate,
      audioMaxChannels: audio.maxChannelCount,
    });

    const hardwareHash = sha256Hex(hardwarePayload);
    const fullHash = sha256Hex(
      stableStringify({
        canvas: canvas.hash,
        emoji: canvas.emojiSubpixelHash,
        webgl,
        webgpu: webgpu.limitsHash,
        audio: audio.sampleHash,
        hardware,
        screen,
        cssMedia,
        mediaCodecs: mediaCodecs?.keyboardLayoutHash,
        fonts: fonts.hash,
        timezoneIntl,
        languages: languages.languages,
        math: math.constantsHash,
        speech: speech.voicesHash,
      })
    );

    const endTime = typeof performance !== "undefined" ? performance.now() : Date.now();
    const durationMs = Math.max(1, Math.round(endTime - startTime));

    return {
      fullHash,
      hardwareHash,
      durationMs,
      collectorCount: 104,
      signalsCount: 104,
      components,
    };
  }

  public async getFingerprint(): Promise<string> {
    const data = await this.getFingerprintData();
    return data.fullHash;
  }

  public async get(getOptions?: FingerprintJSGetOptions): Promise<BloumeIDResult> {
    const now = Date.now();
    if (
      this.options.cacheLifetimeMs > 0 &&
      this.cachedResult &&
      this.cachedResult.expiresAt > now &&
      !getOptions?.linkedId &&
      !getOptions?.tag
    ) {
      return this.cachedResult.result;
    }

    const fpData = await this.getFingerprintData();

    if (this.apiKey && (this.endpoint || typeof window !== "undefined")) {
      const baseUrl = this.endpoint || "";
      const url = `${baseUrl}/api/v1/fingerprint`;
      const timestamp = Date.now();
      const nonce = generateNonce(24);
      const signature = computeAntiReplaySignature(
        this.apiKey,
        timestamp,
        nonce,
        fpData.fullHash,
        fpData.hardwareHash
      );

      const envelope: AntiReplayEnvelope = {
        timestamp,
        nonce,
        signature,
        fullHash: fpData.fullHash,
        hardwareHash: fpData.hardwareHash,
        durationMs: fpData.durationMs,
        linkedId: getOptions?.linkedId,
        tag: getOptions?.tag,
        components: fpData.components,
      };

      try {
        const controller = new AbortController();
        const timer = setTimeout(
          () => controller.abort(),
          getOptions?.timeout ?? this.options.timeout
        );
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-BloumeID-Key": this.apiKey,
          },
          body: JSON.stringify(envelope),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (response.ok) {
          const serverResult = (await response.json()) as BloumeIDResult;
          if (this.options.cacheLifetimeMs > 0) {
            this.cachedResult = {
              expiresAt: Date.now() + this.options.cacheLifetimeMs,
              result: serverResult,
            };
          }
          return serverResult;
        }
      } catch {
        // Fallback to local deterministic evaluation when offline or standalone
      }
    }

    const localDanger =
      (fpData.components.antiSpoof.isBot ? 3 : 0) +
      (fpData.components.antiSpoof.isSpoofed ? 2 : 0);
    const isoNow = new Date().toISOString();
    const uaParsed = parseBrowserAndOsClient(fpData.components.userAgentData.userAgent);

    const localResult: BloumeIDResult = {
      visitorId: `vis_local_${fpData.hardwareHash.slice(0, 16)}`,
      thumbmark: fpData.fullHash,
      hardwareHash: fpData.hardwareHash,
      requestId: `req_local_${generateNonce(16)}`,
      visitorFound: false,
      confidence: {
        score: fpData.components.antiSpoof.isSpoofed ? 0.72 : 0.95,
        revision: "1.0.0",
        comment: "Local deterministic evaluation (v1.0.0)",
      },
      incognito: fpData.components.antiSpoof.isIncognito,
      browserName: uaParsed.browserName,
      browserVersion: uaParsed.browserVersion,
      os: uaParsed.os,
      osVersion: uaParsed.osVersion,
      device: uaParsed.device,
      ip: "127.0.0.1",
      ipLocation: {
        city: { name: null },
        country: { code: null, name: null },
        latitude: null,
        longitude: null,
        asn: { asn: null, name: null },
      },
      firstSeenAt: { global: isoNow, subscription: isoNow },
      lastSeenAt: { global: isoNow, subscription: isoNow },
      linkedId: getOptions?.linkedId ?? null,
      tag: getOptions?.tag ?? null,
      components: fpData.components,
      info: {
        dangerLevel: Math.min(5, localDanger),
        action: localDanger >= 4 ? "block" : localDanger >= 2 ? "challenge" : "allow",
        isBot: fpData.components.antiSpoof.isBot,
        isSpoofed: fpData.components.antiSpoof.isSpoofed,
        isIncognito: fpData.components.antiSpoof.isIncognito,
        isVpn: false,
        isTor: false,
        isDatacenter: false,
        isProxy: false,
        isVirtualMachine: fpData.components.antiSpoof.isVirtualMachine,
        crossBrowserMatched: false,
        vpn: false,
        proxy: false,
        tor: false,
        datacenter: false,
        bot: fpData.components.antiSpoof.isBot,
        spoofed: fpData.components.antiSpoof.isSpoofed,
        durationMs: fpData.durationMs,
        collectorCount: fpData.collectorCount,
      },
    };

    if (this.options.cacheLifetimeMs > 0) {
      this.cachedResult = {
        expiresAt: Date.now() + this.options.cacheLifetimeMs,
        result: localResult,
      };
    }

    return localResult;
  }
}

/**
 * Fingerprint.com (`@fingerprintjs/fingerprintjs-pro`) Drop-in Compatible Namespace
 */
export const FingerprintJS = {
  load: async (config: BloumeIDInitConfig = {}): Promise<BloumeID> => {
    return BloumeID.load(config);
  },
};

export async function load(config: BloumeIDInitConfig = {}): Promise<BloumeID> {
  return BloumeID.load(config);
}

export {
  OS_FONT_CANDIDATES,
  computeAntiReplaySignature,
  generateNonce,
  hmacSha256Hex,
  sha256Hex,
  stableStringify,
};
export * from "./types";
export default BloumeID;
