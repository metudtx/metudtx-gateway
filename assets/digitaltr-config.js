(function () {
  "use strict";

  const digitaltr = Object.freeze({
    status: "open",
    schemaVersion: "0.3-preview",
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
