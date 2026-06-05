document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const cancelLoginBtn = document.getElementById("cancel-login");
  const loginMessage = document.getElementById("login-message");
  const userStatus = document.getElementById("user-status");
  const teacherNote = document.getElementById("teacher-note");

  let isTeacher = false;
  let currentUsername = null;

  async function fetchSession() {
    try {
      const response = await fetch("/session");
      const session = await response.json();
      isTeacher = session.logged_in;
      currentUsername = session.username;
      updateAuthUI();
    } catch (error) {
      console.error("Error fetching session:", error);
      isTeacher = false;
      currentUsername = null;
      updateAuthUI();
    }
  }

  function updateAuthUI() {
    if (isTeacher) {
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      userStatus.textContent = `Teacher: ${currentUsername}`;
      userStatus.classList.remove("hidden");
      signupForm.classList.remove("hidden");
      teacherNote.textContent = "You are logged in as a teacher. You may register or unregister students.";
    } else {
      loginBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
      userStatus.classList.add("hidden");
      signupForm.classList.add("hidden");
      teacherNote.textContent = "Teacher login is required to register or unregister students.";
    }
  }

  function showLoginModal() {
    loginModal.classList.remove("hidden");
    loginMessage.classList.add("hidden");
    loginForm.reset();
  }

  function hideLoginModal() {
    loginModal.classList.add("hidden");
    loginMessage.classList.add("hidden");
  }

  loginBtn.addEventListener("click", () => {
    showLoginModal();
  });

  cancelLoginBtn.addEventListener("click", () => {
    hideLoginModal();
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      if (response.ok) {
        loginMessage.textContent = result.message;
        loginMessage.className = "message success";
        loginMessage.classList.remove("hidden");
        await fetchSession();
        await fetchActivities();
        setTimeout(() => {
          hideLoginModal();
        }, 1000);
      } else {
        loginMessage.textContent = result.detail || "Login failed.";
        loginMessage.className = "message error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login request failed. Please try again.";
      loginMessage.className = "message error";
      loginMessage.classList.remove("hidden");
      console.error("Login error:", error);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/logout", { method: "POST" });
      isTeacher = false;
      currentUsername = null;
      updateAuthUI();
      await fetchActivities();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  });

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = "<option value=\"\">-- Select an activity --</option>";

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML = details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants.map((email) => `
                  <li>
                    <span class="participant-email">${email}</span>
                    ${isTeacher ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ""}
                  </li>`).join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      if (isTeacher) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      const result = await response.json();
      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );

      const result = await response.json();
      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  fetchSession().then(fetchActivities);
});
