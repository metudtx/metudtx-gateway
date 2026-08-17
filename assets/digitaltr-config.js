(function () {
  "use strict";

  const digitaltr = Object.freeze({
    status: "prelaunch",
    environment: "TEST",
    protocolVersion: "0.1",
    schemaVersion: "0.2-poc",
    appsScriptBridgeUrl: "https://script.google.com/macros/s/AKfycbwJQHlAZ3yu2rKBy40Lth6wRLGsw637UGo5mk-47kx538EdBqPyxoWQz16Hh9B3pWI4/exec",
    recaptchaSiteKey: "6LcZcYItAAAAACPoSrplnUZMsy8lNpZojLihjWZH",
    officialCallDocumentUrl: "https://digitaltr.org/wp-content/uploads/2026/07/ACIK-CAGRI-BASVURU-DOKUMANI.pdf",
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
