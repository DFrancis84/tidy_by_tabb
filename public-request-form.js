(() => {
  const form = document.getElementById("cleaningRequestForm");
  const modal = document.getElementById("requestModal");
  const status = document.getElementById("cleaningRequestStatus");
  const submitButton = document.getElementById("cleaningRequestSubmit");
  const cancelButton = document.querySelector("[data-request-cancel]");

  if (!form || !modal || !status || !submitButton) {
    return;
  }

  const setStatus = (message, type = "") => {
    status.textContent = message;
    status.className = "request-form-status";

    if (type) {
      status.classList.add(`is-${type}`);
    }

    status.hidden = !message;
  };

  const optionalNumber = (formData, fieldName) => {
    const value = String(formData.get(fieldName) || "").trim();
    return value === "" ? null : Number(value);
  };

  const optionalText = (formData, fieldName) => {
    const value = String(formData.get(fieldName) || "").trim();
    return value || null;
  };

  const buildPayload = () => {
    const formData = new FormData(form);

    return {
      firstName: String(formData.get("firstName") || "").trim(),
      lastName: String(formData.get("lastName") || "").trim(),
      email: optionalText(formData, "email"),
      phone: optionalText(formData, "phone"),
      preferredContactMethod: String(
        formData.get("preferredContactMethod") || ""
      ).trim(),
      addressLine1: optionalText(formData, "addressLine1"),
      addressLine2: optionalText(formData, "addressLine2"),
      city: optionalText(formData, "city"),
      state: optionalText(formData, "state"),
      postalCode: optionalText(formData, "postalCode"),
      serviceType: String(formData.get("serviceType") || "").trim(),
      addOns: formData.getAll("addOns").map(String),
      preferredDate: optionalText(formData, "preferredDate"),
      preferredTimeWindow: optionalText(formData, "preferredTimeWindow"),
      propertyType: optionalText(formData, "propertyType"),
      bedrooms: optionalNumber(formData, "bedrooms"),
      bathrooms: optionalNumber(formData, "bathrooms"),
      squareFootage: optionalNumber(formData, "squareFootage"),
      propertyCondition: optionalText(formData, "propertyCondition"),
      pets: optionalText(formData, "pets"),
      entryInstructions: optionalText(formData, "entryInstructions"),
      notes: optionalText(formData, "notes"),
      referredBy: optionalText(formData, "referredBy"),
      mailingListOptIn:
        formData.get("mailingListOptIn") === "true",
    };
  };

  const validateContact = (payload) => {
    if (!payload.email && !payload.phone) {
      throw new Error(
        "Please provide at least an email address or phone number."
      );
    }

    if (
      payload.preferredContactMethod === "email" &&
      !payload.email
    ) {
      throw new Error(
        "Please provide an email address or choose a different contact method."
      );
    }

    if (
      payload.preferredContactMethod === "phone" &&
      !payload.phone
    ) {
      throw new Error(
        "Please provide a phone number or choose a different contact method."
      );
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");

    if (!form.reportValidity()) {
      return;
    }

    const payload = buildPayload();

    try {
      validateContact(payload);

      form.classList.add("is-submitting");
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";

      const response = await fetch("/api/cleaning-requests", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let body;

      try {
        body = await response.json();
      } catch {
        throw new Error(
          "The request service returned an unreadable response."
        );
      }

      if (!response.ok || body?.success !== true) {
        throw new Error(
          body?.message ||
            `The request could not be submitted (${response.status}).`
        );
      }

      setStatus(
        body.message ||
          "Your cleaning request was submitted successfully.",
        "success"
      );

      form.reset();

      const stateInput = form.elements.namedItem("state");
      if (stateInput) {
        stateInput.value = "KY";
      }

      status.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });

      window.setTimeout(() => {
        if (modal.open) {
          modal.close();
        }
      }, 3000);
    } catch (error) {
      setStatus(
        error?.message ||
          "Your request could not be submitted. Please try again.",
        "error"
      );

      status.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    } finally {
      form.classList.remove("is-submitting");
      submitButton.disabled = false;
      submitButton.textContent = "Submit Request";
    }
  });

  cancelButton?.addEventListener("click", () => {
    if (!form.classList.contains("is-submitting")) {
      modal.close();
      setStatus("");
    }
  });

  modal.addEventListener("close", () => {
    if (!form.classList.contains("is-submitting")) {
      setStatus("");
    }
  });
})();
