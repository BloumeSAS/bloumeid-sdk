export type CollectorName =
  | "canvas"
  | "webgl"
  | "webgpu"
  | "audio"
  | "hardware"
  | "screen"
  | "cssMedia"
  | "mediaCodecs"
  | "fonts"
  | "timezone"
  | "intl"
  | "languages"
  | "userAgentData"
  | "storage"
  | "speech"
  | "math"
  | "webrtc"
  | "connection"
  | "media"
  | "permissions"
  | "antiSpoof"
  | "privateMode";

export interface BloumeIDOptions {
  exclude?: CollectorName[];
  timeout?: number;
  cacheLifetimeMs?: number;
  includeRawComponents?: boolean;
}

export interface BloumeIDInitConfig {
  apiKey?: string;
  endpoint?: string;
  region?: "eu" | "us" | "ap" | "global";
  options?: BloumeIDOptions;
}

export interface FingerprintJSGetOptions {
  extendedResult?: boolean;
  linkedId?: string;
  tag?: Record<string, unknown> | string;
  timeout?: number;
}

export interface CanvasComponent {
  hash: string;
  winding: boolean;
  doubleRenderConsistent: boolean;
  geometryHash: string;
  textHash: string;
  emojiSubpixelHash?: string;
  emojiAscentSum?: number;
  emojiDescentSum?: number;
}

export interface WebGLComponent {
  webgl1Available: boolean;
  webgl2Available: boolean;
  vendor: string;
  renderer: string;
  unmaskedVendor: string;
  unmaskedRenderer: string;
  version: string;
  shadingLanguageVersion: string;
  extensionsCount: number;
  extensionsHash: string;
  maxTextureSize: number;
  maxViewportDims: [number, number];
  maxAnisotropy: number;
  shaderPrecisionHash: string;
  maxVertexUniformVectors?: number;
  aliasedLineWidthRange?: [number, number];
  pixelRenderHash?: string;
}

export interface WebGPUComponent {
  available: boolean;
  vendor: string;
  architecture: string;
  device: string;
  description: string;
  limitsHash: string;
  features?: string[];
  maxTextureDimension2D?: number;
  maxBindGroups?: number;
}

export interface AudioComponent {
  available: boolean;
  sampleHash: string;
  sumValue: number;
  sampleRate: number;
  maxChannelCount: number;
  doubleRenderConsistent: boolean;
}

export interface HardwareComponent {
  hardwareConcurrency: number;
  deviceMemory: number;
  maxTouchPoints: number;
  platform: string;
  vendor: string;
  oscpu: string;
  pdfViewerEnabled: boolean;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  architectureHint: string;
  globalPrivacyControl?: boolean;
}

export interface ScreenComponent {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelDepth: number;
  devicePixelRatio: number;
  orientationType: string;
  hdrSupported: boolean;
  colorGamut: "rec2020" | "p3" | "srgb" | "unknown";
  forcedColors: boolean;
  prefersDarkScheme: boolean;
  prefersReducedMotion: boolean;
  touchSupport: boolean;
}

export interface CssMediaMatrixComponent {
  prefersColorScheme: "dark" | "light" | "no-preference";
  prefersReducedMotion: boolean;
  prefersContrast: "more" | "less" | "no-preference";
  forcedColors: boolean;
  dynamicRangeHigh: boolean;
  colorGamut: "rec2020" | "p3" | "srgb" | "unknown";
  anyPointer: "fine" | "coarse" | "none";
  anyHover: boolean;
  invertedColors: boolean;
  monochrome: boolean;
}

export interface MediaCodecsComponent {
  audioInputCount: number;
  videoInputCount: number;
  audioOutputCount: number;
  av1Supported: boolean;
  hevcSupported: boolean;
  vp9Supported: boolean;
  opusSupported: boolean;
  flacSupported: boolean;
  keyboardLayoutHash: string;
  keyboardKeysCount: number;
}

export interface FontsComponent {
  detected: string[];
  count: number;
  hash: string;
}

export interface TimezoneIntlComponent {
  timezone: string;
  timezoneOffsetMinutes: number;
  locale: string;
  calendar: string;
  numberingSystem: string;
  dateTimeFormatHash: string;
  numberFormatSymbol: string;
  pluralCategories: string[];
  dstConsistent?: boolean;
}

export interface LanguagesComponent {
  language: string;
  languages: string[];
  consistentMainLanguage: boolean;
}

export interface UserAgentDataComponent {
  userAgent: string;
  brands: Array<{ brand: string; version: string }>;
  mobile: boolean;
  platform: string;
  architecture: string;
  bitness: string;
  model: string;
  platformVersion: string;
  fullVersionListHash: string;
}

export interface StorageComponent {
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  cachesApi: boolean;
  serviceWorker: boolean;
  quotaBytes: number;
  usageBytes: number;
}

export interface SpeechComponent {
  available: boolean;
  voiceCount: number;
  defaultVoice: string;
  voicesHash: string;
}

export interface MathComponent {
  engineHint: "V8" | "SpiderMonkey" | "JavaScriptCore" | "Unknown";
  constantsHash: string;
  acos: number;
  acosh: number;
  asinh: number;
  atanh: number;
  cbrt: number;
  cosh: number;
  expm1: number;
  log1p: number;
  sinh: number;
  tanh: number;
  powPi: number;
}

export interface WebRTCComponent {
  available: boolean;
  candidateTypes: string[];
  localIpPresent: boolean;
  sdpFeedbackHash: string;
}

export interface ConnectionComponent {
  available: boolean;
  effectiveType: string;
  rtt: number;
  downlink: number;
  saveData: boolean;
}

export interface AntiSpoofComponent {
  isBot: boolean;
  isSpoofed: boolean;
  isIncognito: boolean;
  isVirtualMachine?: boolean;
  webdriver: boolean;
  automationArtifacts: string[];
  chromeObjectAnomaly: boolean;
  permissionsInconsistent: boolean;
  workerMismatch: boolean;
  canvasNoiseDetected: boolean;
  audioNoiseDetected: boolean;
  prototypeTampered?: boolean;
  tamperedFunctions?: string[];
  zeroOuterDimensions?: boolean;
  stackEngineMismatch?: boolean;
  timezoneDstMismatch?: boolean;
  isTorBrowser?: boolean;
  reasons: string[];
}

export interface FingerprintComponents {
  canvas: CanvasComponent;
  webgl: WebGLComponent;
  webgpu: WebGPUComponent;
  audio: AudioComponent;
  hardware: HardwareComponent;
  screen: ScreenComponent;
  cssMedia?: CssMediaMatrixComponent;
  mediaCodecs?: MediaCodecsComponent;
  fonts: FontsComponent;
  timezoneIntl: TimezoneIntlComponent;
  languages: LanguagesComponent;
  userAgentData: UserAgentDataComponent;
  storage: StorageComponent;
  speech: SpeechComponent;
  math: MathComponent;
  webrtc: WebRTCComponent;
  connection: ConnectionComponent;
  antiSpoof: AntiSpoofComponent;
}

export type SecurityRuleAction = "allow" | "challenge" | "block" | "flag";

export interface FingerprintThreatInfo {
  dangerLevel: number;
  action?: SecurityRuleAction;
  matchedRuleId?: string | null;
  isBot: boolean;
  isSpoofed: boolean;
  isIncognito: boolean;
  isVpn: boolean;
  isTor: boolean;
  isDatacenter: boolean;
  isProxy: boolean;
  isVirtualMachine?: boolean;
  crossBrowserMatched: boolean;
  // ThumbmarkJS Pro alias booleans
  vpn?: boolean;
  proxy?: boolean;
  tor?: boolean;
  datacenter?: boolean;
  bot?: boolean;
  spoofed?: boolean;
  ipAddress?: string;
  asnNumber?: number | null;
  asnOrg?: string | null;
  country?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  durationMs: number;
  collectorCount: number;
}

export interface FingerprintProIpLocation {
  city?: { name: string | null };
  country?: { code: string | null; name: string | null };
  latitude?: number | null;
  longitude?: number | null;
  asn?: { asn: string | null; name: string | null };
}

export interface FingerprintProSeenTimestamp {
  global: string | null;
  subscription: string | null;
}

/**
 * Unified Dual-API Result supporting 100% of ThumbmarkJS Pro and Fingerprint.com (FingerprintJS Pro) schemas.
 */
export interface BloumeIDResult {
  visitorId: string;
  thumbmark: string;
  hardwareHash: string;
  requestId: string;
  visitorFound: boolean;
  confidence: {
    score: number;
    revision?: string;
    comment?: string;
  };
  incognito: boolean;
  browserName: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: string;
  ip: string;
  ipLocation: FingerprintProIpLocation;
  firstSeenAt: FingerprintProSeenTimestamp;
  lastSeenAt: FingerprintProSeenTimestamp;
  linkedId?: string | null;
  tag?: Record<string, unknown> | string | null;
  sealedResult?: string | null;
  components: FingerprintComponents;
  info: FingerprintThreatInfo;
}

export interface AntiReplayEnvelope {
  timestamp: number;
  nonce: string;
  signature: string;
  fullHash: string;
  hardwareHash: string;
  durationMs: number;
  linkedId?: string;
  tag?: Record<string, unknown> | string;
  components: FingerprintComponents;
}

export interface EncryptedFingerprintEnvelope {
  v: 2;
  ts: number;
  nonce: string;
  iv: string;
  ciphertext: string;
}
