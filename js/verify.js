(function () {
  function showError(container, message, detail = "") {
    container.replaceChildren();
    const content = document.createElement("div");
    content.className = "verify-error";
    const symbol = document.createElement("span");
    symbol.className = "verify-error-mark";
    symbol.setAttribute("aria-hidden", "true");
    symbol.textContent = "!";
    const heading = document.createElement("strong");
    heading.textContent = message;
    content.append(symbol, heading);
    if (detail) {
      const description = document.createElement("p");
      description.textContent = detail;
      content.append(description);
    }
    container.append(content);
    container.setAttribute("aria-busy", "false");
  }

  function showStudent(container, student) {
    const validStatuses = window.NUSA_CONFIG.STATUSES;
    if (!student || !validStatuses.includes(student.status)) {
      showError(container, "Student record not found.");
      return;
    }
    container.replaceChildren();
    const card = document.createElement("div");
    card.className = "verification-card";
    const banner = document.createElement("div");
    banner.className = `verification-banner is-${student.status.toLowerCase()}`;
    const symbol = document.createElement("span");
    symbol.className = "verification-symbol";
    symbol.setAttribute("aria-hidden", "true");
    symbol.textContent = student.status === "Active" ? "✓" : "!";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = student.status === "Active" ? "VERIFIED STUDENT" : `STUDENT RECORD: ${student.status.toUpperCase()}`;
    const status = document.createElement("span");
    status.textContent = student.status === "Active" ? "Identity confirmed · Current status Active" : `Identity record found · Current status ${student.status}`;
    copy.append(title, status);
    banner.append(symbol, copy);
    const list = document.createElement("dl");
    list.className = "verification-fields";
    const values = [
      ["Full name", student.full_name],
      ["Student ID", student.student_id],
      ["Major", student.major],
      ["Current position", student.position],
      ["Current status", student.status]
    ];
    for (const [labelText, valueText] of values) {
      const group = document.createElement("div");
      const label = document.createElement("dt");
      const value = document.createElement("dd");
      label.textContent = labelText;
      value.textContent = valueText;
      group.append(label, value);
      list.append(group);
    }
    card.append(banner, list);
    container.append(card);
    container.setAttribute("aria-busy", "false");
  }

  async function initialize() {
    const container = document.getElementById("verification-result");
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      showError(container, "Verification token is missing.");
      return;
    }
    if (!window.NusaConfig.uuidPattern.test(token)) {
      showError(container, "Student record not found.");
      return;
    }
    try {
      const client = window.NusaSupabase.getClient();
      const { data, error } = await client.rpc("verify_student", { lookup_token: token });
      if (error) throw error;
      const student = Array.isArray(data) ? data[0] : data;
      if (!student) {
        showError(container, "Student record not found.");
        return;
      }
      showStudent(container, student);
    } catch {
      showError(container, "Verification service is temporarily unavailable. Please try again.");
    }
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();