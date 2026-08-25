(function () {
  "use strict";

  const digitaltr = Object.freeze({
    status: "paused",
    environment: "PRODUCTION",
    protocolVersion: "0.1",
    schemaVersion: "1.0",
    backendVersion: "v1.0.4",
    appsScriptBridgeUrl: "https://script.google.com/macros/s/AKfycbzCxN2lP13ugzSBUzG4i7Qu-8wdEgyZ6J7R4h58HJcwhc0cWCgnCENv4ZbhZn8EkZ0/exec",
    officialApplicationUrl: "https://survey.digitaltr.org/basvuru",
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
