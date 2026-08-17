(function (global) {
  "use strict";

  const CHANNEL = "METUDTX_DIGITALTR_BRIDGE";
  const PROTOCOL_VERSION = "0.1";
  const SCHEMA_VERSION = "0.3-preview";
  const RECAPTCHA_ACTION = "digitaltr_intake_submit";
  const SUBMISSION_STORAGE_KEY = "metudtx.digitaltr.submissionId";
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const APP_ID_PATTERN = /^APP-\d{4}-\d{4,6}$/;

  class DigitalTRBridgeError extends Error {
    constructor(response) {
      super(response && response.message ? response.message : "DigitalTR bridge error");
      this.name = "DigitalTRBridgeError";
      this.code = response && response.code ? response.code : "TEMPORARY_SERVICE_ERROR";
      this.retryable = Boolean(response && response.retryable);
      this.fieldErrors = response && Array.isArray(response.fieldErrors) ? response.fieldErrors : [];
      this.submissionId = response && response.submissionId ? response.submissionId : null;
    }
  }

  class DigitalTRBridgeClient {
    constructor(iframe) {
      if (!iframe || !iframe.contentWindow) throw new Error("A bridge iframe is required.");
      this.iframe = iframe;
      this.bridgeOrigin = null;
      this.bridgeWindow = null;
      this.parentOrigin = global.location.origin;
      this.sessionNonce = global.crypto.randomUUID();
      this.pending = new Map();
      this.queue = Promise.resolve();
      this.started = false;
      this.startPromise = null;
      this.handshakeResolve = null;
      this.handshakeReject = null;
      this.discoveryTimeoutId = null;
      this.boundMessageHandler = this.handleMessage.bind(this);
    }

    start() {
      if (this.started) return this.startPromise || Promise.resolve(this);
      this.started = true;
      global.addEventListener("message", this.boundMessageHandler);
      this.startPromise = new Promise((resolve, reject) => {
        this.handshakeResolve = resolve;
        this.handshakeReject = reject;
        this.discoveryTimeoutId = global.setTimeout(() => {
          this.destroy(new DigitalTRBridgeError({
            code: "TEMPORARY_SERVICE_ERROR",
            message: "DigitalTR bridge connection timed out.",
            retryable: true
          }));
        }, 15000);
      });
      return this.startPromise;
    }

    destroy(reason) {
      global.removeEventListener("message", this.boundMessageHandler);
      if (this.discoveryTimeoutId !== null) global.clearTimeout(this.discoveryTimeoutId);
      this.discoveryTimeoutId = null;
      this.pending.forEach((entry) => {
        global.clearTimeout(entry.timeoutId);
        entry.reject(new Error("DigitalTR bridge client closed."));
      });
      this.pending.clear();
      if (this.handshakeReject) this.handshakeReject(reason || new Error("DigitalTR bridge client closed."));
      this.handshakeResolve = null;
      this.handshakeReject = null;
      this.bridgeWindow = null;
      this.bridgeOrigin = null;
      this.started = false;
      this.startPromise = null;
    }

    request(messageType, payload, timeoutMs) {
      const operation = () => this.send(messageType, payload, timeoutMs);
      const promise = this.queue.then(operation, operation);
      this.queue = promise.catch(() => undefined);
      return promise;
    }

    send(messageType, payload, timeoutMs) {
      if (!this.bridgeWindow || !this.bridgeOrigin) {
        return Promise.reject(new Error("DigitalTR bridge is not connected."));
      }
      const requestId = global.crypto.randomUUID();
      const envelope = {
        channel: CHANNEL,
        protocolVersion: PROTOCOL_VERSION,
        messageType: messageType,
        requestId: requestId,
        sessionNonce: this.sessionNonce,
        payload: payload
      };
      return new Promise((resolve, reject) => {
        const timeoutId = global.setTimeout(() => {
          this.pending.delete(requestId);
          reject(new DigitalTRBridgeError({
            code: "TEMPORARY_SERVICE_ERROR",
            message: "DigitalTR bridge response timed out.",
            retryable: true
          }));
        }, timeoutMs || 60000);
        this.pending.set(requestId, { resolve: resolve, reject: reject, timeoutId: timeoutId });
        this.bridgeWindow.postMessage(envelope, this.bridgeOrigin);
      });
    }

    handleMessage(event) {
      const envelope = event.data;
      if (!isValidEnvelope(envelope)) return;
      if (envelope.messageType === "BRIDGE_READY") {
        this.handleReady(event, envelope);
        return;
      }
      if (event.source !== this.bridgeWindow || event.origin !== this.bridgeOrigin ||
          envelope.sessionNonce !== this.sessionNonce) return;
      const pending = this.pending.get(envelope.requestId);
      if (!pending) return;
      this.pending.delete(envelope.requestId);
      global.clearTimeout(pending.timeoutId);
      if (envelope.messageType === "ERROR") pending.reject(new DigitalTRBridgeError(envelope.payload));
      else pending.resolve(envelope.payload);
    }

    handleReady(event, envelope) {
      if (this.bridgeWindow || !this.started || !isTrustedBridgeOrigin(event.origin) ||
          !isDescendantWindow(event.source, this.iframe.contentWindow) ||
          !hasExactKeys(envelope.payload, ["environment", "ok", "schemaVersion"]) ||
          envelope.payload.ok !== true || envelope.payload.environment !== "TEST" ||
          envelope.payload.schemaVersion !== SCHEMA_VERSION) return;
      this.bridgeWindow = event.source;
      this.bridgeOrigin = event.origin;
      if (this.discoveryTimeoutId !== null) global.clearTimeout(this.discoveryTimeoutId);
      this.discoveryTimeoutId = null;
      this.send("INIT", {
        schemaVersion: SCHEMA_VERSION,
        parentOrigin: this.parentOrigin
      }, 15000).then(() => {
        const resolve = this.handshakeResolve;
        this.handshakeResolve = null;
        this.handshakeReject = null;
        this.startPromise = Promise.resolve(this);
        if (resolve) resolve(this);
      }).catch((error) => this.destroy(error));
    }
  }

  let runtimePromise = null;
  let submissionInFlight = false;

  function settings() {
    const config = global.METUDTX_CONFIG && global.METUDTX_CONFIG.digitaltr;
    if (!config || config.schemaVersion !== SCHEMA_VERSION || config.protocolVersion !== PROTOCOL_VERSION ||
        typeof config.appsScriptBridgeUrl !== "string" || typeof config.recaptchaSiteKey !== "string") {
      throw new Error("DigitalTR backend configuration is unavailable.");
    }
    const bridgeUrl = new URL(config.appsScriptBridgeUrl);
    if (bridgeUrl.protocol !== "https:" || bridgeUrl.hostname !== "script.google.com") {
      throw new Error("DigitalTR backend URL is invalid.");
    }
    return {
      bridgeUrl: bridgeUrl.href,
      siteKey: config.recaptchaSiteKey.trim()
    };
  }

  function getRuntime() {
    if (runtimePromise) return runtimePromise;
    runtimePromise = (async function () {
      const config = settings();
      const iframe = document.createElement("iframe");
      iframe.id = "digitaltr-intake-bridge";
      iframe.hidden = true;
      iframe.setAttribute("hidden", "");
      iframe.setAttribute("aria-hidden", "true");
      iframe.setAttribute("tabindex", "-1");
      iframe.title = "DigitalTR intake bridge";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      document.body.appendChild(iframe);

      const client = new DigitalTRBridgeClient(iframe);
      const bridgeReady = client.start();
      const recaptchaReady = loadRecaptcha(config.siteKey);
      iframe.src = config.bridgeUrl;
      try {
        await Promise.all([bridgeReady, recaptchaReady]);
      } catch (error) {
        client.destroy(error);
        iframe.remove();
        throw error;
      }
      global.addEventListener("pagehide", function () {
        client.destroy();
      }, { once: true });
      return { client: client, siteKey: config.siteKey };
    })().catch(function (error) {
      runtimePromise = null;
      throw error;
    });
    return runtimePromise;
  }

  async function submit(payload) {
    if (submissionInFlight) throw new Error("A DigitalTR submission is already in flight.");
    validatePublicPayload(payload);
    submissionInFlight = true;
    try {
      const runtime = await getRuntime();
      const token = await global.grecaptcha.execute(runtime.siteKey, { action: RECAPTCHA_ACTION });
      if (typeof token !== "string" || !token) {
        throw new DigitalTRBridgeError({
          code: "BOT_VERIFICATION_FAILED",
          message: "Security verification failed.",
          retryable: false
        });
      }
      const submissionId = getSubmissionId();
      const submission = {
        protocolVersion: PROTOCOL_VERSION,
        schemaVersion: SCHEMA_VERSION,
        submissionId: submissionId,
        submittedAt: new Date().toISOString(),
        formLanguage: payload.formLanguage,
        selectedServices: payload.selectedServices.slice(),
        answers: cloneJson(payload.answers),
        partners: cloneJson(payload.partners),
        bot: {
          provider: "recaptcha-v3",
          action: RECAPTCHA_ACTION,
          token: token
        }
      };
      const response = await runtime.client.request("SUBMISSION_COMMIT", { submission: submission }, 300000);
      if (!response || response.ok !== true || !APP_ID_PATTERN.test(response.appId) ||
          typeof response.receivedAt !== "string" || !Array.isArray(response.selectedServices)) {
        throw new DigitalTRBridgeError({
          code: "TEMPORARY_SERVICE_ERROR",
          message: "DigitalTR backend returned an invalid response.",
          retryable: true,
          submissionId: submissionId
        });
      }
      clearSubmissionId();
      return Object.freeze({
        appId: response.appId,
        receivedAt: response.receivedAt,
        selectedServices: Object.freeze(response.selectedServices.slice())
      });
    } finally {
      submissionInFlight = false;
    }
  }

  function validatePublicPayload(payload) {
    if (!isPlainObject(payload) || payload.schemaVersion !== SCHEMA_VERSION ||
        (payload.formLanguage !== "tr-TR" && payload.formLanguage !== "en-GB") ||
        !Array.isArray(payload.selectedServices) || payload.selectedServices.length < 1 ||
        !isPlainObject(payload.answers) || !Array.isArray(payload.partners)) {
      throw new Error("DigitalTR submission payload is invalid.");
    }
  }

  function getSubmissionId() {
    let value = null;
    try { value = global.sessionStorage.getItem(SUBMISSION_STORAGE_KEY); } catch (_error) {}
    if (UUID_PATTERN.test(value || "")) return value;
    value = global.crypto.randomUUID();
    try { global.sessionStorage.setItem(SUBMISSION_STORAGE_KEY, value); } catch (_error) {}
    return value;
  }

  function clearSubmissionId() {
    try { global.sessionStorage.removeItem(SUBMISSION_STORAGE_KEY); } catch (_error) {}
  }

  function loadRecaptcha(siteKey) {
    if (global.grecaptcha) return waitForRecaptchaReady();
    return new Promise(function (resolve, reject) {
      const existing = document.querySelector("script[data-digitaltr-recaptcha]");
      if (existing) {
        existing.addEventListener("load", function () { waitForRecaptchaReady().then(resolve, reject); }, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://www.google.com/recaptcha/api.js?render=" + encodeURIComponent(siteKey);
      script.async = true;
      script.defer = true;
      script.dataset.digitaltrRecaptcha = "true";
      script.addEventListener("load", function () { waitForRecaptchaReady().then(resolve, reject); }, { once: true });
      script.addEventListener("error", function () { reject(new Error("reCAPTCHA could not be loaded.")); }, { once: true });
      document.head.appendChild(script);
    });
  }

  function waitForRecaptchaReady() {
    return new Promise(function (resolve, reject) {
      if (!global.grecaptcha || typeof global.grecaptcha.ready !== "function" ||
          typeof global.grecaptcha.execute !== "function") {
        reject(new Error("reCAPTCHA is unavailable."));
        return;
      }
      global.grecaptcha.ready(resolve);
    });
  }

  function isValidEnvelope(value) {
    return hasExactKeys(value, ["channel", "messageType", "payload", "protocolVersion", "requestId", "sessionNonce"]) &&
      value.channel === CHANNEL && value.protocolVersion === PROTOCOL_VERSION &&
      typeof value.messageType === "string" && UUID_PATTERN.test(value.requestId) &&
      UUID_PATTERN.test(value.sessionNonce) && isPlainObject(value.payload);
  }

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function hasExactKeys(value, expected) {
    if (!isPlainObject(value)) return false;
    const actual = Object.keys(value).sort();
    const wanted = expected.slice().sort();
    return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
  }

  function isTrustedBridgeOrigin(origin) {
    try {
      const url = new URL(origin);
      return url.protocol === "https:" &&
        /^[a-z0-9-]+-script\.googleusercontent\.com$/i.test(url.hostname) && url.origin === origin;
    } catch (_error) {
      return false;
    }
  }

  function isDescendantWindow(source, expectedRoot) {
    try {
      const queue = [expectedRoot];
      for (let depth = 0; depth < 4 && queue.length; depth += 1) {
        const count = queue.length;
        for (let index = 0; index < count; index += 1) {
          const current = queue.shift();
          if (current === source) return true;
          for (let frameIndex = 0; frameIndex < current.frames.length; frameIndex += 1) {
            queue.push(current.frames[frameIndex]);
          }
        }
      }
    } catch (_error) {}
    return false;
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  global.DigitalTRIntakeSubmissionAdapter = Object.freeze({ submit: submit });
})(window);
