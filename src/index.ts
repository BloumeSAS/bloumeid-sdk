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
  base64UrlToBytes,
  bytesToBase64Url,
  computeAntiReplaySignature,
  deriveTransportAesKeyBytes,
  encryptFingerprintEnvelope,
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
  EncryptedFingerprintEnvelope,
  FingerprintComponents,
  FingerprintJSGetOptions,
  UserAgentDataComponent,
} from "./types";

export const SDK_VERSION = "1.3.1";

function normalizeVersionToken(raw: string): string {
  const parts = raw.split(".").filter((p) => /^\d+$/.test(p));
  if (parts.length === 0) return "0.0";
  if (parts.length === 1) return `${parts[0]}.0`;
  return `${parts[0]}.${parts[1]}`;
}

function parseBrowserAndOsClient(
  ua: string,
  uaData?: UserAgentDataComponent
): {
  browserName: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: string;
} {
  let browserName = "Unknown";
  let browserVersion = "0.0";
  const edg = ua.match(/Edg(?:A|iOS)?\/([\d.]+)/);
  const opr = ua.match(/(?:OPR|Opera)\/([\d.]+)/);
  const chr = ua.match(/(?:Chrome|CriOS)\/([\d.]+)/);
  const ff = ua.match(/(?:Firefox|FxiOS)\/([\d.]+)/);
  const saf = ua.match(/Version\/([\d.]+).*Safari/);
  if (edg) {
    browserName = "Edge";
    browserVersion = normalizeVersionToken(edg[1] ?? "0");
  } else if (opr) {
    browserName = "Opera";
    browserVersion = normalizeVersionToken(opr[1] ?? "0");
  } else if (chr) {
    browserName = "Chrome";
    browserVersion = normalizeVersionToken(chr[1] ?? "0");
  } else if (ff) {
    browserName = "Firefox";
    browserVersion = normalizeVersionToken(ff[1] ?? "0");
  } else if (saf) {
    browserName = "Safari";
    browserVersion = normalizeVersionToken(saf[1] ?? "0");
  }

  if (uaData?.brands && uaData.brands.length > 0) {
    const primaryBrand = uaData.brands.find(
      (b) => !/Not[;._ -]?A[;._ -]?Brand/i.test(b.brand) && !/^Chromium$/i.test(b.brand)
    ) ?? uaData.brands.find((b) => /Chromium/i.test(b.brand));
    if (primaryBrand?.version) {
      const brandMajor = primaryBrand.version.split(".")[0] ?? "";
      if (brandMajor && browserVersion.split(".")[0] !== brandMajor) {
        browserVersion = normalizeVersionToken(primaryBrand.version);
      }
      if (/Edge/i.test(primaryBrand.brand)) browserName = "Edge";
      else if (/Opera/i.test(primaryBrand.brand)) browserName = "Opera";
      else if (/Chrome/i.test(primaryBrand.brand)) browserName = "Chrome";
    }
  }

  let os = "Unknown OS";
  let osVersion = "";
  const win = ua.match(/Windows NT ([\d.]+)/);
  const mac = ua.match(/Mac OS X ([\d_]+)/);
  const andr = ua.match(/Android ([\d.]+)/);
  const ios = ua.match(/(?:iPhone|CPU) OS ([\d_]+)/);
  if (win || uaData?.platform === "Windows") {
    os = "Windows";
    const pvMajor = Number((uaData?.platformVersion ?? "").split(".")[0] ?? "0");
    if (Number.isFinite(pvMajor) && pvMajor >= 13) {
      osVersion = "11";
    } else if (Number.isFinite(pvMajor) && pvMajor >= 1) {
      osVersion = "10";
    } else {
      const nt = win?.[1] ?? "10.0";
      if (nt === "10.0") osVersion = "10";
      else if (nt === "6.3") osVersion = "8.1";
      else if (nt === "6.2") osVersion = "8";
      else if (nt === "6.1") osVersion = "7";
      else osVersion = nt;
    }
  } else if (ios) {
    os = "iOS";
    osVersion = (ios[1] ?? "").replace(/_/g, ".");
  } else if (mac || uaData?.platform === "macOS") {
    os = "macOS";
    osVersion = uaData?.platformVersion || (mac?.[1] ?? "").replace(/_/g, ".");
  } else if (andr || uaData?.platform === "Android") {
    os = "Android";
    osVersion = uaData?.platformVersion || (andr?.[1] ?? "");
  } else if (/Linux/i.test(ua) || uaData?.platform === "Linux") {
    os = "Linux";
    osVersion = uaData?.platformVersion || "";
  }

  const device = uaData?.mobile || /Mobi|Android|iPhone|iPad/i.test(ua) ? "Mobile" : "Desktop";
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
    this.cachedData = null;
    return this;
  }

  private isExcluded(name: CollectorName): boolean {
    return this.options.exclude.includes(name);
  }

  private cachedData: {
    expiresAt: number;
    data: {
      fullHash: string;
      hardwareHash: string;
      durationMs: number;
      collectorCount: number;
      signalsCount: number;
      components: FingerprintComponents;
    };
  } | null = null;

  private async withCollectorTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((resolve) => {
          timer = setTimeout(() => resolve(fallback), timeoutMs);
        }),
      ]);
    } catch {
      return fallback;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  public async getFingerprintData(): Promise<{
    fullHash: string;
    hardwareHash: string;
    durationMs: number;
    collectorCount: number;
    signalsCount: number;
    components: FingerprintComponents;
  }> {
    if (this.cachedData && this.cachedData.expiresAt > Date.now()) {
      return { ...this.cachedData.data, durationMs: 0 };
    }
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
        : this.withCollectorTimeout(collectWebGPU(), 300, {
            available: false,
            vendor: "timeout",
            architecture: "timeout",
            device: "timeout",
            description: "timeout",
            limitsHash: "timeout",
            features: [],
            maxTextureDimension2D: 0,
            maxBindGroups: 0,
          }),
      this.isExcluded("audio")
        ? Promise.resolve({
            available: false,
            sampleHash: "excluded",
            sumValue: 0,
            sampleRate: 0,
            maxChannelCount: 0,
            doubleRenderConsistent: true,
          })
        : this.withCollectorTimeout(collectAudio(), 300, {
            available: false,
            sampleHash: "timeout",
            sumValue: 0,
            sampleRate: 0,
            maxChannelCount: 0,
            doubleRenderConsistent: true,
          }),
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
        : this.withCollectorTimeout(collectWebRTC(), 300, {
            available: false,
            candidateTypes: [],
            localIpPresent: false,
            sdpFeedbackHash: "timeout",
          }),
      this.isExcluded("mediaCodecs")
        ? Promise.resolve(undefined)
        : this.withCollectorTimeout(collectMediaCodecs(), 300, undefined),
    ]);

    if (!this.isExcluded("hardware") && !this.isExcluded("userAgentData")) {
      const arch = userAgentData.architecture.toLowerCase();
      if (arch === "x86") {
        hardware.architectureHint = userAgentData.bitness === "32" ? "x86" : "x86_64";
      } else if (arch === "arm") {
        hardware.architectureHint = userAgentData.bitness === "64" ? "arm64" : "arm";
      }
    }

    const antiSpoof = this.isExcluded("antiSpoof")
      ? {
          isBot: false,
          isSpoofed: false,
          isIncognito: false,
          isVirtualMachine: false,
          isTorBrowser: false,
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
          mediaCodecs,
          speech,
          webrtc,
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

    const resultData = {
      fullHash,
      hardwareHash,
      durationMs,
      collectorCount: 104,
      signalsCount: 104,
      components,
    };

    if (this.options.cacheLifetimeMs > 0) {
      this.cachedData = {
        expiresAt: Date.now() + this.options.cacheLifetimeMs,
        data: resultData,
      };
    }

    return resultData;
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
    const uaParsed = parseBrowserAndOsClient(
      fpData.components.userAgentData.userAgent,
      fpData.components.userAgentData
    );

    if (this.apiKey && (this.endpoint || typeof window !== "undefined")) {
      const baseUrl = this.endpoint || "";
      const url = `${baseUrl}/api/v1/fingerprint`;
      const timestamp = Date.now();
      const nonce = generateNonce(24);
      const clientOrigin =
        typeof window !== "undefined" &&
        window.location?.origin &&
        window.location.origin !== "null"
          ? window.location.origin
          : "";

      const innerPayload: Record<string, unknown> = {
        fullHash: fpData.fullHash,
        hardwareHash: fpData.hardwareHash,
        durationMs: fpData.durationMs,
        ...(getOptions?.linkedId !== undefined ? { linkedId: getOptions.linkedId } : {}),
        ...(getOptions?.tag !== undefined ? { tag: getOptions.tag } : {}),
        components: fpData.components,
      };

      let wireEnvelope: EncryptedFingerprintEnvelope | AntiReplayEnvelope | null =
        await encryptFingerprintEnvelope({
          publicKey: this.apiKey,
          ts: timestamp,
          nonce,
          origin: clientOrigin,
          payload: innerPayload,
        }).catch(() => null);

      if (!wireEnvelope) {
        const signature = computeAntiReplaySignature(
          this.apiKey,
          timestamp,
          nonce,
          fpData.fullHash,
          fpData.hardwareHash
        );
        wireEnvelope = {
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
      }

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
          body: JSON.stringify(wireEnvelope),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (response.ok) {
          const rawServer = (await response.json()) as Partial<BloumeIDResult> & {
            visitorId: string;
            requestId: string;
          };
          const isoNowServer = new Date().toISOString();
          const normalizedResult: BloumeIDResult = {
            visitorId: rawServer.visitorId,
            thumbmark: rawServer.thumbmark ?? fpData.fullHash,
            hardwareHash: rawServer.hardwareHash ?? fpData.hardwareHash,
            requestId: rawServer.requestId,
            visitorFound: rawServer.visitorFound ?? false,
            confidence: rawServer.confidence ?? {
              score: 0.95,
              revision: SDK_VERSION,
              comment: `Deterministic fingerprint evaluation (v${SDK_VERSION})`,
            },
            incognito: rawServer.incognito ?? fpData.components.antiSpoof.isIncognito,
            browserName: rawServer.browserName ?? uaParsed.browserName,
            browserVersion: rawServer.browserVersion ?? uaParsed.browserVersion,
            os: rawServer.os ?? uaParsed.os,
            osVersion: rawServer.osVersion ?? uaParsed.osVersion,
            device: rawServer.device ?? uaParsed.device,
            ip: rawServer.ip ?? "",
            ipLocation: rawServer.ipLocation ?? {
              city: { name: null },
              country: { code: null, name: null },
              latitude: null,
              longitude: null,
              asn: { asn: null, name: null },
            },
            firstSeenAt: rawServer.firstSeenAt ?? { global: isoNowServer, subscription: isoNowServer },
            lastSeenAt: rawServer.lastSeenAt ?? { global: isoNowServer, subscription: isoNowServer },
            linkedId: rawServer.linkedId ?? getOptions?.linkedId ?? null,
            tag: rawServer.tag ?? getOptions?.tag ?? null,
            sealedResult: rawServer.sealedResult ?? null,
            components: rawServer.components ?? fpData.components,
            info: rawServer.info ?? {
              dangerLevel: 0,
              isBot: false,
              isSpoofed: false,
              isIncognito: fpData.components.antiSpoof.isIncognito,
              isVpn: false,
              isTor: Boolean(fpData.components.antiSpoof.isTorBrowser),
              isDatacenter: false,
              isProxy: false,
              isVirtualMachine: fpData.components.antiSpoof.isVirtualMachine,
              crossBrowserMatched: false,
              durationMs: fpData.durationMs,
              collectorCount: fpData.collectorCount,
            },
          };

          if (this.options.cacheLifetimeMs > 0) {
            this.cachedResult = {
              expiresAt: Date.now() + this.options.cacheLifetimeMs,
              result: normalizedResult,
            };
          }
          return normalizedResult;
        }
      } catch {
        // Fallback to local deterministic evaluation when offline or standalone
      }
    }

    const isTorBrowserLocal = Boolean(fpData.components.antiSpoof.isTorBrowser);
    const localDanger = Math.max(
      isTorBrowserLocal ? (fpData.components.antiSpoof.isSpoofed ? 5 : 4) : 0,
      (fpData.components.antiSpoof.isBot ? 3 : 0) +
        (fpData.components.antiSpoof.isSpoofed ? 2 : 0)
    );
    const isoNow = new Date().toISOString();

    const localResult: BloumeIDResult = {
      visitorId: `vis_local_${fpData.hardwareHash.slice(0, 16)}`,
      thumbmark: fpData.fullHash,
      hardwareHash: fpData.hardwareHash,
      requestId: `req_local_${generateNonce(16)}`,
      visitorFound: false,
      confidence: {
        score: fpData.components.antiSpoof.isSpoofed ? 0.72 : 0.95,
        revision: SDK_VERSION,
        comment: `Local deterministic evaluation (v${SDK_VERSION})`,
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
      sealedResult: null,
      components: fpData.components,
      info: {
        dangerLevel: Math.min(5, localDanger),
        action: localDanger >= 4 ? "block" : localDanger >= 2 ? "challenge" : "allow",
        isBot: fpData.components.antiSpoof.isBot,
        isSpoofed: fpData.components.antiSpoof.isSpoofed,
        isIncognito: fpData.components.antiSpoof.isIncognito,
        isVpn: false,
        isTor: isTorBrowserLocal,
        isDatacenter: false,
        isProxy: false,
        isVirtualMachine: fpData.components.antiSpoof.isVirtualMachine,
        crossBrowserMatched: false,
        vpn: false,
        proxy: false,
        tor: isTorBrowserLocal,
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
  base64UrlToBytes,
  bytesToBase64Url,
  computeAntiReplaySignature,
  deriveTransportAesKeyBytes,
  encryptFingerprintEnvelope,
  generateNonce,
  hmacSha256Hex,
  sha256Hex,
  stableStringify,
};
export * from "./types";
export default BloumeID;
