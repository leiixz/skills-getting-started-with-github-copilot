document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML
        const participants = Array.isArray(details.participants) ? details.participants : [];
        const participantsHeading = `Participants (${participants.length})`;
        const participantsListHTML = participants.length
          ? `<ul class="participants-list">${participants
              .map((p) => `<li><span class="participant-email"><a href="mailto:${p}">${p}</a></span><button class="remove-participant" data-activity="${name}" data-email="${p}" aria-label="Remove participant">&times;</button></li>`)
              .join("")}</ul>`
          : `<ul class="participants-list"><li class="empty">No participants yet</li></ul>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <h5 class="participants-heading">${participantsHeading}</h5>
            ${participantsListHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;
    const submitButton = signupForm.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so participants list and availability update
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  // Delegate click handler for remove buttons
  activitiesList.addEventListener("click", async (event) => {
    const btn = event.target.closest(".remove-participant");
    if (!btn) return;

    const activityName = btn.getAttribute("data-activity");
    const email = btn.getAttribute("data-email");

    if (!activityName || !email) return;

    // Confirm removal
    const confirmed = confirm(`Remove ${email} from ${activityName}?`);
    if (!confirmed) return;

    // provide immediate feedback by disabling the button
    btn.disabled = true;
    const prevHtml = btn.innerHTML;
    btn.innerHTML = "...";
    try {
      const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });

      const json = await resp.json();

      if (resp.ok) {
        messageDiv.textContent = json.message;
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
        // Refresh activities to update UI
        await fetchActivities();
      } else {
        messageDiv.textContent = json.detail || "Failed to remove participant";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
        // re-enable button so user can retry
        btn.disabled = false;
        btn.innerHTML = prevHtml;
      }

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 4000);
    } catch (err) {
      console.error("Error removing participant:", err);
      messageDiv.textContent = "Failed to remove participant. Try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      btn.disabled = false;
      btn.innerHTML = prevHtml;
    }
  });

  // Initialize app
  fetchActivities();
});
