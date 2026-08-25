(function (global) {
  "use strict";

  const CHANNEL = "METUDTX_DIGITALTR_BRIDGE";
  const PROTOCOL_VERSION = "0.1";
  const SCHEMA_VERSION = "1.0";
  const BOT_PROVIDER = "none";
  const BOT_ACTION = "not-required";
  const BOT_TOKEN = "not-required";
  const SUBMISSION_STORAGE_KEY = "metudtx.digitaltr.submissionId";
  const POST_TIMEOUT_MS = 120000;
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

  let submissionInFlight = false;

  function settings() {
    const config = global.METUDTX_CONFIG && global.METUDTX_CONFIG.digitaltr;
    if (!config || config.status !== "open" || config.schemaVersion !== SCHEMA_VERSION || config.protocolVersion !== PROTOCOL_VERSION ||
        (config.environment !== "TEST" && config.environment !== "PRODUCTION") ||
        typeof config.appsScriptBridgeUrl !== "string") {
      throw new Error("DigitalTR backend configuration is unavailable.");
    }
    const bridgeUrl = new URL(config.appsScriptBridgeUrl);
    if (bridgeUrl.protocol !== "https:" || bridgeUrl.hostname !== "script.google.com") {
      throw new Error("DigitalTR backend URL is invalid.");
    }
    return {
      bridgeUrl: bridgeUrl.href,
      environment: config.environment
    };
  }

  function postSubmission(payload) {
    const config = settings();
    const requestId = generateUuid();
    const sessionNonce = generateUuid();
    const frameName = "digitaltr-intake-post-" + sessionNonce;
    const iframe = document.createElement("iframe");
    iframe.id = "digitaltr-intake-post";
    iframe.name = frameName;
    iframe.title = "DigitalTR intake response";
    iframe.setAttribute("aria-hidden", "true");
    iframe.setAttribute("tabindex", "-1");
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.style.position = "absolute";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

    return new Promise(function (resolve, reject) {
      let timeoutId = null;
      let settled = false;

      function cleanup() {
        global.removeEventListener("message", handleMessage);
        if (timeoutId !== null) global.clearTimeout(timeoutId);
        timeoutId = null;
        iframe.remove();
      }

      function finish(callback, value) {
        if (settled) return;
        settled = true;
        cleanup();
        callback(value);
      }

      function handleMessage(event) {
        const envelope = event.data;
        if (!isValidEnvelope(envelope) || !isTrustedBridgeOrigin(event.origin) ||
            envelope.requestId !== requestId || envelope.sessionNonce !== sessionNonce ||
            (envelope.messageType !== "SUBMISSION_SUCCESS" && envelope.messageType !== "ERROR")) return;
        if (envelope.messageType === "ERROR") {
          finish(reject, new DigitalTRBridgeError(envelope.payload));
          return;
        }
        finish(resolve, envelope.payload);
      }

      global.addEventListener("message", handleMessage);
      timeoutId = global.setTimeout(function () {
        finish(reject, new DigitalTRBridgeError({
          code: "TEMPORARY_SERVICE_ERROR",
          message: "DigitalTR submission response timed out.",
          retryable: true
        }));
      }, POST_TIMEOUT_MS);

      const form = document.createElement("form");
      const input = document.createElement("input");
      form.method = "post";
      form.action = config.bridgeUrl;
      form.target = frameName;
      form.enctype = "application/x-www-form-urlencoded";
      form.style.display = "none";
      input.type = "hidden";
      input.name = "requestJson";
      input.value = JSON.stringify({
        channel: CHANNEL,
        protocolVersion: PROTOCOL_VERSION,
        messageType: "SUBMISSION_COMMIT",
        requestId: requestId,
        sessionNonce: sessionNonce,
        parentOrigin: global.location.origin,
        payload: payload
      });
      form.appendChild(input);
      document.body.appendChild(form);
      try {
        form.submit();
      } catch (error) {
        finish(reject, error);
      } finally {
        form.remove();
      }
    });
  }

  async function submit(payload) {
    if (submissionInFlight) throw new Error("A DigitalTR submission is already in flight.");
    validatePublicPayload(payload);
    submissionInFlight = true;
    try {
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
          provider: BOT_PROVIDER,
          action: BOT_ACTION,
          token: BOT_TOKEN
        }
      };
      const response = await postSubmission({ submission: submission });
      if (!response || response.ok !== true || response.environment !== settings().environment ||
          response.schemaVersion !== SCHEMA_VERSION || !APP_ID_PATTERN.test(response.appId) ||
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
    value = generateUuid();
    try { global.sessionStorage.setItem(SUBMISSION_STORAGE_KEY, value); } catch (_error) {}
    return value;
  }

  function clearSubmissionId() {
    try { global.sessionStorage.removeItem(SUBMISSION_STORAGE_KEY); } catch (_error) {}
  }

  function generateUuid() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    if (!global.crypto || typeof global.crypto.getRandomValues !== "function") {
      throw new Error("Secure UUID generation is unavailable.");
    }
    const bytes = new Uint8Array(16);
    global.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, function (byte) {
      return ("0" + byte.toString(16)).slice(-2);
    }).join("");
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20)
    ].join("-");
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

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  global.DigitalTRIntakeSubmissionAdapter = Object.freeze({ submit: submit });
})(window);


(function () {
  "use strict";

  const config = window.METUDTX_CONFIG && window.METUDTX_CONFIG.digitaltr;
  const schema = window.DIGITALTR_INTAKE_SCHEMA;
  const adapter = window.DigitalTRIntakeSubmissionAdapter;
  const language = document.documentElement.lang === "tr" ? "tr" : "en";
  const locale = language === "tr" ? "tr-TR" : "en-GB";

  const ui = {
    tr: {
      open: "Başvuruya Başla",
      pausedCta: "Resmî DIGITALTR Başvuru Portalına Git",
      pausedWindow: "METU DTX üzerinden yeni başvuru alımı durduruldu",
      pausedTitle: "METU DTX başvuru formu pasife alındı",
      pausedBody: "DIGITALTR’ın resmî başvuru sistemi değiştiği için bu form üzerinden yeni başvuru alınmamaktadır. Yeni başvurular kayıt ve token bağlantısı ile resmî DIGITALTR portalı üzerinden yürütülmektedir.",
      pausedHero: "DIGITALTR’ın resmî başvuru akışı değişmiştir. METU DTX üzerindeki form pasife alınmış olup yeni başvurular resmî DIGITALTR portalı üzerinden yürütülmektedir.",
      pausedSectionIntro: "Bu form yeni başvurulara kapatılmıştır. Devam etmek için resmî DIGITALTR başvuru portalını kullanın.",
      windowPrefix: "İlk başvuru dönemi",
      emailSubject: "DigitalTR başvurusu hakkında",
      contact: "DigitalTR başvurusu hakkında iletişime geçin",
      formTitle: "DIGITALTR başvuru formu",
      formIntro: "Şirket ve iletişim bilgilerinizi bir kez girin; bir veya birden fazla hizmet seçerek yalnız ilgili bölümleri tamamlayın.",
      requiredNote: "* işaretli alanlar zorunludur.",
      required: "Zorunlu",
      selectPrompt: "Seçin",
      sectionNav: "Başvuru bölümleri",
      addPartner: "Proje ortağı ekle",
      removePartner: "Ortağı kaldır",
      partnerTitle: "Ek proje ortağı",
      submit: "Başvuruyu Gönder",
      submitting: "Başvurunuz gönderiliyor…",
      submissionWait: "Lütfen sonuç bildirimi görünene kadar bu sayfayı kapatmayın veya yenilemeyin.",
      validationTitle: "Başvuruyu göndermeden önce aşağıdaki alanları düzeltin:",
      requiredError: "Bu alan zorunludur.",
      selectionError: "En az bir seçenek belirleyin.",
      serviceError: "En az bir hizmet seçin.",
      emailError: "Geçerli bir e-posta adresi girin.",
      urlError: "Geçerli bir web adresi girin.",
      phoneError: "Geçerli bir telefon numarası girin.",
      numberError: "İzin verilen aralıkta bir sayı girin.",
      lengthError: "Bu alandaki metin izin verilen uzunlukta olmalıdır.",
      wordError: "Bu alan {count} kelimeyi aşmamalıdır.",
      inHouseError: "En az bir oran girin veya şirket içinde geliştirme olmadığını belirtin.",
      backendFieldError: "Bu alan backend doğrulamasından geçmedi.",
      genericError: "Başvuru gönderilemedi. Lütfen yeniden deneyin.",
      errorCode: "Hata kodu",
      successTitle: "Başvurunuz alındı",
      successBody: "Başvurunuz başarıyla alınmıştır.",
      appId: "APP ID",
      selectedServices: "Seçilen hizmetler",
      receivedAt: "Kayıt zamanı"
    },
    en: {
      open: "Start Application",
      pausedCta: "Go to the Official DIGITALTR Application Portal",
      pausedWindow: "New applications through METU DTX are paused",
      pausedTitle: "The METU DTX application form is inactive",
      pausedBody: "The official DIGITALTR application system has changed, so new applications are no longer accepted through this form. New applications now proceed through registration and a token link on the official DIGITALTR portal.",
      pausedHero: "The official DIGITALTR application flow has changed. The METU DTX form is inactive, and new applications now proceed through the official DIGITALTR portal.",
      pausedSectionIntro: "This form is closed to new applications. Use the official DIGITALTR application portal to continue.",
      windowPrefix: "First application window",
      emailSubject: "Question about the DIGITALTR application",
      contact: "Contact us about the DIGITALTR application",
      formTitle: "DIGITALTR application form",
      formIntro: "Enter your company and contact details once, then select one or more services and complete only the relevant sections.",
      requiredNote: "Fields marked * are required.",
      required: "Required",
      selectPrompt: "Select",
      sectionNav: "Application sections",
      addPartner: "Add project partner",
      removePartner: "Remove partner",
      partnerTitle: "Additional project partner",
      submit: "Submit Application",
      submitting: "Your application is being submitted…",
      submissionWait: "Please keep this page open and do not refresh it until the confirmation appears.",
      validationTitle: "Correct the following fields before submitting the application:",
      requiredError: "This field is required.",
      selectionError: "Select at least one option.",
      serviceError: "Select at least one service.",
      emailError: "Enter a valid email address.",
      urlError: "Enter a valid web address.",
      phoneError: "Enter a valid phone number.",
      numberError: "Enter a number within the permitted range.",
      lengthError: "The text in this field must be within the permitted length.",
      wordError: "This field must not exceed {count} words.",
      inHouseError: "Enter at least one percentage or state that there is no in-house development.",
      backendFieldError: "This field did not pass backend validation.",
      genericError: "The application could not be submitted. Please try again.",
      errorCode: "Error code",
      successTitle: "Application received",
      successBody: "Your application has been received successfully.",
      appId: "APP ID",
      selectedServices: "Selected services",
      receivedAt: "Recorded at"
    }
  }[language];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (typeof text === "string") {
      node.textContent = text;
    }
    return node;
  }

  function localized(value) {
    return value && typeof value[language] === "string" ? value[language] : "";
  }

  function idPart(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function parseDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }
    const date = new Date(value + "T00:00:00Z");
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatWindowLabel() {
    const start = config && parseDate(config.windowStart);
    const end = config && parseDate(config.windowEnd);
    if (!start || !end) {
      return "";
    }
    const startFormatter = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      timeZone: "UTC"
    });
    const endFormatter = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    });
    return ui.windowPrefix + ": " + startFormatter.format(start) + "–" + endFormatter.format(end);
  }

  function officialApplicationUrl() {
    if (!config || typeof config.officialApplicationUrl !== "string") {
      return "";
    }
    try {
      const url = new URL(config.officialApplicationUrl);
      if (url.protocol !== "https:" || url.hostname !== "survey.digitaltr.org" || url.pathname !== "/basvuru") {
        return "";
      }
      return url.href;
    } catch (_error) {
      return "";
    }
  }

  function makeContactLink(className) {
    if (!config || typeof config.contactEmail !== "string" || !config.contactEmail.includes("@")) {
      return null;
    }
    const link = element("a", className || "");
    link.href = "mailto:" + config.contactEmail + "?subject=" + encodeURIComponent(ui.emailSubject);
    return link;
  }

  function populatePublicPage() {
    const isOpen = Boolean(config && config.status === "open");
    document.querySelectorAll("[data-window-label]").forEach(function (node) {
      const label = isOpen ? formatWindowLabel() : ui.pausedWindow;
      if (label) {
        node.textContent = label;
      }
    });

    document.querySelectorAll("[data-contact-link]").forEach(function (slot) {
      const link = makeContactLink(slot.dataset.contactClass || "");
      if (!link) {
        slot.hidden = true;
        return;
      }
      link.textContent = slot.dataset.contactText === "email" ? config.contactEmail : ui.contact;
      slot.replaceChildren(link);
      slot.hidden = false;
    });

    document.querySelectorAll("[data-digitaltr-primary-cta]").forEach(function (slot) {
      const link = element(
        "a",
        slot.dataset.placement === "nav" ? "nav-cta" : "button primary",
        isOpen ? ui.open : ui.pausedCta
      );
      if (isOpen) {
        link.href = "#" + config.applicationSectionId;
      } else {
        const officialUrl = officialApplicationUrl();
        if (!officialUrl) {
          slot.hidden = true;
          return;
        }
        link.href = officialUrl;
      }
      slot.replaceChildren(link);
      slot.hidden = false;
    });

    if (!isOpen) {
      const heroLead = document.querySelector(".hero .lead");
      if (heroLead) {
        heroLead.textContent = ui.pausedHero;
      }
      const processSection = document.querySelector('[aria-labelledby="process-title"]');
      if (processSection) {
        processSection.hidden = true;
      }
      const applicationSection = document.querySelector("[data-digitaltr-application-section]");
      if (applicationSection) {
        const heading = applicationSection.querySelector(".section-title h2");
        const intro = applicationSection.querySelector(".section-title p");
        if (heading) heading.textContent = ui.pausedTitle;
        if (intro) intro.textContent = ui.pausedSectionIntro;
      }
    }
  }

  function requiredMarker(target) {
    const marker = element("span", "digitaltr-form__required", " *");
    marker.setAttribute("aria-hidden", "true");
    target.appendChild(marker);
    const hidden = element("span", "digitaltr-form__visually-hidden", " (" + ui.required + ")");
    target.appendChild(hidden);
  }

  function applyInputConstraints(control, field) {
    const rules = field.validation || {};
    if (typeof rules.minLength === "number") {
      control.minLength = rules.minLength;
    }
    if (typeof rules.maxLength === "number") {
      control.maxLength = rules.maxLength;
    }
    if (rules.min !== undefined) {
      control.min = rules.min;
    }
    if (rules.max !== undefined) {
      control.max = rules.max;
    }
    if (rules.step !== undefined) {
      control.step = rules.step;
    }
  }

  function renderChoiceGroup(field, fieldId, name) {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "digitaltr-form__choice-fieldset";
    const legend = element("legend", "digitaltr-form__label", localized(field.label));
    if (field.required) {
      requiredMarker(legend);
    }
    fieldset.appendChild(legend);

    const choices = element(
      "div",
      field.fieldKey === "APPLICANT_SELECTED_SERVICES"
        ? "digitaltr-form__service-grid"
        : "digitaltr-form__choices"
    );
    const controls = [];
    field.options.forEach(function (option, index) {
      const optionId = fieldId + "-" + String(index + 1);
      const label = element(
        "label",
        field.fieldKey === "APPLICANT_SELECTED_SERVICES"
          ? "digitaltr-form__service-card"
          : "digitaltr-form__choice"
      );
      const input = document.createElement("input");
      input.type = field.type === "radio-group" ? "radio" : "checkbox";
      input.id = optionId;
      input.name = name;
      input.value = option.value;
      const labelText = element("span", "", localized(option.label));
      label.append(input, labelText);

      if (field.fieldKey === "APPLICANT_SELECTED_SERVICES") {
        const service = schema.services.find(function (item) {
          return item.code === option.value;
        });
        labelText.className = "digitaltr-form__service-card-content";
        const strong = element("strong", "", localized(option.label));
        const description = element("span", "", service ? localized(service.description) : "");
        labelText.replaceChildren(strong, description);
        input.addEventListener("change", function () {
          label.dataset.selected = input.checked ? "true" : "false";
        });
      }

      choices.appendChild(label);
      controls.push(input);
    });
    fieldset.appendChild(choices);
    return { container: fieldset, controls: controls, focusTarget: controls[0] };
  }

  function renderSingleControl(field, fieldId, name) {
    const control = field.type === "textarea"
      ? document.createElement("textarea")
      : field.type === "select"
        ? document.createElement("select")
        : document.createElement("input");

    control.id = fieldId;
    control.name = name;
    control.autocomplete = field.autocomplete || "off";

    if (control.tagName === "INPUT") {
      control.type = field.type;
    }
    if (control.tagName === "SELECT") {
      const empty = element("option", "", ui.selectPrompt);
      empty.value = "";
      control.appendChild(empty);
      field.options.forEach(function (option) {
        const node = element("option", "", localized(option.label));
        node.value = option.value;
        control.appendChild(node);
      });
    }
    applyInputConstraints(control, field);
    return { container: control, controls: [control], focusTarget: control };
  }

  function renderCheckbox(field, fieldId, name) {
    const label = element("label", "digitaltr-form__choice digitaltr-form__choice--statement");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = fieldId;
    input.name = name;
    const labelText = element("span", "", localized(field.label));
    if (field.required) {
      requiredMarker(labelText);
    }
    label.append(input, labelText);
    return { container: label, controls: [input], focusTarget: input, labelInside: true };
  }

  function renderField(field, prefix) {
    const instancePrefix = prefix ? prefix + "-" : "";
    const fieldId = "digitaltr-" + instancePrefix + idPart(field.fieldKey);
    const fieldName = prefix
      ? "partners[" + prefix + "][" + field.fieldKey + "]"
      : field.fieldKey;
    const full = field.type === "textarea" ||
      field.type === "checkbox-group" ||
      field.type === "radio-group" ||
      field.type === "checkbox" ||
      field.fieldKey === "ORG_ADDRESS";
    const wrapper = element("div", "digitaltr-form__field" + (full ? " digitaltr-form__field--full" : ""));
    wrapper.dataset.fieldKey = field.fieldKey;

    let rendered;
    if (field.type === "checkbox-group" || field.type === "radio-group") {
      rendered = renderChoiceGroup(field, fieldId, fieldName);
      wrapper.appendChild(rendered.container);
    } else if (field.type === "checkbox") {
      rendered = renderCheckbox(field, fieldId, fieldName);
      wrapper.appendChild(rendered.container);
    } else {
      const label = element("label", "", localized(field.label));
      label.htmlFor = fieldId;
      if (field.required) {
        requiredMarker(label);
      }
      rendered = renderSingleControl(field, fieldId, fieldName);
      wrapper.append(label, rendered.container);
    }

    const describedBy = [];
    const helpText = localized(field.help);
    if (helpText || field.validation.maxWords) {
      let visibleHelp = helpText;
      if (field.validation.maxWords) {
        const wordText = language === "tr"
          ? "En fazla " + field.validation.maxWords + " kelime."
          : "Maximum " + field.validation.maxWords + " words.";
        visibleHelp = visibleHelp ? visibleHelp + " " + wordText : wordText;
      }
      const help = element("span", "digitaltr-form__help", visibleHelp);
      help.id = fieldId + "-help";
      wrapper.appendChild(help);
      describedBy.push(help.id);
    }

    const error = element("span", "digitaltr-form__error");
    error.id = fieldId + "-error";
    error.hidden = true;
    wrapper.appendChild(error);
    describedBy.push(error.id);

    rendered.controls.forEach(function (control) {
      control.setAttribute("aria-describedby", describedBy.join(" "));
    });
    if (rendered.container.tagName === "FIELDSET") {
      rendered.container.setAttribute("aria-describedby", describedBy.join(" "));
    }

    return {
      field: field,
      wrapper: wrapper,
      controls: rendered.controls,
      focusTarget: rendered.focusTarget,
      error: error
    };
  }

  function readValue(reference) {
    if (!reference || reference.controls.length === 0) {
      return "";
    }
    if (reference.field.type === "checkbox-group") {
      return reference.controls.filter(function (control) {
        return control.checked;
      }).map(function (control) {
        return control.value;
      });
    }
    if (reference.field.type === "radio-group") {
      const selected = reference.controls.find(function (control) {
        return control.checked;
      });
      return selected ? selected.value : "";
    }
    if (reference.field.type === "checkbox") {
      return reference.controls[0].checked;
    }
    return reference.controls[0].value.trim();
  }

  function serviceSelection(view) {
    return new Set(readValue(view.refs.get("APPLICANT_SELECTED_SERVICES")));
  }

  function fieldValue(view, fieldKey, partner) {
    const reference = partner
      ? partner.refs.get(fieldKey)
      : view.refs.get(fieldKey);
    return readValue(reference);
  }

  function ruleMatches(rule, view, partner) {
    if (!rule || rule.type === "always") {
      return true;
    }
    if (rule.all) {
      return rule.all.every(function (childRule) {
        return ruleMatches(childRule, view, partner);
      });
    }
    if (rule.serviceSelected) {
      return serviceSelection(view).has(rule.serviceSelected);
    }

    const dependentKey = rule.repeatableFieldKey || rule.fieldKey;
    const value = fieldValue(view, dependentKey, rule.repeatableFieldKey ? partner : null);
    if (rule.contains) {
      return Array.isArray(value) && value.includes(rule.contains);
    }
    if (Object.prototype.hasOwnProperty.call(rule, "equals")) {
      return value === rule.equals;
    }
    return true;
  }

  function clearError(reference) {
    reference.error.hidden = true;
    reference.error.textContent = "";
    reference.controls.forEach(function (control) {
      control.removeAttribute("aria-invalid");
    });
    const fieldset = reference.wrapper.querySelector("fieldset");
    if (fieldset) {
      fieldset.removeAttribute("aria-invalid");
    }
  }

  function setError(reference, message) {
    reference.error.textContent = message;
    reference.error.hidden = false;
    reference.controls.forEach(function (control) {
      control.setAttribute("aria-invalid", "true");
    });
    const fieldset = reference.wrapper.querySelector("fieldset");
    if (fieldset) {
      fieldset.setAttribute("aria-invalid", "true");
    }
  }

  function setReferenceVisible(reference, visible) {
    reference.wrapper.hidden = !visible;
    reference.controls.forEach(function (control) {
      control.disabled = !visible;
    });
    if (!visible) {
      clearError(reference);
    }
  }

  function updatePartnerTitles(view) {
    view.partners.forEach(function (partner, index) {
      partner.title.textContent = ui.partnerTitle + " " + String(index + 1);
    });
  }

  function updateVisibility(view) {
    const selected = serviceSelection(view);

    view.sections.forEach(function (sectionState) {
      const visible = sectionState.schema.serviceCode === "COMMON" || selected.has(sectionState.schema.serviceCode);
      sectionState.node.hidden = !visible;
      sectionState.navItem.hidden = !visible;
      sectionState.node.querySelectorAll("input, select, textarea, button").forEach(function (control) {
        control.disabled = !visible;
      });
    });

    view.refs.forEach(function (reference) {
      const sectionState = view.sections.get(reference.field.sectionKey);
      const sectionVisible = sectionState && !sectionState.node.hidden;
      setReferenceVisible(reference, Boolean(sectionVisible && ruleMatches(reference.field.conditionalVisibility, view, null)));
    });

    view.partners.forEach(function (partner) {
      const partnerSection = view.sections.get("s4-partners");
      const partnerSectionVisible = partnerSection && !partnerSection.node.hidden;
      partner.refs.forEach(function (reference) {
        setReferenceVisible(reference, Boolean(
          partnerSectionVisible && ruleMatches(reference.field.conditionalVisibility, view, partner)
        ));
      });
    });
  }

  function addPartner(view) {
    const partnerNumber = view.nextPartnerNumber;
    view.nextPartnerNumber += 1;
    const partner = {
      key: "p" + String(partnerNumber),
      refs: new Map()
    };
    const card = element("article", "digitaltr-form__partner");
    const header = element("div", "digitaltr-form__partner-header");
    partner.title = element("h4", "", ui.partnerTitle);
    const remove = element("button", "digitaltr-form__button digitaltr-form__button--secondary", ui.removePartner);
    remove.type = "button";
    header.append(partner.title, remove);

    const grid = element("div", "digitaltr-form__grid");
    schema.partnerFields.forEach(function (field) {
      const reference = renderField(field, partner.key);
      partner.refs.set(field.fieldKey, reference);
      grid.appendChild(reference.wrapper);
    });
    card.append(header, grid);
    partner.card = card;
    view.partnerList.appendChild(card);
    view.partners.push(partner);
    updatePartnerTitles(view);
    updateVisibility(view);

    partner.refs.forEach(function (reference) {
      reference.controls.forEach(function (control) {
        control.addEventListener("input", function () {
          clearError(reference);
          syncInHouseChoice(partner.refs, control);
          updateVisibility(view);
        });
        control.addEventListener("change", function () {
          clearError(reference);
          syncInHouseChoice(partner.refs, control);
          updateVisibility(view);
        });
      });
    });

    remove.addEventListener("click", function () {
      const index = view.partners.indexOf(partner);
      if (index !== -1) {
        view.partners.splice(index, 1);
      }
      card.remove();
      updatePartnerTitles(view);
      view.addPartnerButton.focus();
    });

    const first = partner.refs.get("DTR_S4_PARTNER_ORG_LEGAL_NAME");
    if (first) {
      first.focusTarget.focus();
    }
  }

  function referenceBySuffix(refs, suffix) {
    for (const entry of refs.entries()) {
      if (entry[0].endsWith(suffix)) {
        return entry[1];
      }
    }
    return null;
  }

  function syncInHouseChoice(refs, changedControl) {
    const none = referenceBySuffix(refs, "NO_IN_HOUSE_DEVELOPMENT");
    const percentages = [
      referenceBySuffix(refs, "OWN_PRODUCT_PERCENT"),
      referenceBySuffix(refs, "OWN_SERVICE_PERCENT"),
      referenceBySuffix(refs, "OWN_SOFTWARE_PERCENT")
    ].filter(Boolean);
    if (!none) {
      return;
    }
    if (changedControl === none.controls[0] && none.controls[0].checked) {
      percentages.forEach(function (reference) {
        reference.controls[0].value = "";
        clearError(reference);
      });
      return;
    }
    if (percentages.some(function (reference) {
      return changedControl === reference.controls[0] && reference.controls[0].value !== "";
    })) {
      none.controls[0].checked = false;
      clearError(none);
    }
  }

  function renderSection(view, sectionSchema) {
    const section = element("section", "digitaltr-form__section");
    section.id = "digitaltr-section-" + idPart(sectionSchema.key);
    section.setAttribute("aria-labelledby", section.id + "-title");
    const header = element("div", "digitaltr-form__section-header");
    const heading = element("h3", "", localized(sectionSchema.label));
    heading.id = section.id + "-title";
    header.appendChild(heading);
    const description = localized(sectionSchema.description);
    if (description) {
      header.appendChild(element("p", "digitaltr-form__section-description", description));
    }
    section.appendChild(header);

    if (sectionSchema.repeatable === "DTR_S4_PARTNERS") {
      view.partnerList = element("div", "digitaltr-form__partner-list");
      view.addPartnerButton = element("button", "digitaltr-form__button digitaltr-form__button--secondary", ui.addPartner);
      view.addPartnerButton.type = "button";
      view.addPartnerButton.addEventListener("click", function () {
        addPartner(view);
      });
      const controls = element("div", "digitaltr-form__partner-controls");
      controls.appendChild(view.addPartnerButton);
      section.append(view.partnerList, controls);
    } else {
      const grid = element("div", "digitaltr-form__grid");
      schema.fields.filter(function (field) {
        return field.sectionKey === sectionSchema.key && field.type !== "computed";
      }).forEach(function (field) {
        const reference = renderField(field, "");
        view.refs.set(field.fieldKey, reference);
        grid.appendChild(reference.wrapper);
      });
      section.appendChild(grid);
    }

    const navItem = document.createElement("li");
    const navLink = element("a", "", localized(sectionSchema.label));
    navLink.href = "#" + section.id;
    navItem.appendChild(navLink);
    view.navList.appendChild(navItem);
    view.sections.set(sectionSchema.key, {
      schema: sectionSchema,
      node: section,
      navItem: navItem
    });
    view.form.appendChild(section);
  }

  function validationMessage(reference) {
    const field = reference.field;
    const rules = field.validation || {};
    const value = readValue(reference);

    if (field.required) {
      if (field.type === "checkbox" && value !== true) {
        return ui.requiredError;
      }
      if (Array.isArray(value) && value.length === 0) {
        return field.fieldKey === "APPLICANT_SELECTED_SERVICES" ? ui.serviceError : ui.selectionError;
      }
      if (!Array.isArray(value) && field.type !== "checkbox" && value === "") {
        return ui.requiredError;
      }
    }
    if (value === "" || (Array.isArray(value) && value.length === 0) || value === false) {
      return "";
    }
    if (Array.isArray(value)) {
      if (typeof rules.minSelections === "number" && value.length < rules.minSelections) {
        return ui.selectionError;
      }
      if (typeof rules.maxSelections === "number" && value.length > rules.maxSelections) {
        return ui.selectionError;
      }
      return "";
    }
    if (typeof value === "string") {
      if ((typeof rules.minLength === "number" && value.length < rules.minLength) ||
        (typeof rules.maxLength === "number" && value.length > rules.maxLength)) {
        return ui.lengthError;
      }
      if (typeof rules.maxWords === "number") {
        const words = value.split(/\s+/).filter(Boolean).length;
        if (words > rules.maxWords) {
          return ui.wordError.replace("{count}", String(rules.maxWords));
        }
      }
      if (rules.format === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return ui.emailError;
      }
      if (rules.format === "phone" && !/^[+0-9().\s-]{7,40}$/.test(value)) {
        return ui.phoneError;
      }
      if (rules.format === "url") {
        try {
          const url = new URL(value);
          if (url.protocol !== "https:" && url.protocol !== "http:") {
            return ui.urlError;
          }
        } catch (_error) {
          return ui.urlError;
        }
      }
    }
    if (field.type === "number") {
      const number = Number(value);
      const base = rules.min !== undefined ? Number(rules.min) : 0;
      const stepMismatch = typeof rules.step === "number" &&
        Math.abs(((number - base) / rules.step) - Math.round((number - base) / rules.step)) > 1e-9;
      if (!Number.isFinite(number) ||
        (rules.min !== undefined && number < Number(rules.min)) ||
        (rules.max !== undefined && number > Number(rules.max)) ||
        stepMismatch) {
        return ui.numberError;
      }
    }
    if (field.type === "month" &&
      ((rules.min && value < rules.min) || (rules.max && value > rules.max))) {
      return ui.numberError;
    }
    if (Array.isArray(rules.allowedValues) && !rules.allowedValues.includes(value)) {
      return ui.selectionError;
    }
    if (rules.mustBe === true && value !== true) {
      return ui.requiredError;
    }
    return "";
  }

  function validateInHouseGroup(refs, errors) {
    const none = referenceBySuffix(refs, "NO_IN_HOUSE_DEVELOPMENT");
    const percentages = [
      referenceBySuffix(refs, "OWN_PRODUCT_PERCENT"),
      referenceBySuffix(refs, "OWN_SERVICE_PERCENT"),
      referenceBySuffix(refs, "OWN_SOFTWARE_PERCENT")
    ].filter(Boolean);
    if (!none || none.wrapper.hidden || none.controls[0].checked) {
      return;
    }
    const hasPercentage = percentages.some(function (reference) {
      return !reference.wrapper.hidden && readValue(reference) !== "";
    });
    if (!hasPercentage && percentages.length > 0) {
      const reference = percentages[0];
      setError(reference, ui.inHouseError);
      errors.push({ reference: reference, message: ui.inHouseError });
    }
  }

  function validate(view) {
    const errors = [];
    view.refs.forEach(function (reference) {
      clearError(reference);
      if (reference.wrapper.hidden || reference.controls.every(function (control) { return control.disabled; })) {
        return;
      }
      const message = validationMessage(reference);
      if (message) {
        setError(reference, message);
        errors.push({ reference: reference, message: message });
      }
    });
    validateInHouseGroup(view.refs, errors);
    view.partners.forEach(function (partner) {
      partner.refs.forEach(function (reference) {
        clearError(reference);
        if (reference.wrapper.hidden || reference.controls.every(function (control) { return control.disabled; })) {
          return;
        }
        const message = validationMessage(reference);
        if (message) {
          setError(reference, message);
          errors.push({ reference: reference, message: message });
        }
      });
      validateInHouseGroup(partner.refs, errors);
    });
    return errors;
  }

  function showErrorSummary(view, errors) {
    view.errorList.replaceChildren();
    errors.forEach(function (error) {
      const item = document.createElement("li");
      const link = element("a", "", localized(error.reference.field.label) + ": " + error.message);
      link.href = "#" + error.reference.focusTarget.id;
      link.addEventListener("click", function (event) {
        event.preventDefault();
        error.reference.focusTarget.focus();
      });
      item.appendChild(link);
      view.errorList.appendChild(item);
    });
    view.errorSummary.hidden = errors.length === 0;
    if (errors.length > 0) {
      view.errorSummary.focus();
    }
  }

  function backendValidationErrors(view, error) {
    if (!error || !Array.isArray(error.fieldErrors)) {
      return [];
    }
    const errors = [];
    error.fieldErrors.forEach(function (fieldError) {
      if (!fieldError || typeof fieldError.fieldKey !== "string") {
        return;
      }
      let reference = null;
      const partnerMatch = /^partners\[(\d+)\]\.([A-Z0-9_]+)$/.exec(fieldError.fieldKey);
      if (partnerMatch) {
        const partner = view.partners[Number(partnerMatch[1])];
        reference = partner && partner.refs.get(partnerMatch[2]);
      } else {
        const fieldKey = fieldError.fieldKey === "selectedServices"
          ? "APPLICANT_SELECTED_SERVICES"
          : fieldError.fieldKey;
        reference = view.refs.get(fieldKey);
      }
      if (!reference || reference.wrapper.hidden) {
        return;
      }
      let message = ui.backendFieldError;
      if (fieldError.code === "REQUIRED" || fieldError.code === "MUST_BE_TRUE") {
        message = ui.requiredError;
      } else if (fieldError.code === "INVALID_EMAIL") {
        message = ui.emailError;
      } else if (fieldError.code === "INVALID_URL") {
        message = ui.urlError;
      } else if (fieldError.code === "INVALID_PHONE") {
        message = ui.phoneError;
      } else if (/NUMBER|STEP|MONTH/.test(fieldError.code || "")) {
        message = ui.numberError;
      } else if (/SELECTION|ENUM|ARRAY/.test(fieldError.code || "")) {
        message = ui.selectionError;
      } else if (/IN_HOUSE/.test(fieldError.code || "")) {
        message = ui.inHouseError;
      } else if (/STRING|WORDS/.test(fieldError.code || "")) {
        message = ui.lengthError;
      }
      setError(reference, message);
      errors.push({ reference: reference, message: message });
    });
    return errors;
  }

  function coerceValue(field, value) {
    if (field.backendType === "integer") {
      return Number.parseInt(value, 10);
    }
    if (field.backendType === "decimal") {
      return Number.parseFloat(value);
    }
    return value;
  }

  function collectReferenceValues(refs) {
    const answers = {};
    refs.forEach(function (reference, fieldKey) {
      if (reference.wrapper.hidden || reference.controls.every(function (control) { return control.disabled; })) {
        return;
      }
      const value = readValue(reference);
      if (value !== "" && (!Array.isArray(value) || value.length > 0)) {
        answers[fieldKey] = coerceValue(reference.field, value);
      }
    });
    return answers;
  }

  function collectPayload(view) {
    const answers = collectReferenceValues(view.refs);
    const selectedServices = answers.APPLICANT_SELECTED_SERVICES.slice();
    answers.DECLARATION_SIGNER_NAME = answers.CONTACT_FULL_NAME;
    answers.DECLARATION_SIGNER_TITLE = answers.CONTACT_POSITION;
    answers.DECLARATION_DATE = new Date().toISOString();
    return {
      schemaVersion: schema.schemaVersion,
      formLanguage: config.formLanguages[language],
      selectedServices: selectedServices,
      answers: answers,
      partners: view.partners.map(function (partner) {
        return collectReferenceValues(partner.refs);
      })
    };
  }

  function serviceNames(codes) {
    return codes.map(function (code) {
      const service = schema.services.find(function (item) {
        return item.code === code;
      });
      return service ? localized(service.label) : code;
    });
  }

  function showSuccess(view, response) {
    const success = element("section", "digitaltr-form digitaltr-form__success");
    success.setAttribute("aria-labelledby", "digitaltr-success-title");
    const heading = element("h3", "", ui.successTitle);
    heading.id = "digitaltr-success-title";
    heading.tabIndex = -1;
    const body = element("p", "digitaltr-form__description", ui.successBody);
    const receipt = element("dl", "digitaltr-form__receipt");
    [
      [ui.appId, response.appId],
      [ui.selectedServices, serviceNames(response.selectedServices).join(", ")],
      [ui.receivedAt, new Intl.DateTimeFormat(locale, {
        dateStyle: "long",
        timeStyle: "short"
      }).format(new Date(response.receivedAt))]
    ].forEach(function (item) {
      receipt.append(element("dt", "", item[0]), element("dd", "", item[1]));
    });
    success.append(heading, body, receipt);
    view.container.replaceChildren(success);
    heading.focus();
  }

  function createFormView(container) {
    const root = element("div", "digitaltr-form");
    const heading = element("h3", "digitaltr-form__title", ui.formTitle);
    const intro = element("p", "digitaltr-form__description", ui.formIntro);
    const requiredNote = element("p", "digitaltr-form__required-note", ui.requiredNote);

    const nav = element("nav", "digitaltr-form__section-nav");
    nav.setAttribute("aria-label", ui.sectionNav);
    const navList = document.createElement("ol");
    nav.appendChild(navList);

    const form = document.createElement("form");
    form.className = "digitaltr-form__body";
    form.noValidate = true;
    const errorSummary = element("div", "digitaltr-form__error-summary");
    errorSummary.hidden = true;
    errorSummary.tabIndex = -1;
    errorSummary.setAttribute("role", "alert");
    errorSummary.setAttribute("aria-labelledby", "digitaltr-error-summary-title");
    const errorTitle = element("h4", "", ui.validationTitle);
    errorTitle.id = "digitaltr-error-summary-title";
    const errorList = document.createElement("ul");
    errorSummary.append(errorTitle, errorList);
    form.appendChild(errorSummary);

    const view = {
      container: container,
      root: root,
      form: form,
      refs: new Map(),
      sections: new Map(),
      navList: navList,
      errorSummary: errorSummary,
      errorList: errorList,
      partners: [],
      nextPartnerNumber: 1
    };

    schema.sections.forEach(function (section) {
      renderSection(view, section);
    });

    const actions = element("div", "digitaltr-form__actions");
    const live = element("p", "digitaltr-form__live");
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    const submit = element("button", "digitaltr-form__button digitaltr-form__button--primary", ui.submit);
    submit.type = "submit";
    actions.append(live, submit);
    form.appendChild(actions);
    view.submitButton = submit;
    view.live = live;

    root.append(heading, intro, requiredNote, nav, form);
    container.replaceChildren(root);

    view.refs.forEach(function (reference) {
      reference.controls.forEach(function (control) {
        control.addEventListener("input", function () {
          clearError(reference);
          syncInHouseChoice(view.refs, control);
          updateVisibility(view);
        });
        control.addEventListener("change", function () {
          clearError(reference);
          syncInHouseChoice(view.refs, control);
          updateVisibility(view);
        });
      });
    });

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      live.textContent = "";
      updateVisibility(view);
      const errors = validate(view);
      showErrorSummary(view, errors);
      if (errors.length > 0) {
        errors[0].reference.focusTarget.focus();
        return;
      }

      submit.disabled = true;
      submit.textContent = ui.submitting;
      form.setAttribute("aria-busy", "true");
      live.textContent = ui.submitting + " " + ui.submissionWait;
      try {
        const response = await adapter.submit(collectPayload(view));
        showSuccess(view, response);
      } catch (_error) {
        submit.disabled = false;
        submit.textContent = ui.submit;
        form.removeAttribute("aria-busy");
        const backendErrors = backendValidationErrors(view, _error);
        if (backendErrors.length > 0) {
          showErrorSummary(view, backendErrors);
          backendErrors[0].reference.focusTarget.focus();
        }
        const safeCode = _error && typeof _error.code === "string" && /^[A-Z0-9_]{3,80}$/.test(_error.code)
          ? " " + ui.errorCode + ": " + _error.code + "."
          : "";
        live.textContent = ui.genericError + safeCode;
      }
    });

    updateVisibility(view);
    return view;
  }

  function renderPausedNotice(container) {
    const root = element("div", "digitaltr-form");
    const notice = element("section", "digitaltr-form__section");
    notice.setAttribute("aria-labelledby", "digitaltr-paused-title");
    const heading = element("h3", "", ui.pausedTitle);
    heading.id = "digitaltr-paused-title";
    const body = element("p", "digitaltr-form__description", ui.pausedBody);
    notice.append(heading, body);

    const officialUrl = officialApplicationUrl();
    if (officialUrl) {
      const actions = element("div", "digitaltr-form__actions");
      const link = element("a", "button primary", ui.pausedCta);
      link.href = officialUrl;
      actions.appendChild(link);
      notice.appendChild(actions);
    }
    root.appendChild(notice);
    container.replaceChildren(root);
  }

  function renderApplication() {
    const container = document.querySelector("[data-digitaltr-application-container]");
    if (!container) {
      return;
    }
    if (config && config.status !== "open") {
      renderPausedNotice(container);
      return;
    }
    if (!config || !schema || !adapter || schema.schemaVersion !== config.schemaVersion) {
      const notice = element("p", "digitaltr-form digitaltr-form__alert digitaltr-form__alert--error", ui.genericError);
      container.replaceChildren(notice);
      return;
    }
    createFormView(container);
  }

  populatePublicPage();
  renderApplication();
})();
