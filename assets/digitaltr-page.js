(function () {
  "use strict";

  const config = window.METUDTX_CONFIG && window.METUDTX_CONFIG.digitaltr;
  const pageLanguage = document.documentElement.lang === "tr" ? "tr" : "en";
  const POC_QUERY = "?poc=1";
  const RECAPTCHA_ACTION = "digitaltr_poc_submit";
  const SUBMISSION_STORAGE_KEY = "metudtx.digitaltr.poc.submissionId.v0.2";
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const copy = {
    tr: {
      prelaunch: "Başvuru formu hazırlanıyor",
      open: "Başvuruya Başla",
      closed: "Başvuru dönemi sona erdi",
      windowPrefix: "İlk başvuru dönemi",
      prelaunchBody: "Başvurular yakında açılacaktır.",
      closedBody: "Bu dönem için yeni başvuru alınmamaktadır. Sonraki dönem hakkında bilgi almak için bizimle iletişime geçebilirsiniz.",
      emailSubject: "DigitalTR başvurusu hakkında",
      contact: "DigitalTR başvurusu hakkında iletişime geçin"
    },
    en: {
      prelaunch: "Application form is being prepared",
      open: "Start Application",
      closed: "The application window has closed",
      windowPrefix: "First application window",
      prelaunchBody: "Applications will open soon.",
      closedBody: "New applications are not being accepted for this window. Contact us for information about the next window.",
      emailSubject: "Question about the DIGITALTR application",
      contact: "Contact us about the DIGITALTR application"
    }
  };

  const pocCopy = {
    tr: {
      title: "DigitalTR sentetik TEST formu",
      intro: "Yalnızca sentetik veriler kullanın. Gerçek kişi, şirket veya başvuru bilgisi girmeyin. Seçtiğiniz her hizmetin TEST PDF'i kayıt sırasında otomatik oluşturulur; bu ekranda dosya yüklenmez.",
      organizationLegend: "Test kuruluşu ve kişisi",
      organizationLabel: "Test kuruluşu / yasal unvan",
      contactLabel: "Test kişisi ad-soyad",
      emailLabel: "Test e-postası",
      servicesLegend: "Test hizmetleri",
      descriptionLabel: "Sentetik test açıklaması",
      descriptionHelp: "10–1000 karakter kullanın; gerçek başvuru bilgisi girmeyin.",
      declarationLegend: "Sentetik veri onayı",
      declarationLabel: "Bu gönderimde yalnızca sentetik test verisi kullandığımı doğruluyorum.",
      submit: "Sentetik testi gönder",
      required: "Zorunlu",
      preparing: "TEST formu güvenli gönderim için hazırlanıyor.",
      ready: "TEST formu gönderime hazır.",
      submitting: "Sentetik TEST gönderiliyor. Bu işlem tamamlanana kadar sayfayı kapatmayın.",
      bridgeError: "TEST gönderim bağlantısı kurulamadı. Lütfen daha sonra yeniden deneyin.",
      validationSummary: "Göndermeden önce işaretli alanları düzeltin.",
      serverValidation: "Gönderim kabul edilmedi. İşaretli alanları kontrol edin.",
      duplicateConflict: "Bu TEST oturumu kimliği daha önce farklı içerikle kullanılmış. Değiştirilmiş içerik aynı kimlikle gönderilemez.",
      botError: "Güvenlik doğrulaması tamamlanamadı. Lütfen yeniden deneyin.",
      recoveryError: "Bu test gönderimi otomatik olarak tamamlanamadı. Yeni bir gönderim yapmayın; teknik ekiple iletişime geçin.",
      genericError: "TEST gönderimi tamamlanamadı. Lütfen daha sonra yeniden deneyin.",
      fieldServerError: "Bu alan sunucu doğrulamasından geçmedi.",
      receiptId: "Receipt ID",
      submissionId: "Submission ID",
      receivedAt: "Alınma zamanı",
      errors: {
        organizationRequired: "Test kuruluşu / yasal unvan alanı 2–200 karakter olmalıdır.",
        contactRequired: "Test kişisi ad-soyad alanı 2–120 karakter olmalıdır.",
        emailInvalid: "Geçerli bir sentetik test e-postası girin.",
        servicesRequired: "En az bir hizmet seçin.",
        descriptionInvalid: "Sentetik test açıklaması 10–1000 karakter olmalıdır.",
        declarationRequired: "Yalnızca sentetik veri kullanıldığını onaylayın."
      }
    },
    en: {
      title: "DigitalTR synthetic TEST form",
      intro: "Use synthetic data only. Do not enter real personal, company or application information. A TEST PDF is generated automatically for each selected service when the application is saved; no file is uploaded on this screen.",
      organizationLegend: "Test organization and contact",
      organizationLabel: "Test organization / legal name",
      contactLabel: "Test contact full name",
      emailLabel: "Test email",
      servicesLegend: "Test services",
      descriptionLabel: "Synthetic test description",
      descriptionHelp: "Use 10–1000 characters and do not enter real application information.",
      declarationLegend: "Synthetic data confirmation",
      declarationLabel: "I confirm that this submission contains synthetic test data only.",
      submit: "Submit synthetic test",
      required: "Required",
      preparing: "The TEST form is preparing the secure submission connection.",
      ready: "The TEST form is ready to submit.",
      submitting: "The synthetic TEST submission is being sent. Do not close this page until it finishes.",
      bridgeError: "The TEST submission connection could not be established. Please try again later.",
      validationSummary: "Correct the marked fields before submitting.",
      serverValidation: "The submission was not accepted. Check the marked fields.",
      duplicateConflict: "This TEST session identifier was already used with different content. Changed content cannot be submitted with the same identifier.",
      botError: "Security verification could not be completed. Please try again.",
      recoveryError: "This test submission could not be completed automatically. Do not submit it again; contact the technical team.",
      genericError: "The TEST submission could not be completed. Please try again later.",
      fieldServerError: "This field did not pass server validation.",
      receiptId: "Receipt ID",
      submissionId: "Submission ID",
      receivedAt: "Received at",
      errors: {
        organizationRequired: "The test organization / legal name must contain 2–200 characters.",
        contactRequired: "The test contact full name must contain 2–120 characters.",
        emailInvalid: "Enter a valid synthetic test email address.",
        servicesRequired: "Select at least one service.",
        descriptionInvalid: "The synthetic test description must contain 10–1000 characters.",
        declarationRequired: "Confirm that the submission contains synthetic data only."
      }
    }
  };

  const services = [
    {
      code: "DTR-S1-DMA",
      tr: "Dijital Olgunluk Değerlendirmesi",
      en: "Digital Maturity Assessment"
    },
    {
      code: "DTR-S2-DTC",
      tr: "Dijital Dönüşüm Danışmanlığı",
      en: "Digital Transformation Consulting"
    },
    {
      code: "DTR-S3-TV",
      tr: "Dijital Sistem ve Teknolojilerin Test ve Doğrulanması",
      en: "Testing and Validation of Digital Systems and Technologies"
    },
    {
      code: "DTR-S4-JTD",
      tr: "Ortak Teknoloji Çözümü Geliştirme",
      en: "Joint Technology Solution Development"
    }
  ];

  function applyTestRobotsPolicy() {
    if (window.location.search !== POC_QUERY) {
      return;
    }

    let robots = document.head.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex,nofollow";
  }

  function isAllowedStatus(value) {
    return value === "prelaunch" || value === "open" || value === "closed";
  }

  const configuredStatus = config && isAllowedStatus(config.status) ? config.status : "prelaunch";
  const effectiveStatus = configuredStatus === "open" ? "prelaunch" : configuredStatus;

  function parseDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    const date = new Date(value + "T00:00:00Z");
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatWindowLabel(language) {
    const start = config && parseDate(config.windowStart);
    const end = config && parseDate(config.windowEnd);

    if (!start || !end) {
      return "";
    }

    const locale = language === "tr" ? "tr-TR" : "en-GB";
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

    return copy[language].windowPrefix + ": " + startFormatter.format(start) + "–" + endFormatter.format(end);
  }

  function makeContactLink(language, className) {
    if (!config || typeof config.contactEmail !== "string" || !config.contactEmail.includes("@")) {
      return null;
    }

    const link = document.createElement("a");
    if (className) {
      link.className = className;
    }
    link.href = "mailto:" + config.contactEmail + "?subject=" + encodeURIComponent(copy[language].emailSubject);
    return link;
  }

  function populateConfigurationLinks() {
    document.querySelectorAll("[data-window-label]").forEach(function (element) {
      const label = formatWindowLabel(pageLanguage);
      if (label) {
        element.textContent = label;
      }
    });

    document.querySelectorAll("[data-official-call-link]").forEach(function (link) {
      if (!config || !config.officialCallDocumentUrl) {
        link.hidden = true;
        link.removeAttribute("href");
        return;
      }

      try {
        const url = new URL(config.officialCallDocumentUrl);
        if (url.protocol !== "https:") {
          throw new Error("Official document URL must use HTTPS.");
        }
        link.href = url.href;
        link.hidden = false;
      } catch (_error) {
        link.hidden = true;
        link.removeAttribute("href");
      }
    });

    document.querySelectorAll("[data-contact-link]").forEach(function (slot) {
      const link = makeContactLink(pageLanguage, slot.dataset.contactClass || "");
      if (!link) {
        slot.hidden = true;
        return;
      }

      link.textContent = slot.dataset.contactText === "email" ? config.contactEmail : copy[pageLanguage].contact;
      slot.replaceChildren(link);
      slot.hidden = false;
    });
  }

  function makePrimaryCta(language, placement) {
    const isNavigation = placement === "nav";
    const className = isNavigation ? "nav-cta" : "button primary";

    if (effectiveStatus === "open") {
      const link = document.createElement("a");
      link.className = className;
      link.textContent = copy[language].open;
      link.href = language === "tr"
        ? "#" + config.applicationSectionId
        : "/tr/basvur/digitaltr/#" + config.applicationSectionId;
      return link;
    }

    const status = document.createElement("span");
    status.className = className + " " + (isNavigation ? "nav-cta--inactive" : "button--inactive");
    status.setAttribute("aria-disabled", "true");
    status.textContent = copy[language][effectiveStatus];
    return status;
  }

  function populatePrimaryCtas() {
    document.querySelectorAll("[data-digitaltr-primary-cta]").forEach(function (slot) {
      const placement = slot.dataset.placement || "content";
      slot.replaceChildren(makePrimaryCta(pageLanguage, placement));
    });
  }

  function makeNotice(kind, title, body, language, includeContact) {
    const notice = document.createElement("div");
    notice.className = "application-notice application-notice--" + kind;

    const heading = document.createElement("h3");
    heading.textContent = title;
    notice.appendChild(heading);

    const paragraph = document.createElement("p");
    paragraph.textContent = body;
    notice.appendChild(paragraph);

    if (includeContact) {
      const actions = document.createElement("div");
      actions.className = "card-actions";
      const contactLink = makeContactLink(language, "button secondary");
      if (contactLink) {
        contactLink.textContent = copy[language].contact;
        actions.appendChild(contactLink);
        notice.appendChild(actions);
      }
    }

    return notice;
  }

  function getPocSettings() {
    if (window.location.search !== POC_QUERY || !config ||
        config.environment !== "TEST" ||
        config.protocolVersion !== "0.1" ||
        config.schemaVersion !== "0.2-poc") {
      return null;
    }

    const configuredLanguage = config.formLanguages && config.formLanguages[pageLanguage];
    if (configuredLanguage !== "tr-TR" && configuredLanguage !== "en-GB") {
      return null;
    }

    if (typeof config.recaptchaSiteKey !== "string" || !config.recaptchaSiteKey.trim()) {
      return null;
    }

    try {
      const bridgeUrl = new URL(config.appsScriptBridgeUrl);
      if (bridgeUrl.protocol !== "https:" || bridgeUrl.hostname !== "script.google.com") {
        return null;
      }

      return {
        bridgeUrl: bridgeUrl.href,
        formLanguage: configuredLanguage,
        protocolVersion: config.protocolVersion,
        schemaVersion: config.schemaVersion,
        siteKey: config.recaptchaSiteKey
      };
    } catch (_error) {
      return null;
    }
  }

  function makeElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (typeof text === "string") {
      element.textContent = text;
    }
    return element;
  }

  function appendRequiredMarker(label, languageCopy) {
    const marker = makeElement("span", "digitaltr-form__required", " *");
    marker.setAttribute("aria-hidden", "true");
    label.appendChild(marker);

    const requiredText = makeElement("span", "digitaltr-form__visually-hidden", " (" + languageCopy.required + ")");
    label.appendChild(requiredText);
  }

  function createTextField(refs, options, languageCopy) {
    const wrapper = makeElement(
      "div",
      "digitaltr-form__field" + (options.full ? " digitaltr-form__field--full" : "")
    );
    const label = makeElement("label", "", options.label);
    label.htmlFor = options.id;
    appendRequiredMarker(label, languageCopy);

    const control = options.control === "textarea"
      ? document.createElement("textarea")
      : document.createElement("input");
    control.id = options.id;
    control.name = options.name;
    control.required = true;
    control.autocomplete = "off";
    control.minLength = options.minLength;
    control.maxLength = options.maxLength;
    if (control.tagName === "INPUT") {
      control.type = options.type || "text";
    }

    const describedBy = [];
    let help = null;
    if (options.help) {
      help = makeElement("span", "digitaltr-form__help", options.help);
      help.id = options.id + "-help";
      describedBy.push(help.id);
    }

    const error = makeElement("span", "digitaltr-form__error");
    error.id = options.id + "-error";
    error.hidden = true;
    describedBy.push(error.id);
    control.setAttribute("aria-describedby", describedBy.join(" "));

    wrapper.appendChild(label);
    wrapper.appendChild(control);
    if (help) {
      wrapper.appendChild(help);
    }
    wrapper.appendChild(error);

    refs[options.fieldKey] = {
      error: error,
      focusTarget: control,
      invalidTarget: control
    };
    return wrapper;
  }

  function createServiceFieldset(refs, languageCopy) {
    const fieldset = document.createElement("fieldset");
    const legend = makeElement("legend", "", languageCopy.servicesLegend);
    appendRequiredMarker(legend, languageCopy);

    const serviceGrid = makeElement("div", "digitaltr-form__service-grid");
    const checkboxes = [];

    services.forEach(function (service, index) {
      const label = makeElement("label", "digitaltr-form__service-card");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "selectedServices";
      checkbox.value = service.code;
      checkbox.id = "digitaltr-poc-service-" + String(index + 1);
      checkbox.setAttribute("aria-describedby", "digitaltr-poc-services-error");
      checkbox.addEventListener("change", function () {
        label.dataset.selected = checkbox.checked ? "true" : "false";
      });

      const name = makeElement("strong", "", service[pageLanguage]);
      const code = makeElement("span", "", service.code);
      label.append(checkbox, name, code);
      serviceGrid.appendChild(label);
      checkboxes.push(checkbox);
    });

    const error = makeElement("span", "digitaltr-form__error");
    error.id = "digitaltr-poc-services-error";
    error.hidden = true;
    fieldset.setAttribute("aria-required", "true");
    fieldset.setAttribute("aria-describedby", error.id);
    fieldset.append(legend, serviceGrid, error);

    refs.SELECTED_SERVICE_CODES = {
      error: error,
      focusTarget: checkboxes[0],
      invalidTarget: fieldset
    };
    return fieldset;
  }

  function createDeclarationField(refs, languageCopy) {
    const wrapper = makeElement("div", "digitaltr-form__field digitaltr-form__field--full");
    const label = makeElement("label", "digitaltr-form__choice");
    label.htmlFor = "digitaltr-poc-synthetic";

    const input = document.createElement("input");
    input.id = "digitaltr-poc-synthetic";
    input.name = "synthetic";
    input.type = "checkbox";
    input.required = true;
    input.setAttribute("aria-describedby", "digitaltr-poc-synthetic-error");

    const text = makeElement("span", "", languageCopy.declarationLabel);
    const marker = makeElement("span", "digitaltr-form__required", " *");
    marker.setAttribute("aria-hidden", "true");
    text.appendChild(marker);

    const error = makeElement("span", "digitaltr-form__error");
    error.id = "digitaltr-poc-synthetic-error";
    error.hidden = true;

    label.append(input, text);
    wrapper.append(label, error);
    refs.POC_SYNTHETIC_DATA_CONFIRMATION = {
      error: error,
      focusTarget: input,
      invalidTarget: input
    };
    return wrapper;
  }

  function createPocForm(languageCopy) {
    const refs = {};
    const root = makeElement("div", "digitaltr-form");
    root.setAttribute("data-digitaltr-poc-form", "");
    root.dataset.schemaVersion = config.schemaVersion;

    const title = makeElement("h3", "", languageCopy.title);
    const intro = makeElement("p", "digitaltr-form__description", languageCopy.intro);
    const form = document.createElement("form");
    form.id = "digitaltr-poc-form";
    form.noValidate = true;
    form.autocomplete = "off";

    const organizationSection = makeElement("div", "digitaltr-form__section");
    const organizationFieldset = document.createElement("fieldset");
    const organizationLegend = makeElement("legend", "", languageCopy.organizationLegend);
    const organizationGrid = makeElement("div", "digitaltr-form__grid");
    organizationGrid.append(
      createTextField(refs, {
        fieldKey: "ORG_LEGAL_NAME",
        id: "digitaltr-poc-organization",
        name: "organizationLegalName",
        label: languageCopy.organizationLabel,
        minLength: 2,
        maxLength: 200
      }, languageCopy),
      createTextField(refs, {
        fieldKey: "CONTACT_FULL_NAME",
        id: "digitaltr-poc-contact",
        name: "contactFullName",
        label: languageCopy.contactLabel,
        minLength: 2,
        maxLength: 120
      }, languageCopy),
      createTextField(refs, {
        fieldKey: "CONTACT_EMAIL",
        id: "digitaltr-poc-email",
        name: "contactEmail",
        label: languageCopy.emailLabel,
        minLength: 3,
        maxLength: 254,
        type: "email",
        full: true
      }, languageCopy)
    );
    organizationFieldset.append(organizationLegend, organizationGrid);
    organizationSection.appendChild(organizationFieldset);

    const servicesSection = makeElement("div", "digitaltr-form__section");
    const servicesFieldset = createServiceFieldset(refs, languageCopy);
    const descriptionGrid = makeElement("div", "digitaltr-form__grid");
    descriptionGrid.style.marginTop = "22px";
    descriptionGrid.appendChild(createTextField(refs, {
      fieldKey: "POC_TEST_TEXT",
      id: "digitaltr-poc-description",
      name: "testText",
      label: languageCopy.descriptionLabel,
      minLength: 10,
      maxLength: 1000,
      control: "textarea",
      help: languageCopy.descriptionHelp,
      full: true
    }, languageCopy));
    servicesSection.append(servicesFieldset, descriptionGrid);

    const declarationSection = makeElement("div", "digitaltr-form__section");
    const declarationFieldset = document.createElement("fieldset");
    declarationFieldset.append(
      makeElement("legend", "", languageCopy.declarationLegend),
      createDeclarationField(refs, languageCopy)
    );
    declarationSection.appendChild(declarationFieldset);

    const status = makeElement("div", "digitaltr-form__alert", languageCopy.preparing);
    status.id = "digitaltr-poc-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    status.tabIndex = -1;

    const actions = makeElement("div", "digitaltr-form__actions");
    const submitButton = makeElement(
      "button",
      "digitaltr-form__button digitaltr-form__button--primary",
      languageCopy.submit
    );
    submitButton.type = "submit";
    submitButton.disabled = true;
    actions.appendChild(submitButton);

    form.append(
      organizationSection,
      servicesSection,
      declarationSection,
      status,
      actions
    );
    root.append(title, intro, form);

    return {
      form: form,
      refs: refs,
      root: root,
      status: status,
      submitButton: submitButton
    };
  }

  function clearFieldErrors(refs) {
    Object.keys(refs).forEach(function (fieldKey) {
      const ref = refs[fieldKey];
      ref.error.textContent = "";
      ref.error.hidden = true;
      ref.invalidTarget.removeAttribute("aria-invalid");
    });
  }

  function showFieldError(ref, message) {
    ref.error.textContent = message;
    ref.error.hidden = false;
    ref.invalidTarget.setAttribute("aria-invalid", "true");
  }

  function setStatusMessage(status, kind, message) {
    status.className = "digitaltr-form__alert";
    if (kind === "error" || kind === "success") {
      status.classList.add("digitaltr-form__alert--" + kind);
    }
    status.setAttribute("role", kind === "error" ? "alert" : "status");
    status.setAttribute("aria-live", kind === "error" ? "assertive" : "polite");
    status.textContent = message;
  }

  function setReceiptStatus(status, languageCopy, response, fallbackSubmissionId, previousReceipt) {
    const receiptId = typeof response.receiptId === "string" ? response.receiptId : "";
    const submissionId = typeof response.submissionId === "string"
      ? response.submissionId
      : fallbackSubmissionId;
    if (!receiptId || !UUID_PATTERN.test(submissionId)) {
      throw new Error("Invalid TEST receipt.");
    }

    const parsedReceivedAt = typeof response.receivedAt === "string"
      ? new Date(response.receivedAt)
      : null;
    const canReusePreviousReceipt = previousReceipt &&
      previousReceipt.receiptId === receiptId &&
      previousReceipt.submissionId === submissionId;
    const receivedAt = parsedReceivedAt && !Number.isNaN(parsedReceivedAt.getTime())
      ? parsedReceivedAt.toISOString()
      : (canReusePreviousReceipt ? previousReceipt.receivedAt : new Date().toISOString());

    const receipt = makeElement("dl", "digitaltr-form__receipt");
    [
      [languageCopy.receiptId, receiptId],
      [languageCopy.submissionId, submissionId],
      [languageCopy.receivedAt, receivedAt]
    ].forEach(function (item) {
      receipt.append(
        makeElement("dt", "", item[0]),
        makeElement("dd", "", item[1])
      );
    });

    status.className = "digitaltr-form__alert digitaltr-form__alert--success";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.replaceChildren(receipt);
    return {
      receiptId: receiptId,
      receivedAt: receivedAt,
      submissionId: submissionId
    };
  }

  function validatePocForm(form, refs, languageCopy) {
    clearFieldErrors(refs);
    const errors = [];
    const organizationLegalName = form.elements.organizationLegalName.value.trim();
    const contactFullName = form.elements.contactFullName.value.trim();
    const contactEmail = form.elements.contactEmail.value.trim().toLowerCase();
    const testText = form.elements.testText.value.trim();
    const selectedServices = Array.from(
      form.querySelectorAll('input[name="selectedServices"]:checked'),
      function (input) { return input.value; }
    );
    const synthetic = form.elements.synthetic.checked;

    function addError(fieldKey, message) {
      showFieldError(refs[fieldKey], message);
      errors.push(refs[fieldKey]);
    }

    if (organizationLegalName.length < 2 || organizationLegalName.length > 200) {
      addError("ORG_LEGAL_NAME", languageCopy.errors.organizationRequired);
    }
    if (contactFullName.length < 2 || contactFullName.length > 120) {
      addError("CONTACT_FULL_NAME", languageCopy.errors.contactRequired);
    }
    if (contactEmail.length < 3 || contactEmail.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      addError("CONTACT_EMAIL", languageCopy.errors.emailInvalid);
    }
    if (selectedServices.length < 1 || selectedServices.length > 4) {
      addError("SELECTED_SERVICE_CODES", languageCopy.errors.servicesRequired);
    }
    if (testText.length < 10 || testText.length > 1000) {
      addError("POC_TEST_TEXT", languageCopy.errors.descriptionInvalid);
    }
    if (!synthetic) {
      addError("POC_SYNTHETIC_DATA_CONFIRMATION", languageCopy.errors.declarationRequired);
    }

    return {
      errors: errors,
      values: {
        contactEmail: contactEmail,
        contactFullName: contactFullName,
        organizationLegalName: organizationLegalName,
        selectedServices: selectedServices,
        testText: testText
      }
    };
  }

  function applyServerFieldErrors(refs, fieldErrors, languageCopy) {
    if (!Array.isArray(fieldErrors)) {
      return [];
    }

    const marked = [];
    fieldErrors.forEach(function (fieldError) {
      const fieldKey = fieldError && fieldError.fieldKey;
      const ref = refs[fieldKey];
      if (ref && !marked.includes(ref)) {
        showFieldError(ref, languageCopy.fieldServerError);
        marked.push(ref);
      }
    });
    return marked;
  }

  function getSafeErrorMessage(error, languageCopy) {
    const code = error && error.code;
    if (code === "DUPLICATE_SUBMISSION") {
      return languageCopy.duplicateConflict;
    }
    if (code === "VALIDATION_ERROR") {
      return languageCopy.serverValidation;
    }
    if (code === "BOT_VERIFICATION_FAILED") {
      return languageCopy.botError;
    }
    if (code === "PARTIAL_RECOVERY_REQUIRED") {
      return languageCopy.recoveryError;
    }
    return languageCopy.genericError;
  }

  function getSubmissionId() {
    let submissionId = "";
    try {
      submissionId = window.sessionStorage.getItem(SUBMISSION_STORAGE_KEY) || "";
    } catch (_error) {
      submissionId = "";
    }

    if (!UUID_PATTERN.test(submissionId)) {
      submissionId = window.crypto.randomUUID();
      try {
        window.sessionStorage.setItem(SUBMISSION_STORAGE_KEY, submissionId);
      } catch (_error) {
        return submissionId;
      }
    }
    return submissionId;
  }

  function waitForRecaptchaReady() {
    return new Promise(function (resolve, reject) {
      if (!window.grecaptcha || typeof window.grecaptcha.ready !== "function" ||
          typeof window.grecaptcha.execute !== "function") {
        reject(new Error("reCAPTCHA is unavailable."));
        return;
      }
      window.grecaptcha.ready(resolve);
    });
  }

  function loadRecaptcha(siteKey) {
    if (window.grecaptcha) {
      return waitForRecaptchaReady();
    }

    return new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = "https://www.google.com/recaptcha/api.js?render=" + encodeURIComponent(siteKey);
      script.async = true;
      script.defer = true;
      script.dataset.digitaltrPocRecaptcha = "true";
      script.addEventListener("load", function () {
        waitForRecaptchaReady().then(resolve, reject);
      }, { once: true });
      script.addEventListener("error", function () {
        reject(new Error("reCAPTCHA failed to load."));
      }, { once: true });
      document.head.appendChild(script);
    });
  }

  function renderPocForm(container, settings) {
    const languageCopy = pocCopy[pageLanguage];
    const view = createPocForm(languageCopy);
    const bridgeFrame = document.createElement("iframe");
    bridgeFrame.id = "digitaltr-poc-bridge";
    bridgeFrame.className = "digitaltr-poc-bridge";
    bridgeFrame.hidden = true;
    bridgeFrame.setAttribute("hidden", "");
    bridgeFrame.setAttribute("aria-hidden", "true");
    bridgeFrame.setAttribute("tabindex", "-1");
    bridgeFrame.title = "DigitalTR TEST bridge";
    bridgeFrame.referrerPolicy = "strict-origin-when-cross-origin";

    container.replaceChildren(view.root, bridgeFrame);

    let bridgeClient = null;
    let bridgeReady = false;
    let lastReceipt = null;
    let submissionInFlight = false;
    const submissionId = getSubmissionId();

    function disableSubmit() {
      view.submitButton.disabled = true;
    }

    function enableSubmit() {
      view.submitButton.disabled = false;
    }

    view.form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!bridgeReady || submissionInFlight) {
        return;
      }

      const validation = validatePocForm(view.form, view.refs, languageCopy);
      if (validation.errors.length) {
        setStatusMessage(view.status, "error", languageCopy.validationSummary);
        validation.errors[0].focusTarget.focus();
        return;
      }

      submissionInFlight = true;
      disableSubmit();
      setStatusMessage(view.status, "info", languageCopy.submitting);

      try {
        const recaptchaToken = await window.grecaptcha.execute(settings.siteKey, {
          action: RECAPTCHA_ACTION
        });
        if (typeof recaptchaToken !== "string" || !recaptchaToken) {
          const botError = new Error("Security verification failed.");
          botError.code = "BOT_VERIFICATION_FAILED";
          throw botError;
        }

        const response = await bridgeClient.submitSyntheticPoc({
          submissionId: submissionId,
          organizationLegalName: validation.values.organizationLegalName,
          contactFullName: validation.values.contactFullName,
          contactEmail: validation.values.contactEmail,
          selectedServices: validation.values.selectedServices,
          testText: validation.values.testText,
          formLanguage: settings.formLanguage,
          recaptchaToken: recaptchaToken
        });
        lastReceipt = setReceiptStatus(
          view.status,
          languageCopy,
          response,
          submissionId,
          lastReceipt
        );
      } catch (error) {
        clearFieldErrors(view.refs);
        const marked = applyServerFieldErrors(view.refs, error && error.fieldErrors, languageCopy);
        setStatusMessage(view.status, "error", getSafeErrorMessage(error, languageCopy));
        if (marked.length) {
          marked[0].focusTarget.focus();
        } else {
          view.status.focus({ preventScroll: true });
        }
      } finally {
        submissionInFlight = false;
        if (bridgeReady) {
          enableSubmit();
        }
      }
    });

    try {
      if (typeof window.DigitalTRPocBridgeClient !== "function") {
        throw new Error("DigitalTR TEST client is unavailable.");
      }

      bridgeClient = new window.DigitalTRPocBridgeClient({
        iframe: bridgeFrame,
        protocolVersion: settings.protocolVersion,
        schemaVersion: settings.schemaVersion
      });
      const bridgePromise = bridgeClient.start();
      const recaptchaPromise = loadRecaptcha(settings.siteKey);
      bridgeFrame.src = settings.bridgeUrl;

      Promise.all([bridgePromise, recaptchaPromise]).then(function () {
        bridgeReady = true;
        enableSubmit();
        setStatusMessage(view.status, "info", languageCopy.ready);
      }).catch(function () {
        bridgeReady = false;
        disableSubmit();
        setStatusMessage(view.status, "error", languageCopy.bridgeError);
      });

      window.addEventListener("pagehide", function () {
        if (bridgeClient) {
          bridgeClient.destroy();
        }
      }, { once: true });
    } catch (_error) {
      bridgeReady = false;
      disableSubmit();
      setStatusMessage(view.status, "error", languageCopy.bridgeError);
    }
  }

  function renderNormalApplication(container) {
    const status = effectiveStatus === "closed" ? "closed" : "prelaunch";
    container.replaceChildren(makeNotice(
      status,
      copy[pageLanguage][status],
      copy[pageLanguage][status + "Body"],
      pageLanguage,
      true
    ));
  }

  function renderApplicationSection() {
    const section = document.querySelector("[data-digitaltr-application-section]");
    const container = document.querySelector("[data-digitaltr-application-container]");

    if (!section || !container) {
      return;
    }

    if (config && config.applicationSectionId) {
      section.id = config.applicationSectionId;
    }

    const pocSettings = getPocSettings();
    if (pocSettings) {
      container.removeAttribute("aria-live");
      renderPocForm(container, pocSettings);
      return;
    }

    container.setAttribute("aria-live", "polite");
    renderNormalApplication(container);
  }

  applyTestRobotsPolicy();
  populateConfigurationLinks();
  populatePrimaryCtas();
  renderApplicationSection();
})();
