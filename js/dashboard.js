(function () {
  const fields = ["full_name", "student_id", "major", "position", "status"];
  let client;
  let records = [];

  const byId = (id) => document.getElementById(id);

  function setNotice(element, message, kind = "") {
    element.textContent = message;
    element.classList.toggle("notice-error", kind === "error");
    element.classList.toggle("notice-success", kind === "success");
    element.hidden = false;
  }

  function clearNotice(element) {
    element.textContent = "";
    element.classList.remove("notice-error", "notice-success");
    element.hidden = true;
  }

  function addCell(row, label, value, className = "") {
    const cell = document.createElement("td");
    cell.dataset.label = label;
    if (className) cell.className = className;
    cell.textContent = value;
    row.append(cell);
    return cell;
  }

  function makeAction(label, action, record, danger = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = danger ? "action-button action-danger" : "action-button";
    button.dataset.action = action;
    button.dataset.studentId = record.student_id;
    button.textContent = label;
    button.setAttribute("aria-label", `${label} ${record.full_name}`);
    return button;
  }

  function updateStatistics() {
    byId("stat-total").textContent = String(records.length);
    for (const status of window.NUSA_CONFIG.STATUSES) {
      byId(`stat-${status.toLowerCase()}`).textContent = String(records.filter((record) => record.status === status).length);
    }
  }

  function renderRecords() {
    const search = byId("student-search").value.trim().toLocaleLowerCase();
    const status = byId("status-filter").value;
    const filtered = records.filter((record) => {
      const matchesSearch = !search || [record.full_name, record.student_id, record.major, record.position]
        .some((value) => value.toLocaleLowerCase().includes(search));
      return matchesSearch && (!status || record.status === status);
    });
    const body = byId("student-list");
    body.replaceChildren();
    byId("result-count").textContent = `${filtered.length} of ${records.length}`;
    byId("empty-state").hidden = filtered.length !== 0;
    if (!filtered.length) return;

    for (const record of filtered) {
      const row = document.createElement("tr");
      const nameCell = addCell(row, "Full name", "");
      const name = document.createElement("span");
      name.className = "student-name";
      name.textContent = record.full_name;
      nameCell.append(name);
      addCell(row, "Student ID", record.student_id);
      addCell(row, "Major", record.major);
      addCell(row, "Position", record.position);
      const statusCell = addCell(row, "Status", "");
      const badge = document.createElement("span");
      badge.className = `status-badge status-${window.NUSA_CONFIG.STATUSES.includes(record.status) ? record.status.toLowerCase() : "revoked"}`;
      badge.textContent = record.status;
      statusCell.append(badge);
      const actionsCell = addCell(row, "Actions", "", "row-actions-cell");
      const actions = document.createElement("div");
      actions.className = "row-actions";
      actions.append(
        makeAction("View", "view", record),
        makeAction("Edit", "edit", record),
        makeAction("QR", "qr", record),
        makeAction("Copy link", "copy-link-row", record),
        makeAction("Print", "print-row", record),
        makeAction("Revoke", "revoke", record, true),
        makeAction("Delete", "delete", record, true)
      );
      actionsCell.append(actions);
      body.append(row);
    }
  }

  async function loadRecords() {
    const { data, error } = await client.from("students")
      .select("full_name,student_id,major,position,status,verification_token,created_at,updated_at")
      .order("full_name", { ascending: true });
    if (error) throw error;
    records = data || [];
    updateStatistics();
    renderRecords();
  }

  function openStudentForm(record = null) {
    const form = byId("student-form");
    form.reset();
    clearNotice(byId("form-message"));
    byId("student-dialog-title").textContent = record ? "Edit student" : "Add student";
    byId("form-eyebrow").textContent = record ? "EDIT RECORD" : "NEW RECORD";
    byId("save-student").textContent = record ? "Save changes" : "Save student";
    byId("original-student-id").value = record ? record.student_id : "";
    for (const field of fields) {
      const id = field === "status" ? "student-status" : field.replaceAll("_", "-");
      byId(id).value = record ? record[field] : "";
    }
    byId("student-dialog").showModal();
  }

  function openRecord(record) {
    byId("record-title").textContent = record.full_name;
    const details = byId("record-details");
    details.replaceChildren();
    const labels = { full_name: "Full name", student_id: "Student ID", major: "Major", position: "Current position", status: "Current status" };
    for (const field of fields) {
      const group = document.createElement("div");
      const term = document.createElement("dt");
      const value = document.createElement("dd");
      term.textContent = labels[field];
      value.textContent = record[field];
      group.append(term, value);
      details.append(group);
    }
    byId("record-edit").onclick = () => {
      byId("record-dialog").close();
      openStudentForm(record);
    };
    byId("record-dialog").showModal();
  }

  function getRecord(studentId) {
    return records.find((record) => record.student_id === studentId);
  }

  async function showQr(record) {
    const dialog = byId("qr-dialog");
    const error = byId("qr-error");
    error.hidden = true;
    byId("qr-student-name").textContent = record.full_name;
    byId("qr-student-id").textContent = record.student_id;
    byId("verification-url").value = "";
    const canvas = byId("qr-canvas");
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    dialog.dataset.studentId = record.student_id;
    dialog.showModal();
    try {
      const url = window.NusaConfig.verificationUrl(record.verification_token);
      await window.NusaQr.render(canvas, url);
      byId("verification-url").value = url;
    } catch (cause) {
      setNotice(error, cause.message || "QR generation failed. Please try again.", "error");
    }
  }

  async function copyLink(record, feedback = true) {
    const url = window.NusaConfig.verificationUrl(record.verification_token);
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
    } else {
      const temporary = document.createElement("textarea");
      temporary.value = url;
      temporary.setAttribute("readonly", "");
      temporary.style.position = "fixed";
      temporary.style.opacity = "0";
      document.body.append(temporary);
      temporary.select();
      const copied = document.execCommand("copy");
      temporary.remove();
      if (!copied) throw new Error("Copy is unavailable in this browser.");
    }
    if (feedback) setNotice(byId("dashboard-notice"), "Verification link copied.", "success");
  }

  async function downloadQr() {
    const record = getRecord(byId("qr-dialog").dataset.studentId);
    if (!record) throw new Error("Student record is no longer available.");
    const url = window.NusaConfig.verificationUrl(record.verification_token);
    const image = await window.NusaQr.dataUrl(url);
    const link = document.createElement("a");
    link.href = image;
    link.download = `NUSA-${record.student_id}-QR.png`;
    document.body.append(link);
    link.click();
    link.remove();
  }

  async function saveStudent(event) {
    event.preventDefault();
    const form = byId("student-form");
    if (!form.reportValidity()) return;
    const record = Object.fromEntries(fields.map((field) => {
      const id = field === "status" ? "student-status" : field.replaceAll("_", "-");
      return [field, byId(id).value.trim()];
    }));
    if (fields.some((field) => !record[field]) || !window.NUSA_CONFIG.STATUSES.includes(record.status) || !window.NUSA_CONFIG.POSITIONS.includes(record.position)) {
      setNotice(byId("form-message"), "Complete every field and choose a valid position and status.", "error");
      return;
    }

    const saveButton = byId("save-student");
    saveButton.disabled = true;
    clearNotice(byId("form-message"));
    try {
      let response;
      const originalId = byId("original-student-id").value;
      if (originalId) {
        response = await client.from("students").update(record).eq("student_id", originalId).select("student_id").single();
      } else {
        response = await client.from("students").insert(record).select("student_id").single();
      }
      if (response.error) {
        if (response.error.code === "23505") throw new Error("That Student ID is already in use.");
        throw new Error("The student record could not be saved. Check your connection and try again.");
      }
      byId("student-dialog").close();
      setNotice(byId("dashboard-notice"), originalId ? "Student record updated." : "Student added successfully.", "success");
      await loadRecords();
    } catch (cause) {
      setNotice(byId("form-message"), cause.message || "The student record could not be saved. Please try again.", "error");
    } finally {
      saveButton.disabled = false;
    }
  }

  async function updateStatus(record, status) {
    const { error } = await client.from("students").update({ status }).eq("student_id", record.student_id);
    if (error) throw new Error("The student status could not be updated. Please try again.");
    await loadRecords();
    setNotice(byId("dashboard-notice"), `Student status changed to ${status}.`, "success");
  }

  async function deleteRecord(record) {
    if (!window.confirm(`Permanently delete ${record.full_name} (${record.student_id})? Their QR link will no longer resolve.`)) return;
    const { error } = await client.from("students").delete().eq("student_id", record.student_id);
    if (error) throw new Error("The student record could not be deleted. Please try again.");
    await loadRecords();
    setNotice(byId("dashboard-notice"), "Student record deleted. Its QR link no longer resolves.", "success");
  }

  async function handleAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const { action, studentId } = button.dataset;
    try {
      if (action === "add-student") openStudentForm();
      else if (action === "settings") byId("settings-dialog").showModal();
      else if (action === "logout") {
        await client.auth.signOut();
        window.location.replace("login.html");
      } else if (action === "close-dialog") button.closest("dialog").close();
      else if (action === "download-qr") await downloadQr();
      else if (action === "print-qr") window.print();
      else if (action === "copy-link") await copyLink(getRecord(byId("qr-dialog").dataset.studentId), false);
      else if (studentId) {
        const record = getRecord(studentId);
        if (!record) throw new Error("Student record is no longer available. Refresh the page.");
        if (action === "view") openRecord(record);
        else if (action === "edit") openStudentForm(record);
        else if (action === "qr") await showQr(record);
        else if (action === "copy-link-row") await copyLink(record);
        else if (action === "print-row") { await showQr(record); window.print(); }
        else if (action === "revoke") {
          if (record.status === "Revoked") throw new Error("This student is already revoked.");
          if (window.confirm(`Revoke ${record.full_name}'s student status? Their existing QR will show Revoked.`)) await updateStatus(record, "Revoked");
        } else if (action === "delete") await deleteRecord(record);
      }
    } catch (cause) {
      setNotice(byId("dashboard-notice"), cause.message || "The request could not be completed. Please try again.", "error");
    }
  }

  async function initialize() {
    const authorization = await window.NusaAuth.requireAdmin();
    if (!authorization) return;
    client = authorization.client;
    document.addEventListener("click", handleAction);
    byId("student-search").addEventListener("input", renderRecords);
    byId("status-filter").addEventListener("change", renderRecords);
    byId("student-form").addEventListener("submit", saveStudent);
    try {
      await loadRecords();
    } catch {
      setNotice(byId("dashboard-notice"), "Student records could not be loaded. Check your connection and administrator access, then reload.", "error");
      byId("student-list").replaceChildren();
      byId("empty-state").hidden = false;
    }
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();