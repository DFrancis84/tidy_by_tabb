(() => {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const token =
    String(
      params.get("token") || ""
    ).trim();

  const intro =
    document.getElementById(
      "reviewIntro"
    );

  const state =
    document.getElementById(
      "reviewState"
    );

  const form =
    document.getElementById(
      "publicReviewForm"
    );

  const submit =
    document.getElementById(
      "publicReviewSubmit"
    );

  if (!token) {
    showError(
      "This review link is missing its secure token."
    );
    return;
  }

  const apiUrl =
    `/api/review/${encodeURIComponent(
      token
    )}`;

  async function request(
    options = {}
  ) {
    const response =
      await fetch(apiUrl, {
        headers: {
          Accept:
            "application/json",
          "Content-Type":
            "application/json",
        },
        cache: "no-store",
        ...options,
      });

    let body;

    try {
      body =
        await response.json();
    } catch {
      throw new Error(
        "The review service returned an unreadable response."
      );
    }

    if (
      !response.ok ||
      body?.success !== true
    ) {
      throw new Error(
        body?.message ||
          "This review request could not be loaded."
      );
    }

    return body;
  }

  function showError(message) {
    form.hidden = true;
    state.hidden = false;

    state.textContent =
      message;

    intro.textContent =
      "We could not open this review request.";
  }

  async function load() {
    try {
      const response =
        await request();

      const item =
        response.data?.request;

      intro.textContent =
        item?.serviceType
          ? `Thank you for choosing Tidy by Tabb for your ${item.serviceType}. Your feedback helps a small local business grow.`
          : "Thank you for choosing Tidy by Tabb. Your feedback helps a small local business grow.";

      form.elements
        .reviewerName
        .value =
        item?.reviewerName || "";

      state.hidden = true;
      form.hidden = false;
    } catch (error) {
      showError(
        error.message
      );
    }
  }

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (
        !form.reportValidity()
      ) {
        return;
      }

      const data =
        new FormData(form);

      const rating =
        Number(
          data.get("rating")
        );

      submit.disabled = true;
      submit.textContent =
        "Submitting…";

      try {
        await request({
          method: "POST",
          body:
            JSON.stringify({
              reviewerName:
                String(
                  data.get(
                    "reviewerName"
                  ) || ""
                ).trim(),
              rating,
              reviewText:
                String(
                  data.get(
                    "reviewText"
                  ) || ""
                ).trim(),
            }),
        });

        form.hidden = true;
        state.hidden = false;
        state.classList.add(
          "review-thank-you"
        );

        state.innerHTML = `
          <h2>Thank you! 🫧</h2>
          <p>
            Your review was submitted successfully.
            Tidy by Tabb truly appreciates your feedback.
          </p>
        `;

        intro.textContent =
          "Your feedback is in.";
      } catch (error) {
        window.alert(
          error.message
        );

        submit.disabled = false;
        submit.textContent =
          "Submit Review";
      }
    }
  );

  load();
})();