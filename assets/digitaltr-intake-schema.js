(function (global) {
  "use strict";

  const VERSION = "0.3-preview";
  const TEMPLATES = Object.freeze({
    S1: Object.freeze({ id: "1eSwVu8TlmSa_ncixYturKjCWC2QrO9xL", title: "DIGITALTR-Başvuru Formu 1_Dijital Olgunluk Analizi.docx" }),
    S2: Object.freeze({ id: "1aZUkS4HKxZsQPt_-w_ofOFskROUbGpOG", title: "DIGITALTR-Başvuru Formu 2_Dijital Dönüşüm Danışmanlığı Hizmeti.docx" }),
    S3: Object.freeze({ id: "1pLq-DvFsPjd-QtjTbiPMdRVij_YL1EUg", title: "DIGITALTR-Başvuru Formu 3_Test ve Doğrulama Hizmeti.docx" }),
    S4: Object.freeze({ id: "1j21Tidxie4iELPM9AQ4KOQ7S4Q0xTYGW", title: "DIGITALTR-Başvuru Formu 4_Ortak Teknoloji Geliştirme Hizmeti.docx" })
  });
  const CODES = Object.freeze({
    S1: "DTR-S1-DMA",
    S2: "DTR-S2-DTC",
    S3: "DTR-S3-TV",
    S4: "DTR-S4-JTD"
  });

  function tx(tr, en) {
    return Object.freeze({ tr: tr, en: en });
  }

  function opt(value, tr, en) {
    return Object.freeze({ value: value, label: tx(tr, en) });
  }

  function refs(map) {
    return Object.freeze(Object.keys(map).map(function (template) {
      return Object.freeze({
        template: template,
        templateId: TEMPLATES[template].id,
        question: map[template]
      });
    }));
  }

  function allRefs(question) {
    return refs({ S1: question, S2: question, S3: question, S4: question });
  }

  function placeholder(fieldKey, repeatable) {
    if (repeatable === "DTR_S4_PARTNERS") {
      return "{{DTR_S4_PARTNERS[]." + fieldKey.replace("DTR_S4_PARTNER_", "") + "}}";
    }
    return "{{" + fieldKey + "}}";
  }

  function field(spec) {
    return Object.freeze({
      fieldKey: spec.key,
      sectionKey: spec.section,
      label: tx(spec.tr, spec.en),
      help: tx(spec.helpTr || "", spec.helpEn || ""),
      type: spec.type,
      required: Boolean(spec.required),
      validation: Object.freeze(spec.validation || {}),
      options: Object.freeze(spec.options || []),
      serviceCode: spec.service || "COMMON",
      conditionalVisibility: Object.freeze(spec.when || { type: "always" }),
      sourceRefs: spec.sourceRefs,
      backendType: spec.backend,
      pdfPlaceholder: spec.pdf || placeholder(spec.key, spec.repeatable),
      autocomplete: spec.autocomplete || "off",
      repeatable: spec.repeatable || null,
      derivedFrom: spec.derivedFrom || null
    });
  }

  const YES_NO = Object.freeze([
    opt("yes", "Evet", "Yes"),
    opt("no", "Hayır", "No")
  ]);
  const SECTORS = Object.freeze([
    opt("machinery", "Makine", "Machinery"),
    opt("automotive", "Otomotiv ve Yan Sanayi", "Automotive and suppliers"),
    opt("electrical-electronics", "Elektrik ve Elektronik", "Electrical and electronics"),
    opt("textile-apparel", "Tekstil / Hazır Giyim Sanayi", "Textiles / apparel"),
    opt("component-manufacturing", "Bileşen Üreticisi", "Component manufacturing"),
    opt("white-goods", "Beyaz Eşya", "White goods"),
    opt("medical-technologies", "Medikal Teknolojiler", "Medical technologies"),
    opt("steel", "Çelik", "Steel"),
    opt("cement", "Çimento", "Cement"),
    opt("chemical-process", "Kimya / Proses Endüstrisi", "Chemicals / process industry"),
    opt("other", "Diğer", "Other")
  ]);
  const PARTNER_SECTORS = Object.freeze([
    opt("machinery", "Makine", "Machinery"),
    opt("automotive", "Otomotiv", "Automotive"),
    opt("electronics", "Elektronik", "Electronics"),
    opt("textile-apparel", "Tekstil / Hazır Giyim Sanayi", "Textiles / apparel"),
    opt("medical-technologies", "Medikal Teknolojiler", "Medical technologies")
  ]);
  const DEPARTMENTS = Object.freeze([
    opt("research-development", "Ar-Ge (Teknoloji geliştirme)", "R&D (technology development)"),
    opt("product-development", "Ürün geliştirme", "Product development"),
    opt("product-design", "Ürün tasarımı", "Product design"),
    opt("production-development", "Üretim geliştirme", "Production development"),
    opt("software-development", "Yazılım geliştirme", "Software development"),
    opt("service-development", "Hizmet geliştirme", "Service development"),
    opt("production", "Üretim", "Production")
  ]);
  const ROLES = Object.freeze([
    opt("technology-user", "Teknoloji Kullanıcısı", "Technology user"),
    opt("technology-provider", "Teknoloji Sağlayıcısı", "Technology provider"),
    opt("software-supplier", "Yazılım Tedarikçisi", "Software supplier"),
    opt("technology-integrator", "Teknoloji Entegratörü", "Technology integrator"),
    opt("startup", "Girişim", "Startup"),
    opt("rd-center", "Ar-Ge Merkezi", "R&D centre"),
    opt("contract-manufacturer", "Sözleşmeli üretici", "Contract manufacturer"),
    opt("other", "Diğer", "Other")
  ]);
  const PRODUCTION = Object.freeze([
    opt("MTS", "Stoktan Üretim (MTS)", "Make to Stock (MTS)"),
    opt("ATO", "Siparişe Göre Montaj (ATO)", "Assemble to Order (ATO)"),
    opt("MTO", "Siparişe Göre Üretim (MTO)", "Make to Order (MTO)"),
    opt("ETO", "Siparişe Göre Mühendislik (ETO)", "Engineer to Order (ETO)"),
    opt("other", "Diğer", "Other")
  ]);

  const SERVICES = Object.freeze([
    Object.freeze({
      code: CODES.S1,
      label: tx("Dijital Olgunluk Analizi", "Digital Maturity Assessment"),
      description: tx("Mevcut dijital seviyenizi ve öncelikli gelişim alanlarınızı değerlendirin.", "Assess your current digital maturity and priority improvement areas."),
      sourceTemplate: "S1"
    }),
    Object.freeze({
      code: CODES.S2,
      label: tx("Dijital Dönüşüm Danışmanlığı", "Digital Transformation Consulting"),
      description: tx("Dijital dönüşüm kararlarınız için uzman danışmanlık desteği alın.", "Receive expert support for your digital transformation decisions."),
      sourceTemplate: "S2"
    }),
    Object.freeze({
      code: CODES.S3,
      label: tx("Dijital Sistem ve Teknolojilerin Test ve Doğrulanması", "Testing and Validation of Digital Systems and Technologies"),
      description: tx("Teknoloji veya sisteminizi endüstriyel koşullarda doğrulayın.", "Validate your technology or system under industrial conditions."),
      sourceTemplate: "S3"
    }),
    Object.freeze({
      code: CODES.S4,
      label: tx("Ortak Teknoloji Çözümü Geliştirme", "Joint Technology Solution Development"),
      description: tx("Bir sanayi ihtiyacına yönelik çözümü proje ortaklarıyla birlikte geliştirin.", "Develop a solution for an industrial need together with project partners."),
      sourceTemplate: "S4"
    })
  ]);
  const SERVICE_OPTIONS = Object.freeze(SERVICES.map(function (service) {
    return Object.freeze({ value: service.code, label: service.label });
  }));

  const SECTIONS = Object.freeze([
    Object.freeze({ key: "services", label: tx("Hizmet seçimi", "Service selection"), description: tx("Aynı başvuruda bir veya birden fazla hizmet seçebilirsiniz.", "You may select one or more services in the same application."), serviceCode: "COMMON" }),
    Object.freeze({ key: "organization", label: tx("Şirket ve iletişim bilgileri", "Company and contact information"), description: tx("Bu bilgiler seçtiğiniz tüm hizmetler için bir kez alınır.", "These details are collected once for all selected services."), serviceCode: "COMMON" }),
    Object.freeze({ key: "company", label: tx("Şirket profili", "Company profile"), description: tx("", ""), serviceCode: "COMMON" }),
    Object.freeze({ key: "applicant", label: tx("Başvuru sahibi profili", "Applicant profile"), description: tx("", ""), serviceCode: "COMMON" }),
    Object.freeze({ key: "s1", label: tx("Dijital Olgunluk Analizi ihtiyaçları", "Digital Maturity Assessment needs"), description: tx("", ""), serviceCode: CODES.S1 }),
    Object.freeze({ key: "s2", label: tx("Dijital Dönüşüm Danışmanlığı talebi", "Digital Transformation Consulting request"), description: tx("", ""), serviceCode: CODES.S2 }),
    Object.freeze({ key: "s3", label: tx("Test ve doğrulama talebi", "Testing and validation request"), description: tx("", ""), serviceCode: CODES.S3 }),
    Object.freeze({ key: "s4-partners", label: tx("Ek proje ortakları", "Additional project partners"), description: tx("Başvuru sahibi kuruluş ilk proje ortağıdır. Diğer proje ortaklarını gerektiği kadar ekleyebilirsiniz.", "The applicant organisation is the first project partner. Add further project partners as needed."), serviceCode: CODES.S4, repeatable: "DTR_S4_PARTNERS" }),
    Object.freeze({ key: "s4", label: tx("Ortak teknoloji çözümü geliştirme talebi", "Joint technology solution development request"), description: tx("", ""), serviceCode: CODES.S4 }),
    Object.freeze({ key: "declaration", label: tx("Beyan ve gönderim", "Declaration and submission"), description: tx("", ""), serviceCode: "COMMON" })
  ]);

  const FIELDS = [];
  const PARTNER_FIELDS = [];

  function add(spec) {
    FIELDS.push(field(spec));
  }

  function common(key, section, tr, en, type, required, validation, question, backend, options, when, autocomplete) {
    add({
      key: key,
      section: section,
      tr: tr,
      en: en,
      type: type,
      required: required,
      validation: validation,
      options: options || [],
      when: when,
      sourceRefs: allRefs(question),
      backend: backend,
      autocomplete: autocomplete
    });
  }

  add({
    key: "APPLICANT_SELECTED_SERVICES",
    section: "services",
    tr: "Talep edilen hizmetler",
    en: "Requested services",
    type: "checkbox-group",
    required: true,
    validation: { minSelections: 1, maxSelections: 4 },
    options: SERVICE_OPTIONS,
    sourceRefs: refs({
      S1: "Form 1 hizmet seçimi",
      S2: "Form 2 hizmet seçimi",
      S3: "Form 3 hizmet seçimi",
      S4: "Form 4 hizmet seçimi"
    }),
    backend: "string[]"
  });

  common("ORG_LEGAL_NAME", "organization", "Şirket adı / yasal unvan", "Company name / legal name", "text", true, { minLength: 2, maxLength: 200 }, "1.1", "string", [], null, "organization");
  common("ORG_REGISTRATION_NUMBER", "organization", "Kayıt numarası", "Registration number", "text", true, { minLength: 2, maxLength: 100 }, "1.2", "string");
  common("ORG_ESTABLISHMENT_YEAR", "organization", "Kuruluş yılı", "Year established", "number", true, { min: 1800, max: 2100, step: 1 }, "1.3", "integer");
  common("ORG_ADDRESS", "organization", "Şirket adresi", "Company address", "textarea", true, { minLength: 5, maxLength: 1000 }, "1.4", "string", [], null, "street-address");
  common("ORG_WEBSITE", "organization", "Şirket web sitesi", "Company website", "url", false, { maxLength: 500, format: "url" }, "1.5", "string", [], null, "url");
  common("CONTACT_FULL_NAME", "organization", "İletişim kişisi", "Contact person", "text", true, { minLength: 2, maxLength: 120 }, "1.6", "string", [], null, "name");
  common("CONTACT_POSITION", "organization", "Görevi / ünvanı", "Position / title", "text", true, { minLength: 2, maxLength: 160 }, "1.7", "string", [], null, "organization-title");
  common("CONTACT_EMAIL", "organization", "E-posta", "Email", "email", true, { minLength: 3, maxLength: 254, format: "email" }, "1.8", "string", [], null, "email");
  common("CONTACT_PHONE", "organization", "Telefon", "Phone", "tel", true, { minLength: 7, maxLength: 40, format: "phone" }, "1.9", "string", [], null, "tel");
  common("ORG_NACE_CODES", "organization", "NACE kodu / kodları", "NACE code(s)", "text", true, { minLength: 2, maxLength: 300 }, "1.10", "string");
  common("ORG_SECTORS", "organization", "Faaliyet gösterilen sektörler", "Sectors of operation", "checkbox-group", true, { minSelections: 1, maxSelections: 11 }, "1.11", "string[]", SECTORS);
  common("ORG_SECTOR_OTHER", "organization", "Diğer sektör", "Other sector", "text", true, { minLength: 2, maxLength: 160 }, "1.11 — Diğer", "string", [], { fieldKey: "ORG_SECTORS", contains: "other" });

  common("COMPANY_DESCRIPTION", "company", "Şirket hakkında kısa açıklama", "Short company description", "textarea", true, { minLength: 10, maxLength: 3000, maxWords: 300 }, "2.1", "string");
  common("COMPANY_REVENUE_2024_2025_TRY", "company", "2024/2025 gelirleri (TL)", "2024/2025 revenue (TRY)", "text", true, { minLength: 1, maxLength: 200 }, "2.2", "string");
  common("COMPANY_RD_EXPENSE_SHARE_PERCENT", "company", "Gelirin yüzdesi olarak Ar-Ge giderleri", "R&D expenditure as a percentage of revenue", "number", true, { min: 0, max: 100, step: 0.01 }, "2.3", "decimal");
  common("COMPANY_MAIN_PRODUCTS", "company", "Başlıca ürünler", "Main products", "textarea", true, { minLength: 2, maxLength: 3000 }, "2.4", "string");
  common("COMPANY_MAIN_SERVICES", "company", "Başlıca hizmetler", "Main services", "textarea", true, { minLength: 2, maxLength: 3000 }, "2.5", "string");
  common("COMPANY_LOCATIONS", "company", "Ulusal ve uluslararası lokasyonlar", "National and international locations", "textarea", true, { minLength: 2, maxLength: 2000 }, "2.6 — lokasyonlar", "string");
  common("COMPANY_DEPARTMENTS", "company", "Mevcut departmanlar ve faaliyetler", "Departments and activities", "checkbox-group", true, { minSelections: 1, maxSelections: 7 }, "2.6 — departmanlar ve faaliyetler", "string[]", DEPARTMENTS);
  common("COMPANY_EXPORT_STATUS", "company", "İhracat durumu", "Export status", "text", true, { minLength: 1, maxLength: 500 }, "2.6 — ihracat durumu", "string");
  common("COMPANY_EMPLOYEE_COUNT", "company", "Çalışan sayısı", "Number of employees", "number", true, { min: 1, max: 1000000, step: 1 }, "2.7", "integer");
  common("COMPANY_WOMEN_MANAGEMENT_PERCENT", "company", "Yönetim kadrosundaki kadınların oranı (%)", "Women in management (%)", "number", true, { min: 0, max: 100, step: 0.01 }, "2.8", "decimal");
  common("COMPANY_WOMEN_TOTAL_PERCENT", "company", "Toplam çalışanlar içindeki kadın oranı (%)", "Women in the total workforce (%)", "number", true, { min: 0, max: 100, step: 0.01 }, "2.9", "decimal");

  common("APPLICANT_ROLES", "applicant", "Başlıca roller", "Main roles", "checkbox-group", true, { minSelections: 1, maxSelections: 8 }, "3.1", "string[]", ROLES);
  common("APPLICANT_ROLE_OTHER", "applicant", "Diğer rol", "Other role", "text", true, { minLength: 2, maxLength: 160 }, "3.1 — Diğer", "string", [], { fieldKey: "APPLICANT_ROLES", contains: "other" });
  common("APPLICANT_OWN_PRODUCT_PERCENT", "applicant", "Şirket içinde geliştirilen ürünlerin oranı (%)", "Products developed in-house (%)", "number", false, { min: 0, max: 100, step: 0.01 }, "3.2 — ürünler", "decimal");
  common("APPLICANT_OWN_SERVICE_PERCENT", "applicant", "Şirket içinde geliştirilen hizmetlerin oranı (%)", "Services developed in-house (%)", "number", false, { min: 0, max: 100, step: 0.01 }, "3.2 — hizmetler", "decimal");
  common("APPLICANT_OWN_SOFTWARE_PERCENT", "applicant", "Şirket içinde geliştirilen yazılımların oranı (%)", "Software developed in-house (%)", "number", false, { min: 0, max: 100, step: 0.01 }, "3.2 — yazılım", "decimal");
  common("APPLICANT_NO_IN_HOUSE_DEVELOPMENT", "applicant", "Şirket içinde geliştirilen ürün, hizmet veya yazılım yok", "No products, services or software are developed in-house", "checkbox", false, {}, "3.2 — Yok", "boolean");
  common("APPLICANT_PRODUCTION_PRINCIPLE", "applicant", "Temel üretim prensibi", "Main production principle", "select", true, { allowedValues: PRODUCTION.map(function (item) { return item.value; }) }, "3.3", "string", PRODUCTION);
  common("APPLICANT_PRODUCTION_PRINCIPLE_OTHER", "applicant", "Diğer üretim prensibi", "Other production principle", "text", true, { minLength: 2, maxLength: 160 }, "3.3 — Diğer", "string", [], { fieldKey: "APPLICANT_PRODUCTION_PRINCIPLE", equals: "other" });
  common("APPLICANT_DIGITALIZATION_LEVEL", "applicant", "Mevcut dijitalleşme düzeyi", "Current level of digitalisation", "textarea", true, { minLength: 20, maxLength: 5000 }, "3.4", "string");

  function previousAssessmentField(spec) {
    add(spec);
  }

  previousAssessmentField({
    key: "APPLICANT_PREVIOUS_ASSESSMENT",
    section: "applicant",
    tr: "Şirket daha önce dijital olgunluk değerlendirmesi yaptırdı mı?",
    en: "Has the company previously completed a digital maturity assessment?",
    type: "radio-group",
    required: true,
    validation: { allowedValues: ["yes", "no"] },
    options: YES_NO,
    sourceRefs: refs({ S1: "4.7", S2: "4.1", S3: "3.5", S4: "3.5" }),
    backend: "string"
  });
  previousAssessmentField({
    key: "APPLICANT_ASSESSMENT_NAME_PROVIDER",
    section: "applicant",
    tr: "Değerlendirme adı ve sağlayıcı",
    en: "Assessment name and provider",
    type: "text",
    required: true,
    validation: { minLength: 2, maxLength: 300 },
    when: { fieldKey: "APPLICANT_PREVIOUS_ASSESSMENT", equals: "yes" },
    sourceRefs: refs({ S1: "4.7.1", S2: "4.1.1", S3: "3.5.1", S4: "3.5.1" }),
    backend: "string"
  });
  previousAssessmentField({
    key: "APPLICANT_ASSESSMENT_MONTH",
    section: "applicant",
    tr: "Değerlendirme ayı / yılı",
    en: "Assessment month / year",
    type: "month",
    required: true,
    validation: { min: "2000-01", max: "2100-12" },
    when: { fieldKey: "APPLICANT_PREVIOUS_ASSESSMENT", equals: "yes" },
    sourceRefs: refs({ S1: "4.7.2", S2: "4.1.2", S3: "3.5.2", S4: "3.5.2" }),
    backend: "string"
  });
  previousAssessmentField({
    key: "APPLICANT_ASSESSMENT_RECOMMENDATIONS",
    section: "applicant",
    tr: "Önceki değerlendirmedeki başlıca iyileştirme önerileri",
    en: "Main improvement recommendations from the previous assessment",
    type: "textarea",
    required: true,
    validation: { minLength: 5, maxLength: 4000 },
    when: { fieldKey: "APPLICANT_PREVIOUS_ASSESSMENT", equals: "yes" },
    sourceRefs: refs({ S1: "4.7.3 (şablonda 4.7 olarak tekrar edilmiş)", S2: "4.1.3", S3: "3.5.3", S4: "3.5.3" }),
    backend: "string"
  });
  previousAssessmentField({
    key: "APPLICANT_DIGITAL_MATURITY_LEVEL",
    section: "applicant",
    tr: "Şirketin dijital olgunluk seviyesi (1–5)",
    en: "Company digital maturity level (1–5)",
    type: "number",
    required: true,
    validation: { min: 1, max: 5, step: 1 },
    when: { fieldKey: "APPLICANT_PREVIOUS_ASSESSMENT", equals: "yes" },
    sourceRefs: refs({ S2: "4.1.4", S3: "3.5.4", S4: "3.5.4" }),
    backend: "integer"
  });
  previousAssessmentField({
    key: "APPLICANT_ASSESSMENT_REPORT_CERTIFICATE_INFO",
    section: "applicant",
    tr: "Değerlendirme raporu / sertifika bilgileri",
    en: "Assessment report / certificate information",
    helpTr: "Belgenin adı, tarihi, sağlayıcısı ve ayırt edici bilgilerini yazın.",
    helpEn: "Enter the document name, date, provider and identifying details.",
    type: "textarea",
    required: true,
    validation: { minLength: 5, maxLength: 2000 },
    when: { fieldKey: "APPLICANT_PREVIOUS_ASSESSMENT", equals: "yes" },
    sourceRefs: refs({
      S2: "4.1.5 — yükleme sorusu metinsel alana dönüştürüldü",
      S3: "3.5.5 — yükleme sorusu metinsel alana dönüştürüldü",
      S4: "3.5.5 — yükleme sorusu metinsel alana dönüştürüldü"
    }),
    backend: "string"
  });
  previousAssessmentField({
    key: "APPLICANT_IMPLEMENTED_RECOMMENDATIONS",
    section: "applicant",
    tr: "Uygulamaya konulan öneriler",
    en: "Recommendations already implemented",
    type: "textarea",
    required: true,
    validation: { minLength: 2, maxLength: 4000 },
    when: { fieldKey: "APPLICANT_PREVIOUS_ASSESSMENT", equals: "yes" },
    sourceRefs: refs({ S1: "4.7.4", S2: "4.1.6", S3: "3.5.6", S4: "3.5.6 (şablonda 3.4.6)" }),
    backend: "string"
  });

  function serviceField(service, key, section, tr, en, question, type, validation, required, options, when, helpTr, helpEn) {
    add({
      key: key,
      section: section,
      tr: tr,
      en: en,
      helpTr: helpTr,
      helpEn: helpEn,
      type: type || "textarea",
      required: required !== false,
      validation: validation || { minLength: 20, maxLength: 5000 },
      options: options || [],
      service: CODES[service],
      when: when || { serviceSelected: CODES[service] },
      sourceRefs: refs((function () {
        const result = {};
        result[service] = question;
        return result;
      })()),
      backend: type === "number" ? "integer" : (type === "checkbox-group" ? "string[]" : "string")
    });
  }

  const S1_VALUE_AREAS = Object.freeze([
    opt("strategy", "Strateji", "Strategy"),
    opt("rd", "Ar-Ge", "R&D"),
    opt("product-development", "Ürün Geliştirme", "Product development"),
    opt("industrial-engineering", "Endüstri Mühendisliği", "Industrial engineering"),
    opt("production", "Üretim", "Production"),
    opt("order-management", "Sipariş Yönetimi", "Order management"),
    opt("planning", "Planlama", "Planning"),
    opt("quality", "Kalite", "Quality"),
    opt("maintenance", "Bakım", "Maintenance"),
    opt("service", "Hizmet", "Service"),
    opt("sales-distribution", "Satış / Dağıtım", "Sales / distribution"),
    opt("supply-chain", "Tedarik Zinciri", "Supply chain")
  ]);
  const S1_TECHNOLOGIES = Object.freeze([
    opt("ERP", "ERP", "ERP"),
    opt("PLM", "PLM", "PLM"),
    opt("CAD-CAM", "CAD/CAM", "CAD/CAM"),
    opt("design-tools", "Tasarım Araçları", "Design tools"),
    opt("MES", "MES", "MES"),
    opt("AI", "Yapay Zekâ", "Artificial intelligence"),
    opt("AGV", "AGV", "AGV"),
    opt("robotics", "Robotik", "Robotics"),
    opt("VR-AR", "VR/AR", "VR/AR"),
    opt("IoT", "Nesnelerin İnterneti (IoT)", "Internet of Things (IoT)"),
    opt("digital-support-systems", "Dijital Destek Sistemleri", "Digital support systems"),
    opt("other", "Diğer", "Other")
  ]);

  serviceField("S1", "DTR_S1_MOTIVATION", "s1", "Başvurunun temel motivasyonu", "Main motivation for the application", "4.1", "textarea", { minLength: 20, maxLength: 5000 }, true, [], null, "Nedenlerinizi, elde etmek istediklerinizi ve beklentilerinizi açıklayın.", "Explain your reasons, intended outcomes and expectations.");
  serviceField("S1", "DTR_S1_BUSINESS_CHALLENGES", "s1", "Dijitalleşmeyle ele alınacak iş zorlukları", "Business challenges to address through digitalisation", "4.2");
  serviceField("S1", "DTR_S1_DIGITALIZATION_BARRIERS", "s1", "Mevcut dijitalleşme zorlukları", "Current digitalisation barriers", "4.3");
  serviceField("S1", "DTR_S1_VALUE_CREATION_AREAS", "s1", "Destek gereken değer yaratma alanları", "Value creation areas requiring support", "4.4", "checkbox-group", { minSelections: 1, maxSelections: 12 }, true, S1_VALUE_AREAS);
  serviceField("S1", "DTR_S1_TECHNOLOGY_AREAS", "s1", "Destek gereken teknoloji alanları", "Technology areas requiring support", "4.5", "checkbox-group", { minSelections: 1, maxSelections: 12 }, true, S1_TECHNOLOGIES);
  serviceField("S1", "DTR_S1_TECHNOLOGY_AREA_OTHER", "s1", "Diğer teknoloji alanı", "Other technology area", "4.5 — Diğer", "text", { minLength: 2, maxLength: 200 }, true, [], { all: [{ serviceSelected: CODES.S1 }, { fieldKey: "DTR_S1_TECHNOLOGY_AREAS", contains: "other" }] });
  serviceField("S1", "DTR_S1_CURRENT_DIGITAL_TOOLS", "s1", "Kullanılan dijital araçlar veya BT sistemleri", "Digital tools or IT systems currently used", "4.6", "textarea", { minLength: 5, maxLength: 4000 });
  serviceField("S1", "DTR_S1_EXPECTED_BENEFITS", "s1", "Değerlendirmeden beklenen faydalar", "Expected benefits from the assessment", "5.1");
  serviceField("S1", "DTR_S1_PLANNED_ACTIVITIES", "s1", "Sonraki aşamalarda planlanan faaliyetler", "Activities planned for the next stages", "5.2", "textarea", { minLength: 10, maxLength: 5000 });
  serviceField("S1", "DTR_S1_COMPETITIVENESS_CONTRIBUTION", "s1", "Rekabet gücüne beklenen katkı", "Expected contribution to competitiveness", "5.3");
  serviceField("S1", "DTR_S1_KEY_PARTICIPANTS", "s1", "Değerlendirmede yer alacak kilit kişiler", "Key people who will participate in the assessment", "6.1", "textarea", { minLength: 5, maxLength: 4000 }, true, [], null, "Ad, görev ve uzmanlık alanlarını belirtin.", "Provide names, roles and areas of expertise.");
  serviceField("S1", "DTR_S1_PROJECT_LOCATION", "s1", "Proje faaliyetlerinin gerçekleştirileceği yer", "Location of project activities", "6.2", "textarea", { minLength: 2, maxLength: 2000 });
  serviceField("S1", "DTR_S1_FOCUS_AREA", "s1", "Şirket içindeki odak alanı, ürün grubu ve süreç zinciri", "Internal focus area, product group and process chain", "6.3", "textarea", { minLength: 10, maxLength: 4000 });
  serviceField("S1", "DTR_S1_ADDITIONAL_INFO", "s1", "Ek bilgiler", "Additional information", "6.4", "textarea", { maxLength: 5000 }, false);

  const S2_AREAS = Object.freeze([
    opt("digital-strategy", "Dijital dönüşüm stratejisi", "Digital transformation strategy"),
    opt("business-model", "İş modeli", "Business model"),
    opt("green-digitalisation", "Yeşil hedefler için enerji verimliliği / sürdürülebilirlik / dijitalleşme", "Energy efficiency / sustainability / digitalisation for green goals"),
    opt("product-innovation-lifecycle", "Ürün İnovasyonu ve Yaşam Döngüsü", "Product innovation and lifecycle"),
    opt("quality-maintenance", "Kalite ve Bakım", "Quality and maintenance"),
    opt("partnership-strategy", "Ortaklık stratejisi", "Partnership strategy"),
    opt("data-it-system", "Veri ve BT Sistemi", "Data and IT systems"),
    opt("certification-strategy", "Sertifikasyon stratejisi", "Certification strategy"),
    opt("planning-control", "Planlama ve Kontrol", "Planning and control"),
    opt("organisation-leadership", "Organizasyon ve Liderlik", "Organisation and leadership"),
    opt("new-market-entry-eu", "Yeni pazara giriş (AB için)", "New market entry (EU)"),
    opt("cost-effectiveness", "Maliyet etkinliği", "Cost effectiveness"),
    opt("pricing", "Fiyatlandırma", "Pricing"),
    opt("other", "Diğer", "Other")
  ]);

  serviceField("S2", "DTR_S2_BUSINESS_CHALLENGES", "s2", "Dijitalleşmeyle ele alınacak iş zorlukları", "Business challenges to address through digitalisation", "4.2");
  serviceField("S2", "DTR_S2_DIGITALIZATION_BARRIERS", "s2", "Mevcut dijitalleşme zorlukları", "Current digitalisation barriers", "4.3");
  serviceField("S2", "DTR_S2_CONSULTING_AREAS", "s2", "Talep edilen danışmanlık alanları", "Requested consulting areas", "4.4", "checkbox-group", { minSelections: 1, maxSelections: 14 }, true, S2_AREAS);
  serviceField("S2", "DTR_S2_CONSULTING_AREA_OTHER", "s2", "Diğer danışmanlık alanı", "Other consulting area", "4.4 — Diğer", "text", { minLength: 2, maxLength: 200 }, true, [], { all: [{ serviceSelected: CODES.S2 }, { fieldKey: "DTR_S2_CONSULTING_AREAS", contains: "other" }] });
  serviceField("S2", "DTR_S2_EXPECTED_RESULTS", "s2", "Danışmanlık hizmetinden beklenen sonuçlar", "Expected results from the consulting service", "4.5");
  serviceField("S2", "DTR_S2_EXTERNAL_SUPPORT_RATIONALE", "s2", "Dış danışmanlık desteğine ihtiyaç duyulmasının nedeni", "Reason external consulting support is needed", "4.6");
  serviceField("S2", "DTR_S2_TIMELINE_URGENCY", "s2", "Tahmini zaman çizelgesi / aciliyet", "Estimated timeline / urgency", "4.7", "textarea", { minLength: 5, maxLength: 2000 });
  serviceField("S2", "DTR_S2_OPERATIONAL_IMPROVEMENTS", "s2", "Beklenen operasyonel iyileştirmeler", "Expected operational improvements", "5.1 (şablonda “5.1 4” yazıyor)");
  serviceField("S2", "DTR_S2_EFFICIENCY_QUALITY_SUSTAINABILITY_IMPACT", "s2", "Verimlilik, etkinlik, kalite veya sürdürülebilirlik üzerindeki beklenen etki", "Expected impact on efficiency, effectiveness, quality or sustainability", "5.2");
  serviceField("S2", "DTR_S2_CAPACITY_CONTRIBUTION", "s2", "Dijital dönüşüm kapasitesine beklenen katkı", "Expected contribution to digital transformation capacity", "5.3");
  serviceField("S2", "DTR_S2_EMPLOYEE_CUSTOMER_PROCESS_BENEFITS", "s2", "Çalışanlar, müşteriler ve üretim süreçleri için beklenen faydalar", "Expected benefits for employees, customers and production processes", "5.4");
  serviceField("S2", "DTR_S2_KEY_PARTICIPANTS", "s2", "Danışmanlık hizmetinde yer alacak kilit kişiler", "Key people who will participate in the consulting service", "6.1", "textarea", { minLength: 5, maxLength: 4000 });
  serviceField("S2", "DTR_S2_PROJECT_LOCATION_PRODUCT_PROCESS", "s2", "Proje yeri, ürün grubu ve süreç zinciri", "Project location, product group and process chain", "6.2", "textarea", { minLength: 5, maxLength: 4000 });
  serviceField("S2", "DTR_S2_FOCUS_AREA", "s2", "Şirket içindeki danışmanlık odak alanı", "Internal consulting focus area", "6.3", "textarea", { minLength: 10, maxLength: 4000 });
  serviceField("S2", "DTR_S2_ADDITIONAL_INFO", "s2", "Ek bilgiler", "Additional information", "6.4", "textarea", { maxLength: 5000 }, false);

  const S3_STAGES = Object.freeze([
    opt("prototype", "Prototip", "Prototype"),
    opt("pilot", "Pilot aşaması", "Pilot stage"),
    opt("market-ready", "Pazara hazır", "Market-ready"),
    opt("deployed", "Zaten uygulanmış", "Already deployed")
  ]);
  [
    ["DTR_S3_TECHNOLOGY_NAME", "Teknoloji / sistem / ekipmanın adı", "Name of the technology / system / equipment", "4.1", "text", { minLength: 2, maxLength: 300 }],
    ["DTR_S3_STRATEGIC_CONTRIBUTION", "Stratejik konum ve rekabet avantajına katkı", "Strategic position and contribution to competitive advantage", "4.2", "textarea", { minLength: 20, maxLength: 6000 }],
    ["DTR_S3_PROVIDER_NAME", "Teknoloji sağlayıcısı / geliştirici adı", "Technology provider / developer name", "4.3", "text", { minLength: 2, maxLength: 300 }],
    ["DTR_S3_TRL_LEVEL", "Teknoloji hazırlık seviyesi (TRL)", "Technology Readiness Level (TRL)", "4.4 — TRL", "number", { min: 1, max: 9, step: 1 }],
    ["DTR_S3_DEVELOPMENT_STAGE", "Mevcut geliştirme veya uygulama aşaması", "Current development or implementation stage", "4.4 — geliştirme / uygulama aşaması", "radio-group", { allowedValues: S3_STAGES.map(function (item) { return item.value; }) }, true, S3_STAGES],
    ["DTR_S3_TECHNICAL_DESCRIPTION", "Teknik tanım", "Technical description", "4.5", "textarea", { minLength: 20, maxLength: 5000, maxWords: 400 }],
    ["DTR_S3_INDUSTRIAL_APPLICATION", "Hedeflenen endüstriyel uygulama alanı", "Target industrial application area", "4.6", "textarea", { minLength: 20, maxLength: 6000 }],
    ["DTR_S3_LIMITATIONS", "Mevcut sınırlamalar veya teknik kaygılar", "Current limitations or technical concerns", "4.7", "textarea", { minLength: 20, maxLength: 6000 }],
    ["DTR_S3_ESTIMATED_EFFORT_DURATION", "Planlanan test ve doğrulama faaliyetleri için tahmini çaba ve süre", "Estimated effort and duration for the planned testing and validation activities", "4.9", "textarea", { minLength: 5, maxLength: 3000 }],
    ["DTR_S3_OBJECTIVES", "Test ve doğrulama sürecinin ana amaçları", "Main objectives of the testing and validation process", "5.1", "textarea", { minLength: 20, maxLength: 6000 }],
    ["DTR_S3_SUCCESS_CRITERIA", "Beklenen performans göstergeleri / başarı kriterleri", "Expected performance indicators / success criteria", "5.2", "textarea", { minLength: 20, maxLength: 6000 }],
    ["DTR_S3_RISKS", "Değerlendirilecek riskler veya belirsizlikler", "Risks or uncertainties to be assessed", "5.3", "textarea", { minLength: 20, maxLength: 6000 }],
    ["DTR_S3_EXPECTED_OUTPUTS", "Test faaliyetlerinden beklenen çıktılar / kavram kanıtı", "Expected outputs / proof of concept from the testing activities", "5.4", "textarea", { minLength: 20, maxLength: 6000 }],
    ["DTR_S3_TEST_ENVIRONMENT_REQUIREMENTS", "Talep edilen hizmetler / test ortamı gereksinimleri", "Requested services / test environment requirements", "5.5", "textarea", { minLength: 20, maxLength: 6000 }],
    ["DTR_S3_INVESTMENT_DECISION_CONTRIBUTION", "Yatırım karar alma sürecine beklenen katkı", "Expected contribution to investment decision-making", "6.1", "textarea", { minLength: 20, maxLength: 5000 }],
    ["DTR_S3_IMPROVEMENTS", "Beklenen operasyonel veya teknik iyileştirmeler", "Expected operational or technical improvements", "6.2", "textarea", { minLength: 20, maxLength: 5000 }],
    ["DTR_S3_COMMERCIALIZATION", "Potansiyel ticarileştirme veya yaygınlaştırma olanakları", "Potential commercialisation or deployment opportunities", "6.3", "textarea", { minLength: 20, maxLength: 5000 }],
    ["DTR_S3_INDUSTRIAL_BENEFITS", "Endüstriyel uygulamadan beklenen faydalar", "Expected benefits from industrial application", "6.4", "textarea", { minLength: 20, maxLength: 5000 }],
    ["DTR_S3_KEY_PARTICIPANTS", "Test ve doğrulama süreçlerinde yer alacak kilit kişiler", "Key people involved in testing and validation", "7.1", "textarea", { minLength: 5, maxLength: 4000 }],
    ["DTR_S3_PROJECT_LOCATION_PRODUCT_PROCESS", "Proje yeri, ürün grubu ve süreç zinciri", "Project location, product group and process chain", "7.2", "textarea", { minLength: 5, maxLength: 4000 }],
    ["DTR_S3_FOCUS_AREA", "Şirket içindeki test ve doğrulama odak alanı", "Internal testing and validation focus area", "7.3", "textarea", { minLength: 10, maxLength: 4000 }],
    ["DTR_S3_ADDITIONAL_INFO", "Ek bilgiler", "Additional information", "7.4", "textarea", { maxLength: 5000 }, false]
  ].forEach(function (item) {
    serviceField("S3", item[0], "s3", item[1], item[2], item[3], item[4], item[5], item[6] !== false, item[7] || []);
  });

  function partner(item) {
    PARTNER_FIELDS.push(field({
      key: "DTR_S4_PARTNER_" + item[0],
      section: "s4-partners",
      tr: item[1],
      en: item[2],
      type: item[4],
      required: item[5] !== false,
      validation: item[6],
      options: item[8] || [],
      service: CODES.S4,
      when: item[9] || { serviceSelected: CODES.S4 },
      sourceRefs: refs({ S4: item[3] }),
      backend: item[7],
      repeatable: "DTR_S4_PARTNERS"
    }));
  }

  [
    ["ORG_LEGAL_NAME", "Şirket adı / yasal unvan", "Company name / legal name", "4.1.1", "text", true, { minLength: 2, maxLength: 200 }, "string"],
    ["ORG_REGISTRATION_NUMBER", "Kayıt numarası", "Registration number", "4.1.2", "text", true, { minLength: 2, maxLength: 100 }, "string"],
    ["ORG_ESTABLISHMENT_YEAR", "Kuruluş yılı", "Year established", "4.1.3", "number", true, { min: 1800, max: 2100, step: 1 }, "integer"],
    ["ORG_ADDRESS", "Şirket adresi", "Company address", "4.1.4", "textarea", true, { minLength: 5, maxLength: 1000 }, "string"],
    ["ORG_WEBSITE", "Şirket web sitesi", "Company website", "4.1.5", "url", false, { maxLength: 500, format: "url" }, "string"],
    ["CONTACT_FULL_NAME", "İletişim kişisi", "Contact person", "4.1.6", "text", true, { minLength: 2, maxLength: 120 }, "string"],
    ["CONTACT_POSITION", "Görevi / ünvanı", "Position / title", "4.1.7", "text", true, { minLength: 2, maxLength: 160 }, "string"],
    ["CONTACT_EMAIL", "E-posta", "Email", "4.1.8", "email", true, { minLength: 3, maxLength: 254, format: "email" }, "string"],
    ["CONTACT_PHONE", "Telefon", "Phone", "4.1.9", "tel", true, { minLength: 7, maxLength: 40, format: "phone" }, "string"],
    ["ORG_NACE_CODES", "NACE kodu / kodları", "NACE code(s)", "4.1.10", "text", true, { minLength: 2, maxLength: 300 }, "string"],
    ["ORG_SECTORS", "Faaliyet gösterilen sektörler", "Sectors of operation", "4.1.11", "checkbox-group", true, { minSelections: 1, maxSelections: 5 }, "string[]", PARTNER_SECTORS],
    ["COMPANY_DESCRIPTION", "Şirket hakkında kısa açıklama", "Short company description", "4.2.1", "textarea", true, { minLength: 10, maxLength: 3000, maxWords: 300 }, "string"],
    ["COMPANY_REVENUE_2024_2025_TRY", "2024/2025 gelirleri (TL)", "2024/2025 revenue (TRY)", "4.2.2", "text", true, { minLength: 1, maxLength: 200 }, "string"],
    ["COMPANY_RD_EXPENSE_SHARE_PERCENT", "Gelirin yüzdesi olarak Ar-Ge giderleri", "R&D expenditure as a percentage of revenue", "4.2.3", "number", true, { min: 0, max: 100, step: 0.01 }, "decimal"],
    ["COMPANY_MAIN_PRODUCTS", "Başlıca ürünler", "Main products", "4.2.4", "textarea", true, { minLength: 2, maxLength: 3000 }, "string"],
    ["COMPANY_MAIN_SERVICES", "Başlıca hizmetler", "Main services", "4.2.5", "textarea", true, { minLength: 2, maxLength: 3000 }, "string"],
    ["COMPANY_LOCATIONS", "Ulusal ve uluslararası lokasyonlar", "National and international locations", "4.2.6 — lokasyonlar", "textarea", true, { minLength: 2, maxLength: 2000 }, "string"],
    ["COMPANY_DEPARTMENTS", "Mevcut departmanlar ve faaliyetler", "Departments and activities", "4.2.6 — departmanlar ve faaliyetler", "checkbox-group", true, { minSelections: 1, maxSelections: 7 }, "string[]", DEPARTMENTS],
    ["COMPANY_EXPORT_STATUS", "İhracat durumu", "Export status", "4.2.6 — ihracat durumu", "text", true, { minLength: 1, maxLength: 500 }, "string"],
    ["COMPANY_EMPLOYEE_COUNT", "Çalışan sayısı", "Number of employees", "4.2.7", "number", true, { min: 1, max: 1000000, step: 1 }, "integer"],
    ["COMPANY_WOMEN_MANAGEMENT_PERCENT", "Yönetim kadrosundaki kadınların oranı (%)", "Women in management (%)", "4.2.8", "number", true, { min: 0, max: 100, step: 0.01 }, "decimal"],
    ["COMPANY_WOMEN_TOTAL_PERCENT", "Toplam çalışanlar içindeki kadın oranı (%)", "Women in the total workforce (%)", "4.2.9", "number", true, { min: 0, max: 100, step: 0.01 }, "decimal"],
    ["ROLES", "Başlıca roller", "Main roles", "4.3.1", "checkbox-group", true, { minSelections: 1, maxSelections: 8 }, "string[]", ROLES],
    ["ROLE_OTHER", "Diğer rol", "Other role", "4.3.1 — Diğer", "text", true, { minLength: 2, maxLength: 160 }, "string", null, { repeatableFieldKey: "DTR_S4_PARTNER_ROLES", contains: "other" }],
    ["OWN_PRODUCT_PERCENT", "Şirket içinde geliştirilen ürünlerin oranı (%)", "Products developed in-house (%)", "4.3.2 — ürünler", "number", false, { min: 0, max: 100, step: 0.01 }, "decimal"],
    ["OWN_SERVICE_PERCENT", "Şirket içinde geliştirilen hizmetlerin oranı (%)", "Services developed in-house (%)", "4.3.2 — hizmetler", "number", false, { min: 0, max: 100, step: 0.01 }, "decimal"],
    ["OWN_SOFTWARE_PERCENT", "Şirket içinde geliştirilen yazılımların oranı (%)", "Software developed in-house (%)", "4.3.2 — yazılım", "number", false, { min: 0, max: 100, step: 0.01 }, "decimal"],
    ["NO_IN_HOUSE_DEVELOPMENT", "Şirket içinde geliştirilen ürün, hizmet veya yazılım yok", "No products, services or software are developed in-house", "4.3.2 — Yok", "checkbox", false, {}, "boolean"],
    ["PRODUCTION_PRINCIPLE", "Temel üretim prensibi", "Main production principle", "4.3.3", "select", true, { allowedValues: PRODUCTION.map(function (value) { return value.value; }) }, "string", PRODUCTION],
    ["PRODUCTION_PRINCIPLE_OTHER", "Diğer üretim prensibi", "Other production principle", "4.3.3 — Diğer", "text", true, { minLength: 2, maxLength: 160 }, "string", null, { repeatableFieldKey: "DTR_S4_PARTNER_PRODUCTION_PRINCIPLE", equals: "other" }],
    ["DIGITALIZATION_LEVEL", "Mevcut dijitalleşme düzeyi", "Current level of digitalisation", "4.3.4", "textarea", true, { minLength: 20, maxLength: 5000 }, "string"],
    ["PREVIOUS_ASSESSMENT", "Şirket daha önce dijital olgunluk değerlendirmesi yaptırdı mı?", "Has the company previously completed a digital maturity assessment?", "4.3.5", "radio-group", true, { allowedValues: ["yes", "no"] }, "string", YES_NO],
    ["ASSESSMENT_NAME_PROVIDER", "Değerlendirme adı ve sağlayıcı", "Assessment name and provider", "4.3.5.1", "text", true, { minLength: 2, maxLength: 300 }, "string", null, { repeatableFieldKey: "DTR_S4_PARTNER_PREVIOUS_ASSESSMENT", equals: "yes" }],
    ["ASSESSMENT_MONTH", "Değerlendirme ayı / yılı", "Assessment month / year", "4.3.5.2", "month", true, { min: "2000-01", max: "2100-12" }, "string", null, { repeatableFieldKey: "DTR_S4_PARTNER_PREVIOUS_ASSESSMENT", equals: "yes" }],
    ["ASSESSMENT_RECOMMENDATIONS", "Önceki değerlendirmedeki başlıca iyileştirme önerileri", "Main improvement recommendations from the previous assessment", "4.3.5.3", "textarea", true, { minLength: 5, maxLength: 4000 }, "string", null, { repeatableFieldKey: "DTR_S4_PARTNER_PREVIOUS_ASSESSMENT", equals: "yes" }],
    ["DIGITAL_MATURITY_LEVEL", "Şirketin dijital olgunluk seviyesi (1–5)", "Company digital maturity level (1–5)", "4.3.5.4", "number", true, { min: 1, max: 5, step: 1 }, "integer", null, { repeatableFieldKey: "DTR_S4_PARTNER_PREVIOUS_ASSESSMENT", equals: "yes" }],
    ["ASSESSMENT_REPORT_CERTIFICATE_INFO", "Değerlendirme raporu / sertifika bilgileri", "Assessment report / certificate information", "4.3.5.5 — yükleme sorusu metinsel alana dönüştürüldü", "textarea", true, { minLength: 5, maxLength: 2000 }, "string", null, { repeatableFieldKey: "DTR_S4_PARTNER_PREVIOUS_ASSESSMENT", equals: "yes" }],
    ["IMPLEMENTED_RECOMMENDATIONS", "Uygulamaya konulan öneriler", "Recommendations already implemented", "4.3.5.6", "textarea", true, { minLength: 2, maxLength: 4000 }, "string", null, { repeatableFieldKey: "DTR_S4_PARTNER_PREVIOUS_ASSESSMENT", equals: "yes" }]
  ].forEach(partner);

  [
    ["DTR_S4_PROBLEM_OPPORTUNITY", "Endüstriyel sorun veya teknolojik fırsat", "Industrial problem or technological opportunity", "5.1"],
    ["DTR_S4_SCIENTIFIC_TECHNICAL_OBJECTIVES", "Bilimsel ve teknik amaçlar", "Scientific and technical objectives", "5.2"],
    ["DTR_S4_PREVIOUS_WORK_EVIDENCE", "Önceki çalışmalar / destekleyici kanıtlar", "Previous work / supporting evidence", "5.3"],
    ["DTR_S4_STATE_OF_ART_INNOVATION", "Son teknoloji ve inovasyon", "State of the art and innovation", "5.4"],
    ["DTR_S4_WORK_PLAN", "Çalışma planı / çalışma paketleri / zaman çizelgesi", "Work plan / work packages / timeline", "5.5 — çalışma planı"],
    ["DTR_S4_RISKS_MITIGATION", "Potansiyel riskler ve azaltma hususları", "Potential risks and mitigation considerations", "5.5 — riskler (şablonda numara tekrar edilmiş)"],
    ["DTR_S4_CONSORTIUM_STRUCTURE", "Konsorsiyum yapısı ve ortakların uzmanlığı", "Consortium structure and partner expertise", "6.1"],
    ["DTR_S4_EXPECTED_CENTER_SUPPORT", "Dijital inovasyon merkezlerinden beklenen yetkinlikler ve destek", "Capabilities and support expected from digital innovation centres", "6.2"],
    ["DTR_S4_INTERNAL_RESOURCES", "Ortak geliştirme faaliyetleri için mevcut dahili kaynaklar", "Available internal resources for joint development activities", "6.3"],
    ["DTR_S4_PROJECT_MANAGEMENT", "Proje yönetimi", "Project management", "6.4"],
    ["DTR_S4_TECHNICAL_TEAM", "Teknik ekip / uzmanlık", "Technical team / expertise", "6.5"],
    ["DTR_S4_PRODUCTION_TEST_ENVIRONMENT", "Üretim / test ortamı", "Production / testing environment", "6.6"],
    ["DTR_S4_PLANNED_JOINT_INVESTMENT", "Ortaklar tarafından planlanan ortak yatırım", "Joint investment planned by the partners", "6.7"],
    ["DTR_S4_OTHER_INFORMATION", "Diğer bilgiler", "Other information", "6.8", false],
    ["DTR_S4_UTILISATION_PLAN", "İstihdam ve kullanım planı", "Employment and utilisation plan", "7.1"],
    ["DTR_S4_EXPECTED_RESULTS", "Ortak geliştirme faaliyetinin beklenen sonuçları", "Expected results of the joint development activity", "7.2"],
    ["DTR_S4_EXPECTED_BENEFITS", "Beklenen ticari / operasyonel / teknolojik faydalar", "Expected commercial / operational / technological benefits", "7.3"],
    ["DTR_S4_SCALABILITY_TRANSFER", "Ölçeklenebilirlik ve aktarım potansiyeli", "Scalability and transfer potential", "7.4"]
  ].forEach(function (item) {
    serviceField("S4", item[0], "s4", item[1], item[2], item[3], "textarea", item[4] === false ? { maxLength: 6000 } : { minLength: 20, maxLength: 6000 }, item[4] !== false);
  });

  const DECLARATION = tx(
    "Verilen bilgiler doğrudur. Şirket, değerlendirme sürecine aktif olarak katılmaya isteklidir. İlgili şirket temsilcileri toplantılara ve görüşmelere katılacaktır. Değerlendirme amacıyla gerekli veri ve bilgiler paylaşılacaktır. Şirket, proje prosedürlerine uymayı kabul eder. Şirket, proje faaliyetlerinin ve çıktılarının değerlendirilmesini destekleyecektir.",
    "The information provided is correct. The company is willing to participate actively in the assessment process. Relevant company representatives will attend meetings and interviews. Data and information required for the assessment will be shared. The company agrees to comply with project procedures. The company will support the evaluation of project activities and outputs."
  );
  add({
    key: "DECLARATION_ACCEPTED",
    section: "declaration",
    tr: DECLARATION.tr,
    en: DECLARATION.en,
    type: "checkbox",
    required: true,
    validation: { mustBe: true },
    sourceRefs: refs({ S1: "Bölüm 7 — Taahhüt", S2: "Bölüm 7 — Taahhüt", S3: "Bölüm 8 — Taahhüt", S4: "Bölüm 8 — Taahhüt" }),
    backend: "boolean"
  });
  [
    ["DECLARATION_SIGNER_NAME", "Beyan sahibi adı soyadı", "Declarant full name", "Adı Soyadı", "CONTACT_FULL_NAME", "string"],
    ["DECLARATION_SIGNER_TITLE", "Beyan sahibi ünvanı", "Declarant title", "Ünvanı", "CONTACT_POSITION", "string"],
    ["DECLARATION_DATE", "Beyan tarihi", "Declaration date", "Tarih", "submission.receivedAt", "date-time"]
  ].forEach(function (item) {
    add({
      key: item[0],
      section: "declaration",
      tr: item[1],
      en: item[2],
      type: "computed",
      required: true,
      validation: item[0] === "DECLARATION_DATE" ? { format: "iso-date-time" } : {},
      sourceRefs: refs({
        S1: "Bölüm 7 — " + item[3],
        S2: "Bölüm 7 — " + item[3],
        S3: "Bölüm 8 — " + item[3],
        S4: "Bölüm 8 — " + item[3]
      }),
      backend: item[5],
      derivedFrom: item[4]
    });
  });

  const SOURCE_ISSUES = Object.freeze([
    Object.freeze({ template: "S1", issue: "2.6 numarası lokasyonlar, departmanlar/faaliyetler ve ihracat durumu için tekrar kullanılmıştır." }),
    Object.freeze({ template: "S1", issue: "Önceki değerlendirme önerileri sorusu 4.7 olarak tekrar edilmiş; şemada 4.7.3 olarak ayrıştırılmıştır." }),
    Object.freeze({ template: "S2", issue: "5.1 başlığında fazladan “4” karakteri bulunmaktadır." }),
    Object.freeze({ template: "S3", issue: "4.4 numarası TRL seviyesi ve geliştirme/uygulama aşaması için tekrar kullanılmış, 4.8 bulunmamaktadır." }),
    Object.freeze({ template: "S4", issue: "3.5.6 sorusu ana şirket profilinde 3.4.6 olarak yazılmıştır." }),
    Object.freeze({ template: "S4", issue: "5.5 numarası çalışma planı ve riskler için tekrar kullanılmıştır." }),
    Object.freeze({ template: "S2/S3/S4", issue: "Rapor/sertifika yükleme soruları dosya alanı eklenmeden metinsel bilgi alanına dönüştürülmüştür." })
  ]);

  const BACKEND_CONTRACT = Object.freeze({
    schemaVersion: VERSION,
    requestShape: Object.freeze({
      schemaVersion: "string",
      formLanguage: "tr-TR | en-GB",
      selectedServices: "string[]",
      answers: "Record<fieldKey, scalar | string[]>",
      partners: "Array<Record<partnerFieldKey, scalar | string[]>>"
    }),
    responseShape: Object.freeze({
      appId: "string",
      receivedAt: "ISO-8601 string",
      selectedServices: "string[]"
    }),
    transportRules: Object.freeze({
      oneFinalSubmit: true,
      incomingFiles: false,
      omitHiddenFields: true,
      preserveFieldKeys: true
    })
  });

  global.DIGITALTR_INTAKE_SCHEMA = Object.freeze({
    schemaVersion: VERSION,
    templates: TEMPLATES,
    serviceCodes: CODES,
    services: SERVICES,
    sections: SECTIONS,
    fields: Object.freeze(FIELDS),
    partnerFields: Object.freeze(PARTNER_FIELDS),
    sourceIssues: SOURCE_ISSUES,
    backendContract: BACKEND_CONTRACT
  });
})(window);
