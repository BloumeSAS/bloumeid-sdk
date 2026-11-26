import type {
  AntiSpoofComponent,
  AudioComponent,
  CanvasComponent,
  HardwareComponent,
  LanguagesComponent,
  StorageComponent,
  TimezoneIntlComponent,
  WebGLComponent,
} from "./types";

const AUTOMATION_GLOBALS = [
  "__playwright",
  "__pw_manual",
  "_phantom",
  "__nightmare",
  "callPhantom",
  "_selenium",
  "__webdriver_evaluate",
  "__selenium_evaluate",
  "__webdriver_script_function",
  "__webdriver_script_func",
  "__webdriver_script_fn",
  "__fxdriver_evaluate",
  "__driver_unwrapped",
  "__webdriver_unwrapped",
  "__driver_evaluate",
  "__selenium_unwrapped",
  "__fxdriver_unwrapped",
  "cdc_adoQpoasnfa76pfcZLmcfl_Array",
  "cdc_adoQpoasnfa76pfcZLmcfl_Promise",
  "cdc_adoQpoasnfa76pfcZLmcfl_Symbol",
  "domAutomation",
  "domAutomationController",
] as const;

const VM_RENDERER_PATTERNS =
  /SwiftShader|llvmpipe|VirtualBox|VMware|Parallels|QEMU|Microsoft Basic Render Driver| SVGA3D|Chromium/i;

function inspectPrototypeTampering(): string[] {
  const tampered: string[] = [];
  if (typeof window === "undefined") return tampered;

  const isNativeFn = (fn: unknown): boolean => {
    if (typeof fn !== "function") return true;
    try {
      const str = Function.prototype.toString.call(fn);
      return /\{\s*\[native code\]\s*\}/.test(str);
    } catch {
      return false;
    }
  };

  try {
    if (typeof Navigator !== "undefined") {
      const desc = Object.getOwnPropertyDescriptor(Navigator.prototype, "userAgent");
      if (desc?.get && !isNativeFn(desc.get)) {
        tampered.push("Navigator.prototype.userAgent");
      }
      if (typeof navigator !== "undefined" && Object.prototype.hasOwnProperty.call(navigator, "userAgent")) {
        tampered.push("navigator.userAgent(ownProperty)");
      }
    }
  } catch {
    // Ignore descriptor error
  }

  try {
    if (typeof HTMLCanvasElement !== "undefined") {
      if (!isNativeFn(HTMLCanvasElement.prototype.toDataURL)) {
        tampered.push("HTMLCanvasElement.prototype.toDataURL");
      }
    }
  } catch {
    // Ignore
  }

  try {
    if (typeof AudioBuffer !== "undefined") {
      if (!isNativeFn(AudioBuffer.prototype.getChannelData)) {
        tampered.push("AudioBuffer.prototype.getChannelData");
      }
    }
  } catch {
    // Ignore
  }

  try {
    if (typeof WebGLRenderingContext !== "undefined") {
      if (!isNativeFn(WebGLRenderingContext.prototype.getParameter)) {
        tampered.push("WebGLRenderingContext.prototype.getParameter");
      }
    }
  } catch {
    // Ignore
  }

  return tampered;
}

function detectStackEngineMismatch(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (!ua) return false;

  try {
    const err = new Error("bloumeid_stack_probe");
    const stack = err.stack || "";
    const hasV8StackStyle = /at\s+/.test(stack);
    const claimsFirefoxOrSafariOnly =
      (/Firefox\//i.test(ua) || (/Safari\//i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua)));

    if (claimsFirefoxOrSafariOnly && hasV8StackStyle && stack.includes("    at ")) {
      return true;
    }
  } catch {
    // Ignore
  }
  return false;
}

async function probeWorkerConsistency(mainHardware: HardwareComponent): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    typeof Worker === "undefined" ||
    typeof Blob === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return false;
  }

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (mismatch: boolean) => {
      if (settled) return;
      settled = true;
      resolve(mismatch);
    };

    const timer = setTimeout(() => finish(false), 180);

    try {
      const code = `self.onmessage = function() {
        self.postMessage({
          ua: navigator.userAgent,
          platform: navigator.platform,
          hc: navigator.hardwareConcurrency || 0
        });
      };`;
      const blob = new Blob([code], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);

      worker.onmessage = (evt: MessageEvent<{ ua: string; platform: string; hc: number }>) => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        worker.terminate();
        const data = evt.data;
        const mainUa = typeof navigator !== "undefined" ? navigator.userAgent : "";
        const mismatch =
          data.ua !== mainUa ||
          data.platform !== mainHardware.platform ||
          (data.hc > 0 && data.hc !== mainHardware.hardwareConcurrency);
        finish(mismatch);
      };

      worker.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        worker.terminate();
        finish(false);
      };

      worker.postMessage("probe");
    } catch {
      clearTimeout(timer);
      finish(false);
    }
  });
}

async function probePermissionsInconsistency(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return false;
  }
  try {
    const res = await navigator.permissions.query({ name: "notifications" as PermissionName });
    const win = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : {};
    const notif = win.Notification as { permission?: string } | undefined;
    if (notif && notif.permission === "denied" && res.state === "prompt") {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function detectPrivateMode(storage: StorageComponent): Promise<boolean> {
  if (storage.quotaBytes > 0 && storage.quotaBytes < 130 * 1024 * 1024) {
    return true;
  }
  if (typeof window !== "undefined" && !storage.indexedDB) {
    return true;
  }
  return false;
}

export async function runAntiSpoofProbes(params: {
  canvas: CanvasComponent;
  audio: AudioComponent;
  hardware: HardwareComponent;
  webgl: WebGLComponent;
  languages: LanguagesComponent;
  storage: StorageComponent;
  timezoneIntl?: TimezoneIntlComponent;
}): Promise<AntiSpoofComponent> {
  const reasons: string[] = [];
  const automationArtifacts: string[] = [];

  const webdriver =
    typeof navigator !== "undefined" && Boolean((navigator as { webdriver?: boolean }).webdriver);
  if (webdriver) {
    reasons.push("navigator.webdriver is true");
  }

  const win = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : {};
  const doc = typeof document !== "undefined" ? (document as unknown as Record<string, unknown>) : {};

  for (const key of AUTOMATION_GLOBALS) {
    if (key in win || key in doc) {
      automationArtifacts.push(key);
    }
  }

  if (typeof document !== "undefined") {
    for (const prop of Object.getOwnPropertyNames(document)) {
      if (/^\$(cdc|wdc)_/.test(prop)) {
        automationArtifacts.push(prop);
      }
    }
  }

  if (automationArtifacts.length > 0) {
    reasons.push(`automation artifacts: ${automationArtifacts.join(",")}`);
  }

  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const isChromiumUa = /Chrome\/|Chromium\/|Edg\//i.test(ua);
  const chromeObj = win.chrome as Record<string, unknown> | undefined;
  const chromeObjectAnomaly = isChromiumUa && (!chromeObj || typeof chromeObj !== "object");
  if (chromeObjectAnomaly) {
    reasons.push("Chromium UA missing window.chrome object");
  }

  const isVirtualMachine = VM_RENDERER_PATTERNS.test(params.webgl.unmaskedRenderer || "");
  if (isVirtualMachine) {
    reasons.push(`VM or software WebGL renderer detected (${params.webgl.unmaskedRenderer})`);
  }

  const tamperedFunctions = inspectPrototypeTampering();
  const prototypeTampered = tamperedFunctions.length > 0;
  if (prototypeTampered) {
    reasons.push(`Native prototype hooks detected: ${tamperedFunctions.join(", ")}`);
  }

  const zeroOuterDimensions =
    typeof window !== "undefined" &&
    typeof window.outerWidth === "number" &&
    typeof window.outerHeight === "number" &&
    window.outerWidth === 0 &&
    window.outerHeight === 0 &&
    window.innerWidth > 0;
  if (zeroOuterDimensions) {
    reasons.push("Zero outerWidth/outerHeight window geometry (headless browser)");
  }

  const stackEngineMismatch = detectStackEngineMismatch();
  if (stackEngineMismatch) {
    reasons.push("Error.stack format contradicts claimed User-Agent engine");
  }

  const timezoneDstMismatch = params.timezoneIntl ? params.timezoneIntl.dstConsistent === false : false;
  if (timezoneDstMismatch) {
    reasons.push("Intl timezone contradicts Date.getTimezoneOffset()");
  }

  const permissionsInconsistent = await probePermissionsInconsistency();
  if (permissionsInconsistent) {
    reasons.push("Permissions.query state contradicts Notification.permission");
  }

  const workerMismatch = await probeWorkerConsistency(params.hardware);
  if (workerMismatch) {
    reasons.push("Web Worker navigator signals mismatch main thread");
  }

  const canvasNoiseDetected = !params.canvas.doubleRenderConsistent;
  if (canvasNoiseDetected) {
    reasons.push("Canvas double-render output differs (anti-detect noise injection)");
  }

  const audioNoiseDetected = !params.audio.doubleRenderConsistent;
  if (audioNoiseDetected) {
    reasons.push("Audio double-render output differs (audio noise spoofing)");
  }

  if (!params.languages.consistentMainLanguage) {
    reasons.push("navigator.language inconsistent with navigator.languages[0]");
  }

  const isIncognito = await detectPrivateMode(params.storage);

  const isBot =
    webdriver ||
    automationArtifacts.length > 0 ||
    permissionsInconsistent ||
    zeroOuterDimensions ||
    /HeadlessChrome|PhantomJS|SlimerJS/i.test(ua);

  const isSpoofed =
    chromeObjectAnomaly ||
    workerMismatch ||
    canvasNoiseDetected ||
    audioNoiseDetected ||
    prototypeTampered ||
    stackEngineMismatch ||
    timezoneDstMismatch ||
    !params.languages.consistentMainLanguage;

  return {
    isBot,
    isSpoofed,
    isIncognito,
    isVirtualMachine,
    webdriver,
    automationArtifacts,
    chromeObjectAnomaly,
    permissionsInconsistent,
    workerMismatch,
    canvasNoiseDetected,
    audioNoiseDetected,
    prototypeTampered,
    tamperedFunctions,
    zeroOuterDimensions,
    stackEngineMismatch,
    timezoneDstMismatch,
    reasons,
  };
}
