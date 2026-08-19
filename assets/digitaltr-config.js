(function () {
  "use strict";

  const bridgeUrls = Object.freeze({
    stable: "https://script.google.com/macros/s/AKfycbwaOJnEvAnp9LOydEqUmFHruF0ie00q5BI7crSXgpETxndl-8MOTEP0Aysx7AQ_0NMD/exec",
    v104: "https://script.google.com/macros/s/AKfycbwQipSZ7-95_OLeMO3__xkVa2tlaDfFuZMXEaABt1dav8fAPG_aQMIXU2n2EHJB9_9s/exec"
  });
  const requestedBackend = new URLSearchParams(window.location.search).get("backend");
  const useV104Candidate = requestedBackend === "v104";

  const digitaltr = Object.freeze({
    status: "open",
    environment: "PRODUCTION",
    protocolVersion: "0.1",
    schemaVersion: "1.0",
    backendVersion: useV104Candidate ? "v1.0.4" : "v1.0.3",
    appsScriptBridgeUrl: useV104Candidate ? bridgeUrls.v104 : bridgeUrls.stable,
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
