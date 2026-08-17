(function (global) {
  "use strict";

  const trErrors = Object.freeze({
    organizationRequired: "Test kuruluşu / yasal unvan alanı 2–200 karakter olmalıdır.",
    contactRequired: "Test temsilcisi adı alanı 2–120 karakter olmalıdır.",
    emailInvalid: "Geçerli bir sentetik test e-postası girin.",
    servicesRequired: "En az bir hizmet seçin.",
    descriptionInvalid: "Sentetik ihtiyaç açıklaması 10–1000 karakter olmalıdır.",
    declarationRequired: "Yalnızca sentetik veri kullanıldığını onaylayın."
  });

  const enErrors = Object.freeze({
    organizationRequired: "The test organization / legal name must contain 2–200 characters.",
    contactRequired: "The test representative name must contain 2–120 characters.",
    emailInvalid: "Enter a valid synthetic test email address.",
    servicesRequired: "Select at least one service.",
    descriptionInvalid: "The synthetic needs description must contain 10–1000 characters.",
    declarationRequired: "Confirm that the submission contains synthetic data only."
  });

  global.DIGITALTR_POC_COPY = Object.freeze({
    tr: Object.freeze({
      title: "DigitalTR sentetik TEST formu",
      intro: "Yalnızca sentetik veriler kullanın. Gerçek kişi, şirket veya başvuru bilgisi girmeyin. Seçtiğiniz her hizmetin TEST PDF'i kayıt sırasında otomatik oluşturulur; bu ekranda dosya yüklenmez.",
      organizationLegend: "Test kuruluşu ve temsilcisi",
      organizationLabel: "Test kuruluşu / yasal unvan",
      contactLabel: "Test temsilcisi adı",
      emailLabel: "Test e-postası",
      servicesLegend: "Test hizmetleri",
      descriptionLabel: "Kısa sentetik ihtiyaç açıklaması",
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
      errors: trErrors
    }),
    en: Object.freeze({
      title: "DigitalTR synthetic TEST form",
      intro: "Use synthetic data only. Do not enter real personal, company or application information. A TEST PDF is generated automatically for each selected service when the application is saved; no file is uploaded on this screen.",
      organizationLegend: "Test organization and representative",
      organizationLabel: "Test organization / legal name",
      contactLabel: "Test representative name",
      emailLabel: "Test email",
      servicesLegend: "Test services",
      descriptionLabel: "Short synthetic needs description",
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
      errors: enErrors
    })
  });
})(window);
