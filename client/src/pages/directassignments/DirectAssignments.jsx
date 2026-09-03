import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ModuleTileGrid from "../../components/ModuleTileGrid";
import api from "../../services/api";
import "../approvals/approvals.scss";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

export default function DirectAssignments() {
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab") === "outbox" ? "outbox" : "inbox";
  const [activeTab, setActiveTab] = useState(requestedTab);
  const [approvals, setApprovals] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [updateForm, setUpdateForm] = useState({ status: "", assignee_comments: "", files: [] });
  const [form, setForm] = useState({ title: "", assignee: "", details: "", dueDate: "", files: [] });

  const modalRef = useRef();
  const previewRef = useRef();

  useEffect(() => {
    setActiveTab(requestedTab);
  }, [requestedTab]);

  const fetchApprovals = async () => {
    const route = activeTab === "inbox" ? "/approvals/inbox" : "/approvals/outbox";
    try {
      const res = await api.get(route);
      setApprovals(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch direct assignments:", err.response?.data || err.message);
      setApprovals([]);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [activeTab]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get("/users/org?includeSelf=true");
        setUsers(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to load users:", err.response?.data || err.message);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showModal && modalRef.current && !modalRef.current.contains(e.target)) setShowModal(false);
      if (showPreview && previewRef.current && !previewRef.current.contains(e.target)) setShowPreview(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showModal, showPreview]);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      if (!selectedApproval) return;
      try {
        const res = await api.get(`/audit/approvals/${selectedApproval.id}`);
        setAuditLogs(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to fetch audit logs:", err);
        setAuditLogs([]);
      }
    };

    fetchAuditLogs();
  }, [selectedApproval]);

  const handleFileChange = (e) => setForm({ ...form, files: [...e.target.files] });
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleUpdateFileChange = (e) => setUpdateForm({ ...updateForm, files: [...e.target.files] });
  const handleUpdateChange = (e) => setUpdateForm({ ...updateForm, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = [];
    if (!form.title.trim()) errors.push("Title is required.");
    if (!form.assignee) errors.push("Please select an assignee.");
    if (!form.details.trim()) errors.push("Assignment details are required.");

    const today = new Date();
    const dueDate = new Date(form.dueDate);
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    if (!form.dueDate || dueDate < today) errors.push("Due date must be today or in the future.");

    if (errors.length) {
      alert(`Please fix the following:\n${errors.join("\n")}`);
      return;
    }

    const data = new FormData();
    Object.entries(form).forEach(([key, val]) =>
      key === "files" ? val.forEach((file) => data.append("files", file)) : data.append(key, val)
    );

    try {
      await api.post("/approvals", data);
      alert("Approval request submitted.");
      setShowModal(false);
      setForm({ title: "", assignee: "", details: "", dueDate: "", files: [] });
      fetchApprovals();
    } catch (err) {
      console.error("Error submitting request:", err);
      alert(err.response?.data?.error || "Unexpected error");
    }
  };

  const handleAssigneeUpdate = async () => {
    if (!selectedApproval) return;

    const data = new FormData();
    data.append("status", updateForm.status || selectedApproval.status);
    data.append("assignee_comments", updateForm.assignee_comments);
    updateForm.files.forEach((f) => data.append("files", f));

    try {
      await api.patch(`/approvals/${selectedApproval.id}/update-by-assignee`, data);
      alert("Updated");
      setShowPreview(false);
      fetchApprovals();
    } catch (err) {
      console.error("Update error:", err);
      alert("Update failed");
    }
  };

  const downloadFile = async (fileId, filename) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/approvals/download/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      alert("Download failed");
    }
  };

  const tiles = useMemo(
    () =>
      approvals.map((approval) => ({
        id: approval.id,
        headerLabel: `${approval.assigned_by_firstname || "-"} \u2192 ${approval.assignee_firstname || "-"}`,
        label: approval.title || "Untitled assignment",
        assignedDate: formatDate(approval.created_at),
        dueDate: formatDate(approval.due_date),
        status: approval.status || "-",
        statusBadge: {
          text: approval.status || "-",
          color:
            approval.status === "Closed"
              ? "#ffffff"
              : approval.status === "Rejected"
                ? "#ffffff"
                : "#ffffff",
          backgroundColor:
            approval.status === "Closed"
              ? "#41ad49"
              : approval.status === "Rejected"
                ? "#ef4444"
                : "#f59e0b",
        },
        tileBackgroundColor: activeTab === "outbox" ? "#f3f4f6" : "#ffffff",
        Icon: PersonOutlineIcon,
        iconColor: "#6b46c1",
        onClick: () => {
          setSelectedApproval(approval);
          setUpdateForm({
            status: approval.status,
            assignee_comments: approval.assignee_comments || "",
            files: [],
          });
          setShowPreview(true);
        },
      })),
    [activeTab, approvals]
  );

//   const createAssignmentButtonStyle = {
//   height: "36px",
//   border: "0",
//   borderRadius: "7px",
//   padding: "0 16px",

//   background: "#0a6ed1",
//   color: "#ffffff",

//   fontSize: "12px",
//   fontWeight: 700,

//   letterSpacing: "0",

//   boxShadow: "0 3px 8px rgba(10,110,209,.18)",

//   cursor: "pointer",

//   fontFamily: "inherit",
// };

  return (
    <>
      {/* <ModuleTileGrid
  title="Direct Assignments"
  subtitle="Manage assignments sent directly between users, monitor status and review pending work."
  titleBarColor="#344f67"

  searchEnabled
  searchPlaceholder="Search assignments"

  controls={
    <div className="section-header">
      <button
        type="button"
        onClick={() => setShowModal(true)}
        style={createAssignmentButtonStyle}
      >
        Create Assignment
      </button>
    </div>
  }

  tiles={tiles}

  tileVariant="approval"

  tileHeight={176}

  tilesPerRow={{
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
  }}

  maxRows={2}

  containerMaxWidth="xl"

  titleBarTabs={[
    {
      key: "inbox",
      label: "INBOX",
      active: activeTab === "inbox",
      onClick: () =>
        setActiveTab("inbox"),
    },
    {
      key: "outbox",
      label: "OUTBOX",
      active: activeTab === "outbox",
      onClick: () =>
        setActiveTab("outbox"),
    },
  ]}
/> */}

<ModuleTileGrid
  title="Direct Assignments"

  subtitle="Manage assignments sent directly between users, monitor status and review pending work."

  searchPlaceholder="Search assignments"

  primaryAction={{
    label: "Create Assignment",
    onClick: () => setShowModal(true),
  }}

  tiles={tiles}

  tileVariant="approval"

  titleBarTabs={[
    {
      key: "inbox",
      label: "INBOX",
      active: activeTab === "inbox",
      onClick: () =>
        setActiveTab("inbox"),
    },
    {
      key: "outbox",
      label: "OUTBOX",
      active: activeTab === "outbox",
      onClick: () =>
        setActiveTab("outbox"),
    },
  ]}
/>


      {showModal && (
        <div className="modal-overlay">
          <div className="modal-form assignment-create-modal" ref={modalRef}>
            <div className="modal-header-band">
              <div className="modal-header-icon" aria-hidden="true">🤝</div>
              <div>
                <h3 className="modal-title">Create New Assignment</h3>
                <p className="modal-subtitle">
                  Create a direct assignment request. Complete the fields below and attach any supporting documents if needed.
                </p>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="assignment-form-grid">
                <div className="field-block">
                  <label htmlFor="assignment-title">Assignment Title</label>
                  <input
                    id="assignment-title"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    required
                    placeholder="Enter assignment title"
                  />
                </div>

                <div className="field-block assignee-field">
                  <label htmlFor="assignment-assignee">Select Assignee</label>
                  <select
                    id="assignment-assignee"
                    name="assignee"
                    value={form.assignee}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Select user --</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstname} {user.lastname} (ID: {user.id})
                      </option>
                    ))}
                  </select>
                  <small>Select the person responsible for completing this assignment.</small>
                </div>

                <div className="field-block field-block-full">
                  <label htmlFor="assignment-details">Assignment Details</label>
                  <textarea
                    id="assignment-details"
                    name="details"
                    value={form.details}
                    onChange={handleChange}
                    required
                    placeholder="Describe the task, expected outcome, and any important notes"
                  />
                </div>

                <div className="field-block">
                  <label htmlFor="assignment-due-date">Complete By</label>
                  <input
                    id="assignment-due-date"
                    type="date"
                    name="dueDate"
                    value={form.dueDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="field-block">
                  <label htmlFor="assignment-files">Attach Documents</label>
                  <input id="assignment-files" type="file" multiple onChange={handleFileChange} />
                  <small>Add reference files or evidence for the assignee.</small>
                </div>

                <div className="attachments field-block-full">
                  <strong>Attached Documents</strong>
                  {form.files.length > 0 ? (
                    <ul>
                      {form.files.map((file, idx) => (
                        <li key={idx}>{file.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No documents selected.</p>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">Submit Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPreview && selectedApproval && (
        <div className="modal-overlay">
          <div className="modal-form assignment-preview-modal" ref={previewRef}>
            <div className="modal-header-band">
              <div className="modal-header-icon" aria-hidden="true">📋</div>
              <div>
                <h3 className="modal-title">Assignment Details</h3>
                <p className="modal-subtitle">
                  Review assignment information, uploaded files, and the full audit trail in one place.
                </p>
              </div>
            </div>

            <div className="preview-body">
              <div className="preview-summary-grid">
                <div className="preview-field"><strong>Title:</strong> {selectedApproval.title}</div>
                <div className="preview-field"><strong>Due Date:</strong> {formatDate(selectedApproval.due_date)}</div>
                <div className="preview-field"><strong>From:</strong> {selectedApproval.assigned_by_firstname}</div>
                <div className="preview-field"><strong>To:</strong> {selectedApproval.assignee_firstname}</div>
                <div className="preview-field preview-field-full"><strong>Details:</strong> {selectedApproval.details}</div>
              </div>

              {activeTab === "inbox" ? (
                <div className="preview-section">
                  <div className="preview-section-title">Update Assignment</div>
                  <div className="assignment-form-grid preview-form-grid">
                    <div className="field-block">
                      <label>Status</label>
                      <select name="status" value={updateForm.status} onChange={handleUpdateChange}>
                        <option>New</option>
                        <option>In-Progress</option>
                        <option>Completed</option>
                      </select>
                    </div>
                    <div className="field-block">
                      <label>Upload New Files</label>
                      <input type="file" multiple onChange={handleUpdateFileChange} />
                    </div>
                    <div className="field-block field-block-full">
                      <label>Assignee Comments</label>
                      <textarea name="assignee_comments" value={updateForm.assignee_comments} onChange={handleUpdateChange} />
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button className="submit-btn" onClick={handleAssigneeUpdate}>Submit Update</button>
                  </div>
                </div>
              ) : selectedApproval.status === "Completed" ? (
                <div className="preview-section">
                  <div className="preview-section-title">Final Review</div>
                  <div className="assignment-form-grid preview-form-grid">
                    <div className="field-block field-block-full">
                      <label>Final Status</label>
                      <select name="status" value={updateForm.status} onChange={handleUpdateChange}>
                        <option value="">-- Select --</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button
                      className="submit-btn"
                      onClick={() => {
                        if (!updateForm.status) {
                          alert("Please select a final status before submitting.");
                          return;
                        }
                        handleAssigneeUpdate();
                      }}
                    >
                      Submit Final Status
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="preview-section">
                <div className="preview-section-title">Uploaded Files</div>
                {selectedApproval.files?.length > 0 ? (
                  <ul className="preview-file-list">
                    {selectedApproval.files.map((file) => (
                      <li key={file.id}>
                        <div className="preview-file-meta">
                          <strong>{file.original_filename}</strong>
                          <span>by {file.uploaded_by_name} at {new Date(file.uploaded_at).toLocaleString()}</span>
                        </div>
                        <button
                          className="download-btn"
                          onClick={() => downloadFile(file.id, file.original_filename)}
                        >
                          Download
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-state">No attachments</p>
                )}
              </div>

              <div className="preview-section audit-section">
                <div className="preview-section-title">Audit Trail</div>
                {auditLogs.length > 0 ? (
                  <div className="audit-log-panel">
                    <ul className="audit-log-list-plain">
                      {auditLogs.map((log) => {
                        const actionText = log.action === "Insert" ? "Created" : "Modified";
                        const { status, comments } = log;

                        return (
                          <li key={log.id}>
                            <div>🗓️ <strong>Date:</strong> {new Date(log.modified_at).toLocaleString()}</div>
                            <div>🔧 <strong>Action:</strong> {actionText}</div>
                            <div>👤 <strong>By:</strong> {log.modified_by_name}</div>
                            {status && status !== "-" ? <div>📌 <strong>Status:</strong> {status}</div> : null}
                            {comments && comments !== "-" ? <div>💬 <strong>Comments:</strong> {comments}</div> : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <p className="empty-state">No audit trail entries available.</p>
                )}
              </div>

              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setShowPreview(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
