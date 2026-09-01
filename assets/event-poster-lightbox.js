(() => {
  const opener = document.querySelector("[data-poster-open]");
  const dialog = document.querySelector("[data-poster-dialog]");
  const closeButton = dialog?.querySelector("[data-poster-close]");

  if (!opener || !dialog || !closeButton || typeof dialog.showModal !== "function") {
    return;
  }

  opener.addEventListener("click", (event) => {
    event.preventDefault();
    dialog.showModal();
    document.body.classList.add("poster-dialog-open");
    closeButton.focus();
  });

  closeButton.addEventListener("click", () => dialog.close());

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  dialog.addEventListener("close", () => {
    document.body.classList.remove("poster-dialog-open");
    opener.focus();
  });
})();
