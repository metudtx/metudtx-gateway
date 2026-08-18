(function () {
  "use strict";

  const digitaltr = Object.freeze({
    status: "open",
    environment: "PRODUCTION",
    protocolVersion: "0.1",
    schemaVersion: "1.0",
    appsScriptBridgeUrl: "https://script.google.com/macros/s/AKfycbwaOJnEvAnp9LOydEqUmFHruF0ie00q5BI7crSXgpETxndl-8MOTEP0Aysx7AQ_0NMD/exec",
    recaptchaSiteKey: "6LcZcYItAAAAACPoSrplnUZMsy8lNpZojLihjWZH",
    contactEmail: "digitaltr@metudtx.com",
    windowStart: "2026-07-03",
    windowEnd: "2026-09-30",
    formLanguages: Object.freeze({
      tr: "tr-TR",
      en: "en-GB"
    }),
    applicationSectionId: "digitaltr-application"
  });

  window.METUDTX_CONFIG = Object.freeze({
    ...(window.METUDTX_CONFIG || {}),
    digitaltr
  });
})();
