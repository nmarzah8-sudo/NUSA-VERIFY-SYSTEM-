(function () {
  "use strict";

  const fields = [
    "full_name",
    "student_id",
    "major",
    "position",
    "status"
  ];

  let client = null;
  let records = [];
  let initialized = false;

  const byId = (id) => document.getElementById(id);

  function setNotice(element, message, kind = "") {
    if (!element) return;

    element.textContent = message;

    element.classList.toggle(
      "notice-error",
      kind === "error"
    );

    element.classList.toggle(
      "notice-success",
      kind === "success"
    );

    element.hidden = false;
  }

  function clearNotice(element) {
    if (!element) return;

    element.textContent = "";

    element.classList.remove(
      "notice-error",
      "notice-success"
    );

    element.hidden = true;
  }

  function getConfig() {
    return window.NUSA_CONFIG || {};
  }

  function getStatuses() {
    const config = getConfig();

    return Array.isArray(config.STATUSES)
      ? config.STATUSES
      : [
          "Active",
          "Inactive",
          "Graduated",
          "Revoked"
        ];
  }

  function getPositions() {
    const config = getConfig();

    return Array.isArray(config.POSITIONS)
      ? config.POSITIONS
      : [
          "President",
          "Vice President",
          "Secretary General",
          "Treasurer",
          "Member"
        ];
  }

  function addCell(
    row,
    label,
    value,
    className = ""
  ) {
    const cell =
      document.createElement("td");

    cell.dataset.label = label;

    if (className) {
      cell.className = className;
    }

    cell.textContent =
      value === null ||
      value === undefined
        ? ""
        : String(value);

    row.append(cell);

    return cell;
  }

  function makeAction(
    label,
    action,
    record,
    danger = false
  ) {
    const button =
      document.createElement("button");

    button.type = "button";

    button.className = danger
      ? "action-button action-danger"
      : "action-button";

    button.dataset.action = action;
    button.dataset.studentId =
      record.student_id;

    button.textContent = label;

    button.setAttribute(
      "aria-label",
      `${label} ${record.full_name}`
    );

    return button;
  }

  function updateStatistics() {
    const total =
      byId("stat-total");

    if (total) {
      total.textContent =
        String(records.length);
    }

    for (const status of getStatuses()) {
      const element =
        byId(
          `stat-${String(status).toLowerCase()}`
        );

      if (!element) continue;

      element.textContent =
        String(
          records.filter(
            (record) =>
              record.status === status
          ).length
        );
    }
  }

  function renderRecords() {
    const body =
      byId("student-list");

    if (!body) {
      console.warn(
        "NUSA DASHBOARD: student-list element is missing."
      );
      return;
    }

    const searchInput =
      byId("student-search");

    const statusFilter =
      byId("status-filter");

    const resultCount =
      byId("result-count");

    const emptyState =
      byId("empty-state");

    const search =
      searchInput
        ? searchInput.value
            .trim()
            .toLocaleLowerCase()
        : "";

    const selectedStatus =
      statusFilter
        ? statusFilter.value
        : "";

    const filtered =
      records.filter((record) => {
        const searchableValues = [
          record.full_name,
          record.student_id,
          record.major,
          record.position
        ].map((value) =>
          String(value || "")
            .toLocaleLowerCase()
        );

        const matchesSearch =
          !search ||
          searchableValues.some(
            (value) =>
              value.includes(search)
          );

        const matchesStatus =
          !selectedStatus ||
          record.status === selectedStatus;

        return (
          matchesSearch &&
          matchesStatus
        );
      });

    body.replaceChildren();

    if (resultCount) {
      resultCount.textContent =
        `${filtered.length} of ${records.length}`;
    }

    if (emptyState) {
      emptyState.hidden =
        filtered.length !== 0;
    }

    if (!filtered.length) {
      return;
    }

    const statuses =
      getStatuses();

    for (const record of filtered) {
      const row =
        document.createElement("tr");

      const nameCell =
        addCell(
          row,
          "Full name",
          ""
        );

      const name =
        document.createElement("span");

      name.className =
        "student-name";

      name.textContent =
        record.full_name || "";

      nameCell.append(name);

      addCell(
        row,
        "Student ID",
        record.student_id
      );

      addCell(
        row,
        "Major",
        record.major
      );

      addCell(
        row,
        "Position",
        record.position
      );

      const statusCell =
        addCell(
          row,
          "Status",
          ""
        );

      const badge =
        document.createElement("span");

      const safeStatus =
        statuses.includes(record.status)
          ? String(record.status)
              .toLowerCase()
          : "revoked";

      badge.className =
        `status-badge status-${safeStatus}`;

      badge.textContent =
        record.status || "";

      statusCell.append(badge);

      const actionsCell =
        addCell(
          row,
          "Actions",
          "",
          "row-actions-cell"
        );

      const actions =
        document.createElement("div");

      actions.className =
        "row-actions";

      actions.append(
        makeAction(
          "View",
          "view",
          record
        ),
        makeAction(
          "Edit",
          "edit",
          record
        ),
        makeAction(
          "QR",
          "qr",
          record
        ),
        makeAction(
          "Copy link",
          "copy-link-row",
          record
        ),
        makeAction(
          "Print",
          "print-row",
          record
        ),
        makeAction(
          "Revoke",
          "revoke",
          record,
          true
        ),
        makeAction(
          "Delete",
          "delete",
          record,
          true
        )
      );

      actionsCell.append(actions);
      body.append(row);
    }
  }

  async function loadRecords() {
    if (!client) {
      throw new Error(
        "Supabase client is unavailable."
      );
    }

    console.log(
      "NUSA DASHBOARD: Loading student records..."
    );

    const result =
      await client
        .from("students")
        .select(
          "full_name,student_id,major,position,status,verification_token,created_at,updated_at"
        )
        .order(
          "full_name",
          {
            ascending: true
          }
        );

    if (result.error) {
      console.error(
        "NUSA DASHBOARD: Student query failed:",
        result.error
      );

      throw new Error(
        `Student records could not be loaded: ${result.error.message}`
      );
    }

    records =
      Array.isArray(result.data)
        ? result.data
        : [];

    console.log(
      "NUSA DASHBOARD: Student records loaded:",
      records.length
    );

    updateStatistics();
    renderRecords();
  }

  function openStudentForm(
    record = null
  ) {
    const form =
      byId("student-form");

    if (!form) {
      throw new Error(
        "Student form is missing from the page."
      );
    }

    form.reset();

    clearNotice(
      byId("form-message")
    );

    const title =
      byId("student-dialog-title");

    if (title) {
      title.textContent =
        record
          ? "Edit student"
          : "Add student";
    }

    const eyebrow =
      byId("form-eyebrow");

    if (eyebrow) {
      eyebrow.textContent =
        record
          ? "EDIT RECORD"
          : "NEW RECORD";
    }

    const saveButton =
      byId("save-student");

    if (saveButton) {
      saveButton.textContent =
        record
          ? "Save changes"
          : "Save student";
    }

    const originalId =
      byId("original-student-id");

    if (originalId) {
      originalId.value =
        record
          ? record.student_id
          : "";
    }

    for (const field of fields) {
      const inputId =
        field === "status"
          ? "student-status"
          : field.replaceAll(
              "_",
              "-"
            );

      const input =
        byId(inputId);

      if (!input) continue;

      input.value =
        record
          ? record[field] || ""
          : "";
    }

    const dialog =
      byId("student-dialog");

    if (!dialog) {
      throw new Error(
        "Student dialog is missing from the page."
      );
    }

    if (
      typeof dialog.showModal ===
      "function"
    ) {
      dialog.showModal();
    } else {
      dialog.setAttribute(
        "open",
        ""
      );
    }
  }

  function openRecord(record) {
    if (!record) {
      throw new Error(
        "Student record is unavailable."
      );
    }

    const title =
      byId("record-title");

    if (title) {
      title.textContent =
        record.full_name || "";
    }

    const details =
      byId("record-details");

    if (!details) {
      throw new Error(
        "Record details container is missing."
      );
    }

    details.replaceChildren();

    const labels = {
      full_name: "Full name",
      student_id: "Student ID",
      major: "Major",
      position: "Current position",
      status: "Current status"
    };

    for (const field of fields) {
      const group =
        document.createElement("div");

      const term =
        document.createElement("dt");

      const value =
        document.createElement("dd");

      term.textContent =
        labels[field];

      value.textContent =
        record[field] || "";

      group.append(
        term,
        value
      );

      details.append(group);
    }

    const editButton =
      byId("record-edit");

    if (editButton) {
      editButton.onclick = () => {
        const dialog =
          byId("record-dialog");

        if (dialog) {
          dialog.close();
        }

        openStudentForm(record);
      };
    }

    const dialog =
      byId("record-dialog");

    if (!dialog) {
      throw new Error(
        "Record dialog is missing from the page."
      );
    }

    if (
      typeof dialog.showModal ===
      "function"
    ) {
      dialog.showModal();
    } else {
      dialog.setAttribute(
        "open",
        ""
      );
    }
  }

  function getRecord(studentId) {
    if (!studentId) {
      return null;
    }

    return records.find(
      (record) =>
        record.student_id ===
        studentId
    ) || null;
  }

  async function showQr(record) {
    if (!record) {
      throw new Error(
        "Student record is unavailable."
      );
    }

    const dialog =
      byId("qr-dialog");

    const error =
      byId("qr-error");

    const canvas =
      byId("qr-canvas");

    if (!dialog || !canvas) {
      throw new Error(
        "QR dialog is not available."
      );
    }

    if (error) {
      clearNotice(error);
    }

    const nameElement =
      byId("qr-student-name");

    if (nameElement) {
      nameElement.textContent =
        record.full_name || "";
    }

    const idElement =
      byId("qr-student-id");

    if (idElement) {
      idElement.textContent =
        record.student_id || "";
    }

    const urlInput =
      byId("verification-url");

    if (urlInput) {
      urlInput.value = "";
    }

    const context =
      canvas.getContext("2d");

    if (context) {
      context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );
    }

    dialog.dataset.studentId =
      record.student_id;

    if (
      typeof dialog.showModal ===
      "function"
    ) {
      dialog.showModal();
    } else {
      dialog.setAttribute(
        "open",
        ""
      );
    }

    try {
      if (
        !window.NusaConfig ||
        typeof window.NusaConfig
          .verificationUrl !==
          "function"
      ) {
        throw new Error(
          "Verification URL configuration is unavailable."
        );
      }

      if (
        !window.NusaQr ||
        typeof window.NusaQr.render !==
          "function"
      ) {
        throw new Error(
          "QR generator is unavailable."
        );
      }

      const url =
        window.NusaConfig
          .verificationUrl(
            record.verification_token
          );

      await window.NusaQr.render(
        canvas,
        url
      );

      if (urlInput) {
        urlInput.value = url;
      }

    } catch (cause) {
      console.error(
        "NUSA DASHBOARD: QR error:",
        cause
      );

      if (error) {
        setNotice(
          error,
          cause.message ||
            "QR generation failed. Please try again.",
          "error"
        );
      }
    }
  }

  async function copyLink(
    record,
    feedback = true
  ) {
    if (!record) {
      throw new Error(
        "Student record is no longer available."
      );
    }

    if (
      !window.NusaConfig ||
      typeof window.NusaConfig
        .verificationUrl !==
        "function"
    ) {
      throw new Error(
        "Verification URL configuration is unavailable."
      );
    }

    const url =
      window.NusaConfig
        .verificationUrl(
          record.verification_token
        );

    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(
        url
      );
    } else {
      const temporary =
        document.createElement(
          "textarea"
        );

      temporary.value = url;

      temporary.setAttribute(
        "readonly",
        ""
      );

      temporary.style.position =
        "fixed";

      temporary.style.left =
        "-9999px";

      document.body.append(
        temporary
      );

      temporary.select();

      const copied =
        document.execCommand(
          "copy"
        );

      temporary.remove();

      if (!copied) {
        throw new Error(
          "Copy is unavailable in this browser."
        );
      }
    }

    if (feedback) {
      setNotice(
        byId("dashboard-notice"),
        "Verification link copied.",
        "success"
      );
    }

    return url;
  }

  async function downloadQr() {
    const dialog =
      byId("qr-dialog");

    if (!dialog) {
      throw new Error(
        "QR dialog is unavailable."
      );
    }

    const record =
      getRecord(
        dialog.dataset.studentId
      );

    if (!record) {
      throw new Error(
        "Student record is no longer available."
      );
    }

    if (
      !window.NusaConfig ||
      typeof window.NusaConfig
        .verificationUrl !==
        "function"
    ) {
      throw new Error(
        "Verification URL configuration is unavailable."
      );
    }

    if (
      !window.NusaQr ||
      typeof window.NusaQr.dataUrl !==
        "function"
    ) {
      throw new Error(
        "QR generator is unavailable."
      );
    }

    const url =
      window.NusaConfig
        .verificationUrl(
          record.verification_token
        );

    const image =
      await window.NusaQr.dataUrl(
        url
      );

    const link =
      document.createElement("a");

    link.href = image;

    link.download =
      `NUSA-${record.student_id}-QR.png`;

    document.body.append(link);

    link.click();

    link.remove();
  }

  async function saveStudent(event) {
    event.preventDefault();

    if (!client) {
      setNotice(
        byId("form-message"),
        "Supabase client is unavailable.",
        "error"
      );
      return;
    }

    const form =
      byId("student-form");

    if (
      !form ||
      !form.reportValidity()
    ) {
      return;
    }

    const record =
      Object.fromEntries(
        fields.map((field) => {
          const inputId =
            field === "status"
              ? "student-status"
              : field.replaceAll(
                  "_",
                  "-"
                );

          const input =
            byId(inputId);

          return [
            field,
            input
              ? input.value.trim()
              : ""
          ];
        })
      );

    const statuses =
      getStatuses();

    const positions =
      getPositions();

    if (
      fields.some(
        (field) =>
          !record[field]
      )
    ) {
      setNotice(
        byId("form-message"),
        "Complete every field before saving.",
        "error"
      );

      return;
    }

    if (
      !statuses.includes(
        record.status
      )
    ) {
      setNotice(
        byId("form-message"),
        "Please select a valid student status.",
        "error"
      );

      return;
    }

    if (
      !positions.includes(
        record.position
      )
    ) {
      setNotice(
        byId("form-message"),
        "Please select a valid student position.",
        "error"
      );

      return;
    }

    const saveButton =
      byId("save-student");

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent =
        "Saving...";
    }

    clearNotice(
      byId("form-message")
    );

    try {
      const originalInput =
        byId(
          "original-student-id"
        );

      const originalId =
        originalInput
          ? originalInput.value.trim()
          : "";

      let response;

      if (originalId) {
        response =
          await client
            .from("students")
            .update(record)
            .eq(
              "student_id",
              originalId
            )
            .select("student_id")
            .single();
      } else {
        response =
          await client
            .from("students")
            .insert(record)
            .select("student_id")
            .single();
      }

      if (response.error) {
        if (
          response.error.code ===
          "23505"
        ) {
          throw new Error(
            "That Student ID is already in use."
          );
        }

        throw new Error(
          response.error.message ||
            "The student record could not be saved."
        );
      }

      const dialog =
        byId("student-dialog");

      if (dialog) {
        dialog.close();
      }

      setNotice(
        byId("dashboard-notice"),
        originalId
          ? "Student record updated successfully."
          : "Student added successfully.",
        "success"
      );

      await loadRecords();

    } catch (cause) {
      console.error(
        "NUSA DASHBOARD: Save error:",
        cause
      );

      setNotice(
        byId("form-message"),
        cause.message ||
          "The student record could not be saved. Please try again.",
        "error"
      );

    } finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent =
          "Save student";
      }
    }
  }

  async function updateStatus(
    record,
    status
  ) {
    if (!client) {
      throw new Error(
        "Supabase client is unavailable."
      );
    }

    if (!record) {
      throw new Error(
        "Student record is unavailable."
      );
    }

    if (!getStatuses().includes(status)) {
      throw new Error(
        "Invalid student status."
      );
    }

    const { error } =
      await client
        .from("students")
        .update({ status })
        .eq(
          "student_id",
          record.student_id
        );

    if (error) {
      throw new Error(
        error.message ||
          "The student status could not be updated."
      );
    }

    await loadRecords(r =
      byId("qr-error");

    const canvas =
      byId("qr-canvas");

    if (!dialog || !canvas) {
      throw new Error(
        "QR dialog is not available."
      );
    }

    if (error) {
      error.hidden = true;
    }

    byId(
      "qr-student-name"
    ).textContent =
      record.full_name;

    byId(
      "qr-student-id"
    ).textContent =
      record.student_id;

    byId(
      "verification-url"
    ).value = "";

    const context =
      canvas.getContext("2d");

    if (context) {
      context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );
    }

    dialog.dataset.studentId =
      record.student_id;

    dialog.showModal();

    try {
      if (
        !window.NusaConfig ||
        typeof window.NusaConfig
          .verificationUrl !==
          "function"
      ) {
        throw new Error(
          "Verification URL configuration is unavailable."
        );
      }

      if (
        !window.NusaQr ||
        typeof window.NusaQr.render !==
          "function"
      ) {
        throw new Error(
          "QR generator is unavailable."
        );
      }

      const url =
        window.NusaConfig
          .verificationUrl(
            record.verification_token
          );

      await window.NusaQr.render(
        canvas,
        url
      );

      byId(
        "verification-url"
      ).value = url;

    } catch (cause) {
      if (error) {
        setNotice(
          error,
          cause.message ||
            "QR generation failed. Please try again.",
          "error"
        );
      }
    }
  }

  async function copyLink(
    record,
    feedback = true
  ) {
    if (!record) {
      throw new Error(
        "Student record is no longer available."
      );
    }

    if (
      !window.NusaConfig ||
      typeof window.NusaConfig
        .verificationUrl !==
        "function"
    ) {
      throw new Error(
        "Verification URL configuration is unavailable."
      );
    }

    const url =
      window.NusaConfig
        .verificationUrl(
          record.verification_token
        );

    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(
        url
      );
    } else {
      const temporary =
        document.createElement(
          "textarea"
        );

      temporary.value = url;
      temporary.setAttribute(
        "readonly",
        ""
      );

      temporary.style.position =
        "fixed";

      temporary.style.opacity =
        "0";

      document.body.append(
        temporary
      );

      temporary.select();

      const copied =
        document.execCommand(
          "copy"
        );

      temporary.remove();

      if (!copied) {
        throw new Error(
          "Copy is unavailable in this browser."
        );
      }
    }

    if (feedback) {
      setNotice(
        byId("dashboard-notice"),
        "Verification link copied.",
        "success"
      );
    }
  }

  async function downloadQr() {
    const dialog =
      byId("qr-dialog");

    if (!dialog) {
      throw new Error(
        "QR dialog is unavailable."
      );
    }

    const record =
      getRecord(
        dialog.dataset.studentId
      );

    if (!record) {
      throw new Error(
        "Student record is no longer available."
      );
    }

    if (
      !window.NusaConfig ||
      typeof window.NusaConfig
        .verificationUrl !==
        "function"
    ) {
      throw new Error(
        "Verification URL configuration is unavailable."
      );
    }

    if (
      !window.NusaQr ||
      typeof window.NusaQr.dataUrl !==
        "function"
    ) {
      throw new Error(
        "QR generator is unavailable."
      );
    }

    const url =
      window.NusaConfig
        .verificationUrl(
          record.verification_token
        );

    const image =
      await window.NusaQr.dataUrl(
        url
      );

    const link =
      document.createElement("a");

    link.href = image;

    link.download =
      `NUSA-${record.student_id}-QR.png`;

    document.body.append(link);

    link.click();

    link.remove();
  }

  async function saveStudent(event) {
    event.preventDefault();

    const form =
      byId("student-form");

    if (!form || !form.reportValidity()) {
      return;
    }

    const record =
      Object.fromEntries(
        fields.map((field) => {
          const id =
            field === "status"
              ? "student-status"
              : field.replaceAll(
                  "_",
                  "-"
                );

          const input =
            byId(id);

          return [
            field,
            input
              ? input.value.trim()
              : ""
          ];
        })
      );

    const statuses =
      window.NUSA_CONFIG &&
      Array.isArray(
        window.NUSA_CONFIG.STATUSES
      )
        ? window.NUSA_CONFIG.STATUSES
        : [];

    const positions =
      window.NUSA_CONFIG &&
      Array.isArray(
        window.NUSA_CONFIG.POSITIONS
      )
        ? window.NUSA_CONFIG.POSITIONS
        : [];

    if (
      fields.some(
        (field) =>
          !record[field]
      ) ||
      !statuses.includes(
        record.status
      ) ||
      !positions.includes(
        record.position
      )
    ) {
      setNotice(
        byId("form-message"),
        "Complete every field and choose a valid position and status.",
        "error"
      );

      return;
    }

    const saveButton =
      byId("save-student");

    if (saveButton) {
      saveButton.disabled = true;
    }

    clearNotice(
      byId("form-message")
    );

    try {
      const originalId =
        byId(
          "original-student-id"
        ).value;

      let response;

      if (originalId) {
        response =
          await client
            .from("students")
            .update(record)
            .eq(
              "student_id",
              originalId
            )
            .select("student_id")
            .single();
      } else {
        response =
          await client
            .from("students")
            .insert(record)
            .select("student_id")
            .single();
      }

      if (response.error) {
        if (
          response.error.code ===
          "23505"
        ) {
          throw new Error(
            "That Student ID is already in use."
          );
        }

        throw new Error(
          response.error.message ||
            "The student record could not be saved."
        );
      }

      const dialog =
        byId("student-dialog");

      if (dialog) {
        dialog.close();
      }

      setNotice(
        byId("dashboard-notice"),
        originalId
          ? "Student record updated."
          : "Student added successfully.",
        "success"
      );

      await loadRecords();

    } catch (cause) {
      console.error(
        "NUSA DASHBOARD: Save error:",
        cause
      );

      setNotice(
        byId("form-message"),
        cause.message ||
          "The student record could not be saved. Please try again.",
        "error"
      );

    } finally {
      if (saveButton) {
        saveButton.disabled = false;
      }
    }
  }

  async function updateStatus(
    record,
    status
  ) {
    if (!client) {
      throw new Error(
        "Supabase client is unavailable."
      );
    }

    const { error } =
      await client
        .from("students")
        .update({ status })
        .eq(
          "student_id",
          record.student_id
        );

    if (error) {
      throw new Error(
        error.message ||
          "The student status could not be updated."
      );
    }

    await loadRecords();

    setNotice(
      byId("dashboard-notice"),
      `Student status changed to ${status}.`,
      "success"
    );
  }

  async function deleteRecord(record) {
    const confirmed =
      window.confirm(
        `Permanently delete ${record.full_name} (${record.student_id})? Their QR link will no longer resolve.`
      );

    if (!confirmed) {
      return;
    }

    const { error } =
      await client
        .from("students")
        .delete()
        .eq(
          "student_id",
          record.student_id
        );

    if (error) {
      throw new Error(
        error.message ||
          "The student record could not be deleted."
      );
    }

    await loadRecords();

    setNotice(
      byId("dashboard-notice"),
      "Student record deleted. Its QR link no longer resolves.",
      "success"
    );
  }

  async function handleAction(event) {
    const button =
      event.target.closest(
        "[data-action]"
      );

    if (!button) {
      return;
    }

    const {
      action,
      studentId
    } = button.dataset;

    try {
      if (
        action ===
        "add-student"
      ) {
        openStudentForm();
        return;
      }

      if (
        action ===
        "settings"
      ) {
        byId(
          "settings-dialog"
        ).showModal();

        return;
      }

      if (
        action ===
        "logout"
      ) {
        await client.auth.signOut();

        window.location.replace(
          "login.html"
        );

        return;
      }

      if (
        action ===
        "close-dialog"
      ) {
        const dialog =
          button.closest(
            "dialog"
          );

        if (dialog) {
          dialog.close();
        }

        return;
      }

      if (
        action ===
        "download-qr"
      ) {
        await downloadQr();
        return;
      }

      if (
        action ===
        "print-qr"
      ) {
        window.print();
        return;
      }

      if (
        action ===
        "copy-link"
      ) {
        const dialog =
          byId("qr-dialog");

        const record =
          getRecord(
            dialog.dataset.studentId
          );

        await copyLink(
          record,
          false
lient.from("students").delete().eq("student_id", record.student_id);
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
