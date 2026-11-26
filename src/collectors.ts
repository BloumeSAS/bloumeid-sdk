import { sha256Hex, stableStringify } from "./crypto";
import type {
  AudioComponent,
  CanvasComponent,
  ConnectionComponent,
  CssMediaMatrixComponent,
  FontsComponent,
  HardwareComponent,
  LanguagesComponent,
  MathComponent,
  MediaCodecsComponent,
  ScreenComponent,
  SpeechComponent,
  StorageComponent,
  TimezoneIntlComponent,
  UserAgentDataComponent,
  WebGLComponent,
  WebGPUComponent,
  WebRTCComponent,
} from "./types";

export const OS_FONT_CANDIDATES: readonly string[] = [
  "Arial",
  "Arial Black",
  "Arial Narrow",
  "Arial Rounded MT Bold",
  "Avenir",
  "Avenir Next",
  "Baskerville",
  "Bitstream Vera Sans Mono",
  "Book Antiqua",
  "Bookman Old Style",
  "Calibri",
  "Cambria",
  "Cambria Math",
  "Candara",
  "Century",
  "Century Gothic",
  "Century Schoolbook",
  "Cochin",
  "Comic Sans MS",
  "Consolas",
  "Constantia",
  "Copperplate",
  "Corbel",
  "Courier",
  "Courier New",
  "DejaVu Sans",
  "DejaVu Sans Mono",
  "DejaVu Serif",
  "Didot",
  "Ebrima",
  "Franklin Gothic Medium",
  "Futura",
  "Gabriola",
  "Gadugi",
  "Garamond",
  "Geneva",
  "Georgia",
  "Gill Sans",
  "Helvetica",
  "Helvetica Neue",
  "Hiragino Kaku Gothic ProN",
  "Hiragino Sans",
  "Impact",
  "Inconsolata",
  "Inter",
  "JetBrains Mono",
  "Leelawadee UI",
  "Liberation Mono",
  "Liberation Sans",
  "Lucida Bright",
  "Lucida Console",
  "Lucida Grande",
  "Lucida Sans Unicode",
  "Malgun Gothic",
  "Meiryo",
  "Menlo",
  "Microsoft Himalaya",
  "Microsoft JhengHei",
  "Microsoft New Tai Lue",
  "Microsoft PhagsPa",
  "Microsoft Sans Serif",
  "Microsoft Tai Le",
  "Microsoft YaHei",
  "Microsoft Yi Baiti",
  "Monaco",
  "Mongolian Baiti",
  "MS Gothic",
  "MS PGothic",
  "MS UI Gothic",
  "MV Boli",
  "Myanmar Text",
  "Nirmala UI",
  "Noto Sans",
  "Optima",
  "Palatino",
  "Palatino Linotype",
  "Roboto",
  "Segoe Print",
  "Segoe Script",
  "Segoe UI",
  "Segoe UI Emoji",
  "Segoe UI Historic",
  "Segoe UI Symbol",
  "SF Pro Display",
  "SimSun",
  "Sitka Text",
  "Sylfaen",
  "Tahoma",
  "Times",
  "Times New Roman",
  "Trebuchet MS",
  "Ubuntu",
  "Verdana",
  "Yu Gothic",
];

const UNICODE_EMOJI_PROBES = ["🇺🇳", "👨‍👩‍👧‍👦", "﷽", "🏴‍☠️", "🧘🏽‍♂️"] as const;

function renderCanvasScene(canvas: HTMLCanvasElement): {
  dataUrl: string;
  geometryData: string;
  textData: string;
  winding: boolean;
  emojiSubpixelHash: string;
  emojiAscentSum: number;
  emojiDescentSum: number;
} {
  canvas.width = 280;
  canvas.height = 70;
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext("2d");
  } catch {
    ctx = null;
  }
  if (!ctx) {
    return {
      dataUrl: "no_ctx",
      geometryData: "no_ctx",
      textData: "no_ctx",
      winding: false,
      emojiSubpixelHash: sha256Hex("no_ctx"),
      emojiAscentSum: 0,
      emojiDescentSum: 0,
    };
  }

  ctx.rect(0, 0, 10, 10);
  ctx.rect(2, 2, 6, 6);
  const winding = !ctx.isPointInPath(5, 5, "evenodd");

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#5b21b6";
  ctx.fillRect(100, 2, 82, 24);
  ctx.fillStyle = "#38bdf8";
  ctx.font = "14px 'Arial'";
  ctx.fillText("BloumeID-v1.0.0 🚀✨", 4, 18);
  ctx.fillStyle = "rgba(167, 139, 250, 0.75)";
  ctx.font = "16pt Georgia";
  ctx.fillText("Cwm fjordbank glyphs vext quiz", 6, 44);
  const textData = canvas.toDataURL();

  // Unicode & Emoji Subpixel TextMetrics probe
  let emojiAscentSum = 0;
  let emojiDescentSum = 0;
  const emojiMetricsList: string[] = [];
  ctx.font = "20px sans-serif";
  for (const glyph of UNICODE_EMOJI_PROBES) {
    const m = ctx.measureText(glyph);
    const asc = Number(m.actualBoundingBoxAscent ?? 0);
    const desc = Number(m.actualBoundingBoxDescent ?? 0);
    const w = Number(m.width ?? 0);
    emojiAscentSum += asc;
    emojiDescentSum += desc;
    emojiMetricsList.push(`${w.toFixed(4)}:${asc.toFixed(4)}:${desc.toFixed(4)}`);
  }

  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgb(255,0,255)";
  ctx.beginPath();
  ctx.arc(50, 50, 22, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgb(0,255,255)";
  ctx.beginPath();
  ctx.arc(75, 50, 22, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fill();
  const geometryData = canvas.toDataURL();

  return {
    dataUrl: geometryData,
    geometryData,
    textData,
    winding,
    emojiSubpixelHash: sha256Hex(emojiMetricsList.join("|")),
    emojiAscentSum: Number(emojiAscentSum.toFixed(4)),
    emojiDescentSum: Number(emojiDescentSum.toFixed(4)),
  };
}

export function collectCanvas(): CanvasComponent {
  if (typeof document === "undefined") {
    return {
      hash: sha256Hex("ssr_canvas"),
      winding: true,
      doubleRenderConsistent: true,
      geometryHash: sha256Hex("ssr_geo"),
      textHash: sha256Hex("ssr_text"),
      emojiSubpixelHash: sha256Hex("ssr_emoji"),
      emojiAscentSum: 0,
      emojiDescentSum: 0,
    };
  }
  try {
    const c1 = document.createElement("canvas");
    const c2 = document.createElement("canvas");
    const r1 = renderCanvasScene(c1);
    const r2 = renderCanvasScene(c2);
    const doubleRenderConsistent = r1.dataUrl === r2.dataUrl && r1.dataUrl.length > 5;
    return {
      hash: sha256Hex(r1.dataUrl),
      winding: r1.winding,
      doubleRenderConsistent,
      geometryHash: sha256Hex(r1.geometryData),
      textHash: sha256Hex(r1.textData),
      emojiSubpixelHash: r1.emojiSubpixelHash,
      emojiAscentSum: r1.emojiAscentSum,
      emojiDescentSum: r1.emojiDescentSum,
    };
  } catch {
    return {
      hash: sha256Hex("canvas_error"),
      winding: false,
      doubleRenderConsistent: true,
      geometryHash: sha256Hex("canvas_error"),
      textHash: sha256Hex("canvas_error"),
      emojiSubpixelHash: sha256Hex("canvas_error"),
      emojiAscentSum: 0,
      emojiDescentSum: 0,
    };
  }
}

export function collectWebGL(): WebGLComponent {
  if (typeof document === "undefined") {
    return {
      webgl1Available: false,
      webgl2Available: false,
      vendor: "none",
      renderer: "none",
      unmaskedVendor: "none",
      unmaskedRenderer: "none",
      version: "none",
      shadingLanguageVersion: "none",
      extensionsCount: 0,
      extensionsHash: sha256Hex("none"),
      maxTextureSize: 0,
      maxViewportDims: [0, 0],
      maxAnisotropy: 0,
      shaderPrecisionHash: sha256Hex("none"),
      maxVertexUniformVectors: 0,
      aliasedLineWidthRange: [1, 1],
      pixelRenderHash: sha256Hex("none"),
    };
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    let gl2: WebGL2RenderingContext | null = null;
    let gl: WebGLRenderingContext | null = null;
    try {
      gl2 = canvas.getContext("webgl2");
      gl = (gl2 ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    } catch {
      gl = null;
    }

    if (!gl) {
      return {
        webgl1Available: false,
        webgl2Available: false,
        vendor: "unavailable",
        renderer: "unavailable",
        unmaskedVendor: "unavailable",
        unmaskedRenderer: "unavailable",
        version: "unavailable",
        shadingLanguageVersion: "unavailable",
        extensionsCount: 0,
        extensionsHash: sha256Hex("unavailable"),
        maxTextureSize: 0,
        maxViewportDims: [0, 0],
        maxAnisotropy: 0,
        shaderPrecisionHash: sha256Hex("unavailable"),
        maxVertexUniformVectors: 0,
        aliasedLineWidthRange: [1, 1],
        pixelRenderHash: sha256Hex("unavailable"),
      };
    }

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = String(gl.getParameter(gl.VENDOR) ?? "unknown");
    const renderer = String(gl.getParameter(gl.RENDERER) ?? "unknown");
    const unmaskedVendor = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) ?? vendor)
      : vendor;
    const unmaskedRenderer = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? renderer)
      : renderer;
    const version = String(gl.getParameter(gl.VERSION) ?? "unknown");
    const shadingLanguageVersion = String(
      gl.getParameter(gl.SHADING_LANGUAGE_VERSION) ?? "unknown"
    );
    const extensions = (gl.getSupportedExtensions() ?? []).slice().sort();
    const maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE) ?? 0);
    const maxVertexUniformVectors = Number(gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) ?? 0);
    const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array | number[] | null;
    const maxViewportDims: [number, number] = viewport
      ? [Number(viewport[0] ?? 0), Number(viewport[1] ?? 0)]
      : [0, 0];
    const lineRange = gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE) as Float32Array | number[] | null;
    const aliasedLineWidthRange: [number, number] = lineRange
      ? [Number(lineRange[0] ?? 1), Number(lineRange[1] ?? 1)]
      : [1, 1];

    const extAniso =
      gl.getExtension("EXT_texture_filter_anisotropic") ||
      gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic") ||
      gl.getExtension("MOZ_EXT_texture_filter_anisotropic");
    let maxAnisotropy = 0;
    if (extAniso && "MAX_TEXTURE_MAX_ANISOTROPY_EXT" in extAniso) {
      maxAnisotropy = Number(
        gl.getParameter(
          (extAniso as { MAX_TEXTURE_MAX_ANISOTROPY_EXT: number }).MAX_TEXTURE_MAX_ANISOTROPY_EXT
        ) ?? 0
      );
    }

    const shaderTypes = [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER];
    const precisionTypes = [
      gl.LOW_FLOAT,
      gl.MEDIUM_FLOAT,
      gl.HIGH_FLOAT,
      gl.LOW_INT,
      gl.MEDIUM_INT,
      gl.HIGH_INT,
    ];
    const precisions: string[] = [];
    for (const st of shaderTypes) {
      for (const pt of precisionTypes) {
        const fmt = gl.getShaderPrecisionFormat?.(st, pt);
        if (fmt) {
          precisions.push(`${st}:${pt}:${fmt.rangeMin}:${fmt.rangeMax}:${fmt.precision}`);
        }
      }
    }

    // Mini deterministic WebGL clear/pixel hash probe
    let pixelRenderHash = sha256Hex(`${unmaskedVendor}:${unmaskedRenderer}:${maxVertexUniformVectors}`);
    try {
      if (typeof gl.clearColor === "function" && typeof gl.readPixels === "function") {
        gl.clearColor(0.37, 0.21, 0.85, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        const pixels = new Uint8Array(16);
        gl.readPixels(0, 0, 2, 2, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        pixelRenderHash = sha256Hex(`${Array.from(pixels).join(",")}:${unmaskedRenderer}`);
      }
    } catch {
      // Fallback to parameter-based hash
    }

    return {
      webgl1Available: true,
      webgl2Available: Boolean(gl2),
      vendor,
      renderer,
      unmaskedVendor,
      unmaskedRenderer,
      version,
      shadingLanguageVersion,
      extensionsCount: extensions.length,
      extensionsHash: sha256Hex(extensions.join(",")),
      maxTextureSize,
      maxViewportDims,
      maxAnisotropy,
      shaderPrecisionHash: sha256Hex(precisions.join("|")),
      maxVertexUniformVectors,
      aliasedLineWidthRange,
      pixelRenderHash,
    };
  } catch {
    return {
      webgl1Available: false,
      webgl2Available: false,
      vendor: "error",
      renderer: "error",
      unmaskedVendor: "error",
      unmaskedRenderer: "error",
      version: "error",
      shadingLanguageVersion: "error",
      extensionsCount: 0,
      extensionsHash: sha256Hex("error"),
      maxTextureSize: 0,
      maxViewportDims: [0, 0],
      maxAnisotropy: 0,
      shaderPrecisionHash: sha256Hex("error"),
      maxVertexUniformVectors: 0,
      aliasedLineWidthRange: [1, 1],
      pixelRenderHash: sha256Hex("error"),
    };
  }
}

export async function collectWebGPU(): Promise<WebGPUComponent> {
  try {
    const nav = typeof navigator !== "undefined" ? (navigator as unknown as Record<string, unknown>) : {};
    const gpu = nav.gpu as
      | {
          requestAdapter?: () => Promise<{
            info?: {
              vendor?: string;
              architecture?: string;
              device?: string;
              description?: string;
            };
            features?: Iterable<string>;
            limits?: Record<string, unknown>;
          } | null>;
        }
      | undefined;

    if (!gpu || typeof gpu.requestAdapter !== "function") {
      return {
        available: false,
        vendor: "unavailable",
        architecture: "unavailable",
        device: "unavailable",
        description: "unavailable",
        limitsHash: sha256Hex("unavailable"),
        features: [],
        maxTextureDimension2D: 0,
        maxBindGroups: 0,
      };
    }

    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      return {
        available: false,
        vendor: "no_adapter",
        architecture: "no_adapter",
        device: "no_adapter",
        description: "no_adapter",
        limitsHash: sha256Hex("no_adapter"),
        features: [],
        maxTextureDimension2D: 0,
        maxBindGroups: 0,
      };
    }

    const info = adapter.info ?? {};
    const features = adapter.features ? Array.from(adapter.features).sort() : [];
    const limitsObj: Record<string, number | string> = {};
    if (adapter.limits) {
      for (const key of [
        "maxTextureDimension2D",
        "maxBufferSize",
        "maxComputeWorkgroupSizeX",
        "maxBindGroups",
      ]) {
        const val = (adapter.limits as Record<string, unknown>)[key];
        if (typeof val === "number" || typeof val === "string") {
          limitsObj[key] = val;
        }
      }
    }

    return {
      available: true,
      vendor: String(info.vendor ?? "unknown"),
      architecture: String(info.architecture ?? "unknown"),
      device: String(info.device ?? "unknown"),
      description: String(info.description ?? "unknown"),
      limitsHash: sha256Hex(stableStringify({ limitsObj, features })),
      features,
      maxTextureDimension2D: Number(limitsObj.maxTextureDimension2D ?? 8192),
      maxBindGroups: Number(limitsObj.maxBindGroups ?? 4),
    };
  } catch {
    return {
      available: false,
      vendor: "error",
      architecture: "error",
      device: "error",
      description: "error",
      limitsHash: sha256Hex("error"),
      features: [],
      maxTextureDimension2D: 0,
      maxBindGroups: 0,
    };
  }
}

async function runSingleOfflineAudioRender(): Promise<{
  sum: number;
  samples: string;
  sampleRate: number;
  maxChannels: number;
} | null> {
  const win = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : {};
  const OfflineCtx = (win.OfflineAudioContext || win.webkitOfflineAudioContext) as
    | (new (channels: number, length: number, sampleRate: number) => OfflineAudioContext)
    | undefined;

  if (!OfflineCtx) return null;

  const sampleRate = 44100;
  const ctx = new OfflineCtx(1, 5000, sampleRate);
  const oscillator = ctx.createOscillator();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(10000, ctx.currentTime);

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-50, ctx.currentTime);
  compressor.knee.setValueAtTime(40, ctx.currentTime);
  compressor.ratio.setValueAtTime(12, ctx.currentTime);
  compressor.attack.setValueAtTime(0, ctx.currentTime);
  compressor.release.setValueAtTime(0.25, ctx.currentTime);

  oscillator.connect(compressor);
  compressor.connect(ctx.destination);
  oscillator.start(0);

  const renderedBuffer = await ctx.startRendering();
  const channelData = renderedBuffer.getChannelData(0);
  let sum = 0;
  const slice: string[] = [];
  for (let i = 4500; i < 5000 && i < channelData.length; i++) {
    const val = channelData[i] ?? 0;
    sum += Math.abs(val);
    if (i < 4540) {
      slice.push(val.toFixed(6));
    }
  }

  return {
    sum: Number(sum.toFixed(6)),
    samples: slice.join(","),
    sampleRate: ctx.sampleRate,
    maxChannels: ctx.destination?.maxChannelCount ?? 2,
  };
}

export async function collectAudio(): Promise<AudioComponent> {
  try {
    const first = await runSingleOfflineAudioRender();
    if (!first) {
      return {
        available: false,
        sampleHash: sha256Hex("audio_unavailable"),
        sumValue: 0,
        sampleRate: 0,
        maxChannelCount: 0,
        doubleRenderConsistent: true,
      };
    }
    const second = await runSingleOfflineAudioRender();
    const doubleRenderConsistent = second ? first.samples === second.samples : true;

    return {
      available: true,
      sampleHash: sha256Hex(first.samples),
      sumValue: first.sum,
      sampleRate: first.sampleRate,
      maxChannelCount: first.maxChannels,
      doubleRenderConsistent,
    };
  } catch {
    return {
      available: false,
      sampleHash: sha256Hex("audio_error"),
      sumValue: 0,
      sampleRate: 0,
      maxChannelCount: 0,
      doubleRenderConsistent: true,
    };
  }
}

export function collectHardware(): HardwareComponent {
  if (typeof navigator === "undefined") {
    return {
      hardwareConcurrency: 1,
      deviceMemory: 0,
      maxTouchPoints: 0,
      platform: "unknown",
      vendor: "unknown",
      oscpu: "unknown",
      pdfViewerEnabled: false,
      cookieEnabled: false,
      doNotTrack: null,
      architectureHint: "unknown",
      globalPrivacyControl: false,
    };
  }

  const nav = navigator as unknown as Record<string, unknown>;
  const ua = navigator.userAgent || "";
  let architectureHint = "x86_64";
  if (/arm64|aarch64|apple/i.test(ua)) {
    architectureHint = "arm64";
  } else if (/armv7|arm/i.test(ua)) {
    architectureHint = "arm";
  }

  return {
    hardwareConcurrency: Number(navigator.hardwareConcurrency || 1),
    deviceMemory: Number(nav.deviceMemory ?? 0),
    maxTouchPoints: Number(navigator.maxTouchPoints ?? 0),
    platform: String(navigator.platform || "unknown"),
    vendor: String(navigator.vendor || "unknown"),
    oscpu: String(nav.oscpu ?? "unknown"),
    pdfViewerEnabled: Boolean(nav.pdfViewerEnabled ?? false),
    cookieEnabled: Boolean(navigator.cookieEnabled),
    doNotTrack: typeof navigator.doNotTrack === "string" ? navigator.doNotTrack : null,
    architectureHint,
    globalPrivacyControl: Boolean(nav.globalPrivacyControl ?? false),
  };
}

export function collectScreen(): ScreenComponent {
  if (typeof window === "undefined" || typeof screen === "undefined") {
    return {
      width: 1920,
      height: 1080,
      availWidth: 1920,
      availHeight: 1040,
      colorDepth: 24,
      pixelDepth: 24,
      devicePixelRatio: 1,
      orientationType: "landscape-primary",
      hdrSupported: false,
      colorGamut: "srgb",
      forcedColors: false,
      prefersDarkScheme: true,
      prefersReducedMotion: false,
      touchSupport: false,
    };
  }

  const mq = (query: string): boolean => {
    try {
      return typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false;
    } catch {
      return false;
    }
  };

  let colorGamut: "rec2020" | "p3" | "srgb" | "unknown" = "unknown";
  if (mq("(color-gamut: rec2020)")) colorGamut = "rec2020";
  else if (mq("(color-gamut: p3)")) colorGamut = "p3";
  else if (mq("(color-gamut: srgb)")) colorGamut = "srgb";

  return {
    width: Number(screen.width || 0),
    height: Number(screen.height || 0),
    availWidth: Number(screen.availWidth || 0),
    availHeight: Number(screen.availHeight || 0),
    colorDepth: Number(screen.colorDepth || 24),
    pixelDepth: Number(screen.pixelDepth || 24),
    devicePixelRatio: Number(window.devicePixelRatio || 1),
    orientationType: String(screen.orientation?.type || "landscape-primary"),
    hdrSupported: mq("(dynamic-range: high)"),
    colorGamut,
    forcedColors: mq("(forced-colors: active)"),
    prefersDarkScheme: mq("(prefers-color-scheme: dark)"),
    prefersReducedMotion: mq("(prefers-reduced-motion: reduce)"),
    touchSupport:
      "ontouchstart" in window || (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0),
  };
}

export function collectCssMediaMatrix(): CssMediaMatrixComponent {
  const mq = (query: string): boolean => {
    try {
      return typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia(query).matches
        : false;
    } catch {
      return false;
    }
  };

  const prefersColorScheme = mq("(prefers-color-scheme: dark)")
    ? "dark"
    : mq("(prefers-color-scheme: light)")
      ? "light"
      : "no-preference";

  const prefersContrast = mq("(prefers-contrast: more)")
    ? "more"
    : mq("(prefers-contrast: less)")
      ? "less"
      : "no-preference";

  let colorGamut: "rec2020" | "p3" | "srgb" | "unknown" = "unknown";
  if (mq("(color-gamut: rec2020)")) colorGamut = "rec2020";
  else if (mq("(color-gamut: p3)")) colorGamut = "p3";
  else if (mq("(color-gamut: srgb)")) colorGamut = "srgb";

  const anyPointer = mq("(any-pointer: fine)")
    ? "fine"
    : mq("(any-pointer: coarse)")
      ? "coarse"
      : "none";

  return {
    prefersColorScheme,
    prefersReducedMotion: mq("(prefers-reduced-motion: reduce)"),
    prefersContrast,
    forcedColors: mq("(forced-colors: active)"),
    dynamicRangeHigh: mq("(dynamic-range: high)"),
    colorGamut,
    anyPointer,
    anyHover: mq("(any-hover: hover)"),
    invertedColors: mq("(inverted-colors: inverted)"),
    monochrome: mq("(monochrome)"),
  };
}

export async function collectMediaCodecs(): Promise<MediaCodecsComponent> {
  let audioInputCount = 0;
  let videoInputCount = 0;
  let audioOutputCount = 0;

  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.enumerateDevices === "function"
    ) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      for (const d of devices) {
        if (d.kind === "audioinput") audioInputCount += 1;
        else if (d.kind === "videoinput") videoInputCount += 1;
        else if (d.kind === "audiooutput") audioOutputCount += 1;
      }
    }
  } catch {
    // Ignore device enumeration errors
  }

  let av1Supported = false;
  let hevcSupported = false;
  let vp9Supported = false;
  let opusSupported = false;
  let flacSupported = false;

  try {
    if (typeof document !== "undefined") {
      const video = document.createElement("video");
      const audio = document.createElement("audio");
      if (typeof video.canPlayType === "function") {
        av1Supported = Boolean(video.canPlayType('video/mp4; codecs="av01.0.05M.08"'));
        hevcSupported = Boolean(video.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"'));
        vp9Supported = Boolean(video.canPlayType('video/webm; codecs="vp9"'));
      }
      if (typeof audio.canPlayType === "function") {
        opusSupported = Boolean(audio.canPlayType('audio/ogg; codecs="opus"'));
        flacSupported = Boolean(audio.canPlayType("audio/flac"));
      }
    }
  } catch {
    // Ignore codec check errors
  }

  let keyboardLayoutHash = sha256Hex("no_keyboard_map");
  let keyboardKeysCount = 0;

  try {
    const nav = typeof navigator !== "undefined" ? (navigator as unknown as Record<string, unknown>) : {};
    const kb = nav.keyboard as
      | {
          getLayoutMap?: () => Promise<Map<string, string>>;
        }
      | undefined;

    if (kb && typeof kb.getLayoutMap === "function") {
      const map = await kb.getLayoutMap();
      const entries: string[] = [];
      map.forEach((v, k) => {
        entries.push(`${k}:${v}`);
      });
      entries.sort();
      keyboardKeysCount = entries.length;
      keyboardLayoutHash = sha256Hex(entries.join(","));
    }
  } catch {
    // Ignore keyboard layout errors
  }

  return {
    audioInputCount,
    videoInputCount,
    audioOutputCount,
    av1Supported,
    hevcSupported,
    vp9Supported,
    opusSupported,
    flacSupported,
    keyboardLayoutHash,
    keyboardKeysCount,
  };
}

export function collectFonts(): FontsComponent {
  if (typeof document === "undefined" || !document.body) {
    return {
      detected: [],
      count: 0,
      hash: sha256Hex("no_dom_fonts"),
    };
  }

  try {
    const baseFonts = ["monospace", "sans-serif", "serif"] as const;
    const testString = "mmmmmmmmmmlliWW@#12345";
    const container = document.createElement("div");
    container.style.cssText =
      "position:absolute;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none;";

    const baseDimensions: Record<string, { w: number; h: number }> = {};
    for (const base of baseFonts) {
      const span = document.createElement("span");
      span.style.fontSize = "72px";
      span.style.fontFamily = base;
      span.textContent = testString;
      container.appendChild(span);
    }
    document.body.appendChild(container);

    const baseSpans = Array.from(container.children) as HTMLElement[];
    baseFonts.forEach((base, idx) => {
      const el = baseSpans[idx];
      baseDimensions[base] = {
        w: el ? el.offsetWidth : 0,
        h: el ? el.offsetHeight : 0,
      };
    });

    const detected: string[] = [];
    const probeSpan = document.createElement("span");
    probeSpan.style.fontSize = "72px";
    probeSpan.textContent = testString;
    container.appendChild(probeSpan);

    for (const candidate of OS_FONT_CANDIDATES) {
      let matched = false;
      for (const base of baseFonts) {
        probeSpan.style.fontFamily = `'${candidate}', ${base}`;
        const w = probeSpan.offsetWidth;
        const h = probeSpan.offsetHeight;
        const baseDim = baseDimensions[base];
        if (baseDim && (w !== baseDim.w || h !== baseDim.h)) {
          matched = true;
          break;
        }
      }
      if (matched) {
        detected.push(candidate);
      }
    }

    document.body.removeChild(container);
    return {
      detected,
      count: detected.length,
      hash: sha256Hex(detected.join(",")),
    };
  } catch {
    return {
      detected: [],
      count: 0,
      hash: sha256Hex("font_error"),
    };
  }
}

export function collectTimezoneIntl(): TimezoneIntlComponent {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    const tz = resolved.timeZone || "UTC";
    const offset = new Date().getTimezoneOffset();
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZoneName: "longOffset",
      year: "numeric",
      month: "long",
      day: "2-digit",
    }).format(new Date(1700000000000));
    const numFormatted = new Intl.NumberFormat().format(1234567.89);
    const pr = new Intl.PluralRules().resolvedOptions().pluralCategories;

    // DST & UTC offset consistency check
    const dstConsistent = !(tz === "UTC" && offset !== 0);

    return {
      timezone: tz,
      timezoneOffsetMinutes: offset,
      locale: resolved.locale || "en-US",
      calendar: resolved.calendar || "gregory",
      numberingSystem: resolved.numberingSystem || "latn",
      dateTimeFormatHash: sha256Hex(formatted),
      numberFormatSymbol: numFormatted,
      pluralCategories: [...pr].sort(),
      dstConsistent,
    };
  } catch {
    return {
      timezone: "UTC",
      timezoneOffsetMinutes: 0,
      locale: "en-US",
      calendar: "gregory",
      numberingSystem: "latn",
      dateTimeFormatHash: sha256Hex("fallback"),
      numberFormatSymbol: "1,234,567.89",
      pluralCategories: ["one", "other"],
      dstConsistent: true,
    };
  }
}

export function collectLanguages(): LanguagesComponent {
  if (typeof navigator === "undefined") {
    return {
      language: "en-US",
      languages: ["en-US"],
      consistentMainLanguage: true,
    };
  }

  const primary = navigator.language || "en-US";
  const list =
    Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? [...navigator.languages]
      : [primary];
  const firstInList = list[0] ?? primary;
  const consistentMainLanguage =
    primary.toLowerCase().slice(0, 2) === firstInList.toLowerCase().slice(0, 2);

  return {
    language: primary,
    languages: list,
    consistentMainLanguage,
  };
}

export async function collectUserAgentData(): Promise<UserAgentDataComponent> {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const nav = typeof navigator !== "undefined" ? (navigator as unknown as Record<string, unknown>) : {};
  const uaData = nav.userAgentData as
    | {
        brands?: Array<{ brand: string; version: string }>;
        mobile?: boolean;
        platform?: string;
        getHighEntropyValues?: (
          hints: string[]
        ) => Promise<{
          architecture?: string;
          bitness?: string;
          model?: string;
          platformVersion?: string;
          fullVersionList?: Array<{ brand: string; version: string }>;
        }>;
      }
    | undefined;

  if (!uaData) {
    return {
      userAgent: ua,
      brands: [],
      mobile: /Mobi|Android/i.test(ua),
      platform: typeof navigator !== "undefined" ? navigator.platform || "unknown" : "unknown",
      architecture: "unknown",
      bitness: "64",
      model: "",
      platformVersion: "",
      fullVersionListHash: sha256Hex(ua),
    };
  }

  try {
    const high =
      typeof uaData.getHighEntropyValues === "function"
        ? await uaData.getHighEntropyValues([
            "architecture",
            "bitness",
            "model",
            "platformVersion",
            "fullVersionList",
          ])
        : {};

    return {
      userAgent: ua,
      brands: (uaData.brands ?? []).map((b) => ({ brand: b.brand, version: b.version })),
      mobile: Boolean(uaData.mobile),
      platform: String(uaData.platform || "unknown"),
      architecture: String(high.architecture || "unknown"),
      bitness: String(high.bitness || "64"),
      model: String(high.model || ""),
      platformVersion: String(high.platformVersion || ""),
      fullVersionListHash: sha256Hex(stableStringify(high.fullVersionList ?? uaData.brands ?? [])),
    };
  } catch {
    return {
      userAgent: ua,
      brands: [],
      mobile: false,
      platform: "unknown",
      architecture: "unknown",
      bitness: "64",
      model: "",
      platformVersion: "",
      fullVersionListHash: sha256Hex(ua),
    };
  }
}

export async function collectStorage(): Promise<StorageComponent> {
  let localStorageOk = false;
  let sessionStorageOk = false;
  let indexedDBOk = false;
  let cachesOk = false;
  let swOk = false;
  let quotaBytes = 0;
  let usageBytes = 0;

  try {
    localStorageOk = typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    localStorageOk = false;
  }

  try {
    sessionStorageOk = typeof window !== "undefined" && Boolean(window.sessionStorage);
  } catch {
    sessionStorageOk = false;
  }

  try {
    indexedDBOk = typeof window !== "undefined" && Boolean(window.indexedDB);
  } catch {
    indexedDBOk = false;
  }

  try {
    cachesOk = typeof window !== "undefined" && "caches" in window;
    swOk = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  } catch {
    cachesOk = false;
  }

  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.storage &&
      typeof navigator.storage.estimate === "function"
    ) {
      const est = await navigator.storage.estimate();
      quotaBytes = Number(est.quota ?? 0);
      usageBytes = Number(est.usage ?? 0);
    }
  } catch {
    quotaBytes = 0;
  }

  return {
    localStorage: localStorageOk,
    sessionStorage: sessionStorageOk,
    indexedDB: indexedDBOk,
    cachesApi: cachesOk,
    serviceWorker: swOk,
    quotaBytes,
    usageBytes,
  };
}

export function collectSpeech(): SpeechComponent {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return {
      available: false,
      voiceCount: 0,
      defaultVoice: "none",
      voicesHash: sha256Hex("speech_unavailable"),
    };
  }

  try {
    const voices = window.speechSynthesis.getVoices() ?? [];
    const serialized = voices
      .map((v) => `${v.name}:${v.lang}:${v.localService}`)
      .sort()
      .join("|");
    const defaultVoice = voices.find((v) => v.default)?.name ?? voices[0]?.name ?? "none";

    return {
      available: true,
      voiceCount: voices.length,
      defaultVoice,
      voicesHash: sha256Hex(serialized),
    };
  } catch {
    return {
      available: false,
      voiceCount: 0,
      defaultVoice: "none",
      voicesHash: sha256Hex("speech_error"),
    };
  }
}

export function collectMath(): MathComponent {
  const acos = Math.acos(0.123456789101112);
  const acosh = Math.acosh(1e154);
  const asinh = Math.asinh(1);
  const atanh = Math.atanh(0.5);
  const cbrt = Math.cbrt(Math.PI);
  const cosh = Math.cosh(1);
  const expm1 = Math.expm1(1);
  const log1p = Math.log1p(10);
  const sinh = Math.sinh(1);
  const tanh = Math.tanh(1);
  const powPi = Math.pow(Math.PI, -100);

  let engineHint: "V8" | "SpiderMonkey" | "JavaScriptCore" | "Unknown" = "Unknown";
  const errLen = Error.toString().length;
  if (errLen === 37) engineHint = "V8";
  else if (errLen === 35) engineHint = "SpiderMonkey";
  else if (errLen === 33) engineHint = "JavaScriptCore";
  else if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent;
    if (/Firefox/i.test(ua)) engineHint = "SpiderMonkey";
    else if (/Chrome|Chromium|Edg/i.test(ua)) engineHint = "V8";
    else if (/Safari/i.test(ua)) engineHint = "JavaScriptCore";
  }

  const payload = [acos, acosh, asinh, atanh, cbrt, cosh, expm1, log1p, sinh, tanh, powPi]
    .map((n) => n.toString())
    .join("|");

  return {
    engineHint,
    constantsHash: sha256Hex(payload),
    acos,
    acosh,
    asinh,
    atanh,
    cbrt,
    cosh,
    expm1,
    log1p,
    sinh,
    tanh,
    powPi,
  };
}

export async function collectWebRTC(timeoutMs = 250): Promise<WebRTCComponent> {
  if (typeof window === "undefined") {
    return {
      available: false,
      candidateTypes: [],
      localIpPresent: false,
      sdpFeedbackHash: sha256Hex("no_window"),
    };
  }

  const win = window as unknown as Record<string, unknown>;
  const PeerConn = (win.RTCPeerConnection ||
    win.webkitRTCPeerConnection ||
    win.mozRTCPeerConnection) as (new (config?: RTCConfiguration) => RTCPeerConnection) | undefined;

  if (!PeerConn) {
    return {
      available: false,
      candidateTypes: [],
      localIpPresent: false,
      sdpFeedbackHash: sha256Hex("webrtc_unavailable"),
    };
  }

  return new Promise<WebRTCComponent>((resolve) => {
    const candidateTypes = new Set<string>();
    let localIpPresent = false;
    let sdpText = "";
    let settled = false;
    let pc: RTCPeerConnection | null = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        pc?.close();
      } catch {
        // Ignore close errors
      }
      resolve({
        available: true,
        candidateTypes: [...candidateTypes].sort(),
        localIpPresent,
        sdpFeedbackHash: sha256Hex(sdpText || "empty_sdp"),
      });
    };

    const timer = setTimeout(finish, timeoutMs);

    try {
      pc = new PeerConn({ iceServers: [] });
      pc.createDataChannel("bloumeid_probe");
      pc.onicecandidate = (evt) => {
        if (evt.candidate && evt.candidate.candidate) {
          const c = evt.candidate.candidate;
          if (c.includes("typ host")) candidateTypes.add("host");
          if (c.includes("typ srflx")) candidateTypes.add("srflx");
          if (/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(c)) {
            localIpPresent = true;
          }
        } else {
          clearTimeout(timer);
          finish();
        }
      };
      pc.createOffer()
        .then((offer) => {
          sdpText = (offer.sdp ?? "").replace(/o=.*$/gm, "");
          return pc?.setLocalDescription(offer);
        })
        .catch(() => {
          clearTimeout(timer);
          finish();
        });
    } catch {
      clearTimeout(timer);
      finish();
    }
  });
}

export function collectConnection(): ConnectionComponent {
  if (typeof navigator === "undefined") {
    return {
      available: false,
      effectiveType: "unknown",
      rtt: 0,
      downlink: 0,
      saveData: false,
    };
  }

  const nav = navigator as unknown as Record<string, unknown>;
  const conn = (nav.connection || nav.mozConnection || nav.webkitConnection) as
    | {
        effectiveType?: string;
        rtt?: number;
        downlink?: number;
        saveData?: boolean;
      }
    | undefined;

  if (!conn) {
    return {
      available: false,
      effectiveType: "unknown",
      rtt: 0,
      downlink: 0,
      saveData: false,
    };
  }

  return {
    available: true,
    effectiveType: String(conn.effectiveType ?? "4g"),
    rtt: Number(conn.rtt ?? 0),
    downlink: Number(conn.downlink ?? 0),
    saveData: Boolean(conn.saveData ?? false),
  };
}
