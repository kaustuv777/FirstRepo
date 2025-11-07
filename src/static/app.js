document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Add small helper to avoid inserting raw HTML (simple escape)
  function escapeHtml(str) {
    if (typeof str !== "string") return str;
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select so we don't duplicate options on subsequent fetches
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // build participants section (bulleted list or empty state)
        let participantsHTML = "";
        if (Array.isArray(details.participants) && details.participants.length > 0) {
          // include a small delete button next to each participant
          const items = details.participants
            .map((p) => {
              const email = escapeHtml(p);
              const activityNameAttr = escapeHtml(name);
              return `
                <li class="participant-item">
                  <span class="participant-email">${email}</span>
                  <button class="participant-delete" data-activity="${activityNameAttr}" data-email="${email}" title="Unregister">✖</button>
                </li>
              `;
            })
            .join("");
          participantsHTML = `
            <div class="participants">
              <h5 class="participants-header">Participants <span class="participants-count">(${details.participants.length})</span></h5>
              <ul class="participants-list">
                ${items}
              </ul>
            </div>
          `;
        } else {
          participantsHTML = `<p class="no-participants">No participants yet — be the first to sign up!</p>`;
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
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

      // Event delegation: handle unregister (delete) clicks on participant delete buttons
      activitiesList.addEventListener("click", async (e) => {
        const btn = e.target.closest(".participant-delete");
        if (!btn) return;

        const activity = btn.getAttribute("data-activity");
        const email = btn.getAttribute("data-email");

        if (!activity || !email) return;

        if (!confirm(`Unregister ${email} from ${activity}?`)) return;

        try {
          const resp = await fetch(
            `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
            { method: "POST" }
          );

          const result = await resp.json();

          if (resp.ok) {
            // Refresh activities list to show updated participants
            fetchActivities();
          } else {
            // show simple alert on error
            alert(result.detail || result.message || "Failed to unregister participant");
          }
        } catch (err) {
          console.error("Error unregistering participant:", err);
          alert("Failed to unregister participant. Please try again.");
        }
      });
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

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
        // Refresh UI so the newly signed-up participant appears immediately
        fetchActivities();
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
    }
  });

  // Initialize app
  fetchActivities();
});
