(function (global) {
  "use strict";

  const APP_ID_PATTERN = /^APP-\d{4}-\d{4}$/;
  const issuedIds = new Set();

  function createAppId(now) {
    const year = String(now.getUTCFullYear());
    let appId = "";

    do {
      const values = new Uint32Array(1);
      global.crypto.getRandomValues(values);
      appId = "APP-" + year + "-" + String(values[0] % 10000).padStart(4, "0");
    } while (issuedIds.has(appId));

    issuedIds.add(appId);
    return appId;
  }

  async function submit(payload) {
    const schema = global.DIGITALTR_INTAKE_SCHEMA;
    if (!schema || !payload || payload.schemaVersion !== schema.schemaVersion) {
      throw new Error("SCHEMA_MISMATCH");
    }
    if (!Array.isArray(payload.selectedServices) || payload.selectedServices.length === 0) {
      throw new Error("VALIDATION_ERROR");
    }

    const receivedAt = new Date();
    const appId = createAppId(receivedAt);
    if (!APP_ID_PATTERN.test(appId)) {
      throw new Error("APP_ID_ERROR");
    }

    return Object.freeze({
      appId: appId,
      receivedAt: receivedAt.toISOString(),
      selectedServices: Object.freeze(payload.selectedServices.slice())
    });
  }

  global.DigitalTRIntakeSubmissionAdapter = Object.freeze({
    submit: submit
  });
})(window);
