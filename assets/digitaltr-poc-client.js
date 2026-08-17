(function(global) {
  'use strict';

  const DEFAULTS = Object.freeze({
    channel: 'METUDTX_DIGITALTR_BRIDGE',
    protocolVersion: '0.1',
    schemaVersion: '0.2-poc',
    handshakeTimeoutMs: 15000,
    rpcTimeoutMs: 60000,
    commitTimeoutMs: 240000
  });
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  class DigitalTRPocBridgeError extends Error {
    constructor(response) {
      super(response && response.message ? response.message : 'DigitalTR TEST bridge error');
      this.name = 'DigitalTRPocBridgeError';
      this.code = response && response.code ? response.code : 'TEMPORARY_SERVICE_ERROR';
      this.retryable = Boolean(response && response.retryable);
      this.fieldErrors = response && Array.isArray(response.fieldErrors) ? response.fieldErrors : [];
      this.submissionId = response && response.submissionId ? response.submissionId : null;
    }
  }

  class DigitalTRPocBridgeClient {
    constructor(options) {
      const config = Object.assign({}, DEFAULTS, options || {});
      if (!config.iframe || !config.iframe.contentWindow) {
        throw new Error('A loaded bridge iframe is required.');
      }

      this.iframe = config.iframe;
      this.bridgeOrigin = null;
      this.bridgeWindow = null;
      this.parentOrigin = global.location.origin;
      this.channel = config.channel;
      this.protocolVersion = config.protocolVersion;
      this.schemaVersion = config.schemaVersion;
      this.handshakeTimeoutMs = config.handshakeTimeoutMs;
      this.rpcTimeoutMs = config.rpcTimeoutMs;
      this.commitTimeoutMs = config.commitTimeoutMs;
      this.sessionNonce = global.crypto.randomUUID();
      this.pending = new Map();
      this.started = false;
      this.startPromise = null;
      this.discoveryTimeoutId = null;
      this.handshakeResolve = null;
      this.handshakeReject = null;
      this.submissionInFlight = false;
      this.queue = Promise.resolve();
      this.boundMessageHandler = this.handleMessage.bind(this);
    }

    start() {
      if (this.started) return this.startPromise || Promise.resolve(this);
      this.started = true;
      global.addEventListener('message', this.boundMessageHandler);
      this.startPromise = new Promise((resolve, reject) => {
        this.handshakeResolve = resolve;
        this.handshakeReject = reject;
        this.discoveryTimeoutId = global.setTimeout(() => {
          const error = new DigitalTRPocBridgeError({
            code: 'TEMPORARY_SERVICE_ERROR',
            message: 'DigitalTR TEST bridge keşif süresi aşıldı.',
            retryable: true
          });
          this.destroy(error);
        }, this.handshakeTimeoutMs);
      });
      return this.startPromise;
    }

    destroy(reason) {
      global.removeEventListener('message', this.boundMessageHandler);
      if (this.discoveryTimeoutId !== null) global.clearTimeout(this.discoveryTimeoutId);
      this.discoveryTimeoutId = null;
      this.pending.forEach(entry => {
        global.clearTimeout(entry.timeoutId);
        entry.reject(new Error('DigitalTR TEST bridge client closed.'));
      });
      this.pending.clear();
      if (this.handshakeReject) this.handshakeReject(reason || new Error('DigitalTR TEST bridge client closed.'));
      this.handshakeResolve = null;
      this.handshakeReject = null;
      this.bridgeWindow = null;
      this.bridgeOrigin = null;
      this.started = false;
      this.startPromise = null;
    }

    request(messageType, payload, timeoutMs) {
      const operation = () => this.send(messageType, payload, timeoutMs || this.rpcTimeoutMs);
      const promise = this.queue.then(operation, operation);
      this.queue = promise.catch(() => undefined);
      return promise;
    }

    send(messageType, payload, timeoutMs) {
      if (!this.bridgeWindow || !this.bridgeOrigin) {
        return Promise.reject(new Error('DigitalTR TEST bridge is not connected.'));
      }
      const requestId = global.crypto.randomUUID();
      const envelope = {
        channel: this.channel,
        protocolVersion: this.protocolVersion,
        messageType,
        requestId,
        sessionNonce: this.sessionNonce,
        payload
      };
      return new Promise((resolve, reject) => {
        const timeoutId = global.setTimeout(() => {
          this.pending.delete(requestId);
          reject(new DigitalTRPocBridgeError({
            code: 'TEMPORARY_SERVICE_ERROR',
            message: 'DigitalTR TEST bridge yanıt süresi aşıldı.',
            retryable: true
          }));
        }, timeoutMs);
        this.pending.set(requestId, { resolve, reject, timeoutId });
        this.bridgeWindow.postMessage(envelope, this.bridgeOrigin);
      });
    }

    handleMessage(event) {
      const envelope = event.data;
      if (!isValidEnvelope(envelope, this.channel, this.protocolVersion)) return;

      if (envelope.messageType === 'BRIDGE_READY') {
        this.handleReady(event, envelope);
        return;
      }

      if (event.source !== this.bridgeWindow || event.origin !== this.bridgeOrigin ||
          envelope.sessionNonce !== this.sessionNonce) return;
      const pending = this.pending.get(envelope.requestId);
      if (!pending) return;
      this.pending.delete(envelope.requestId);
      global.clearTimeout(pending.timeoutId);
      if (envelope.messageType === 'ERROR') {
        pending.reject(new DigitalTRPocBridgeError(envelope.payload));
      } else {
        pending.resolve(envelope.payload);
      }
    }

    handleReady(event, envelope) {
      if (this.bridgeWindow || !this.started || !isTrustedBridgeOrigin(event.origin) ||
          !isDescendantWindow(event.source, this.iframe.contentWindow) ||
          !hasExactKeys(envelope.payload, ['environment', 'ok', 'schemaVersion']) ||
          envelope.payload.ok !== true || envelope.payload.environment !== 'TEST' ||
          envelope.payload.schemaVersion !== this.schemaVersion) return;

      this.bridgeWindow = event.source;
      this.bridgeOrigin = event.origin;
      if (this.discoveryTimeoutId !== null) global.clearTimeout(this.discoveryTimeoutId);
      this.discoveryTimeoutId = null;

      this.send('INIT', {
        schemaVersion: this.schemaVersion,
        parentOrigin: this.parentOrigin
      }, this.handshakeTimeoutMs).then(() => {
        const resolve = this.handshakeResolve;
        this.handshakeResolve = null;
        this.handshakeReject = null;
        this.startPromise = Promise.resolve(this);
        if (resolve) resolve(this);
      }).catch(error => this.destroy(error));
    }

    async submitSyntheticPoc(values) {
      if (this.submissionInFlight) {
        throw new Error('A DigitalTR TEST submission is already in flight.');
      }
      this.submissionInFlight = true;
      try {
        const submissionId = values.submissionId || global.crypto.randomUUID();
        const submission = {
          protocolVersion: this.protocolVersion,
          schemaVersion: this.schemaVersion,
          submissionId,
          submittedAt: new Date().toISOString(),
          formLanguage: values.formLanguage || 'tr-TR',
          organization: { legalName: values.organizationLegalName },
          contact: { fullName: values.contactFullName, email: values.contactEmail },
          selectedServices: values.selectedServices.slice(),
          commonAnswers: { POC_TEST_TEXT: values.testText },
          serviceAnswers: {},
          declarations: { POC_SYNTHETIC_DATA_CONFIRMATION: true },
          bot: {
            provider: 'recaptcha-v3',
            action: 'digitaltr_poc_submit',
            token: values.recaptchaToken
          }
        };

        await this.request('SUBMISSION_BEGIN', { submission });
        return await this.request('SUBMISSION_COMMIT', { submissionId }, this.commitTimeoutMs);
      } finally {
        this.submissionInFlight = false;
      }
    }
  }

  function isValidEnvelope(value, channel, protocolVersion) {
    if (!isPlainObject(value)) return false;
    const keys = Object.keys(value).sort();
    const expected = ['channel', 'messageType', 'payload', 'protocolVersion', 'requestId', 'sessionNonce'];
    return keys.length === expected.length && keys.every((key, index) => key === expected[index]) &&
      value.channel === channel && value.protocolVersion === protocolVersion &&
      typeof value.messageType === 'string' && UUID_PATTERN.test(value.requestId) &&
      UUID_PATTERN.test(value.sessionNonce) && isPlainObject(value.payload);
  }

  function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
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
      return url.protocol === 'https:' &&
        /^[a-z0-9-]+-script\.googleusercontent\.com$/i.test(url.hostname) &&
        url.origin === origin;
    } catch (_error) {
      return false;
    }
  }

  function isDescendantWindow(source, expectedRoot) {
    try {
      const queue = [expectedRoot];
      for (let depth = 0; depth < 4 && queue.length; depth += 1) {
        const levelSize = queue.length;
        for (let index = 0; index < levelSize; index += 1) {
          const current = queue.shift();
          if (current === source) return true;
          for (let frameIndex = 0; frameIndex < current.frames.length; frameIndex += 1) {
            queue.push(current.frames[frameIndex]);
          }
        }
      }
    } catch (_error) {
      return false;
    }
    return false;
  }

  global.DigitalTRPocBridgeClient = DigitalTRPocBridgeClient;
  global.DigitalTRPocBridgeError = DigitalTRPocBridgeError;
})(window);
