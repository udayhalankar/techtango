// ✅ Full updated Approvals.js (now includes header, toggle, create request, search, pagination)
import React, { useState, useEffect, useRef } from "react";
import "./approvals.scss";
import api from "../../services/api";
import ModuleTileGrid from "../../components/ModuleTileGrid";

const Approvals = () => {
  const [activeTab, setActiveTab] = useState("outbox");
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
 
  const modalRef = useRef();
  const previewRef = useRef();

  const [form, setForm] = useState({ title: "", assignee: "", details: "", dueDate: "", files: [] });
  const [users, setUsers] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [updateForm, setUpdateForm] = useState({ status: "", assignee_comments: "", files: [] });
   const [auditLogs, setAuditLogs] = useState([]);

  const itemsPerPage = 10;

  useEffect(() => { fetchUsers(); fetchApprovals(); }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showModal && modalRef.current && !modalRef.current.contains(e.target)) setShowModal(false);
      if (showPreview && previewRef.current && !previewRef.current.contains(e.target)) setShowPreview(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showModal, showPreview]);

  const fetchUsers = async () => {
    try { const res = await api.get("/users/org?includeSelf=true"); setUsers(res.data); } 
    catch (err) { console.error("Failed to load users:", err.response?.data || err.message); }
  };

  const fetchApprovals = async () => {
    const route = activeTab === "inbox" ? "/approvals/inbox" : "/approvals/outbox";
    try {
      const res = await api.get(route);
      setApprovals(res.data);
      setCurrentPage(1);
    } catch (err) {
      console.error("❌ Failed to fetch approvals:", err.response?.data || err.message);
    }
  };

  const fetchAuditLogs = async (id) => {
  try {
    const res = await api.get(`/approvals/${id}/audit`);
    setAuditLogs(res.data);
  } catch (err) {
    console.error("❌ Error fetching audit log:", err);
  }
};




useEffect(() => {
  const fetchAuditLogs = async () => {
    if (selectedApproval) {
      try {
        const res = await api.get(`/audit/approvals/${selectedApproval.id}`);
        setAuditLogs(res.data);
      } catch (err) {
        console.error("Failed to fetch audit logs:", err);
      }
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

  // 🔒 Custom Validations
  const errors = [];

  if (!form.title.trim()) errors.push("Title is required.");
  if (!form.assignee) errors.push("Please select an assignee.");
  if (!form.details.trim()) errors.push("Assignment details are required.");

  const today = new Date();
  const dueDate = new Date(form.dueDate);
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  if (!form.dueDate || dueDate < today) errors.push("Due date must be today or in the future.");

  if (errors.length > 0) {
    alert("❌ Please fix the following:\n" + errors.join("\n"));
    return;
  }

  const data = new FormData();
  Object.entries(form).forEach(([key, val]) =>
    key === "files"
      ? val.forEach((file) => data.append("files", file))
      : data.append(key, val)
  );

  try {
    await api.post("/approvals", data);
    alert("✅ Approval request submitted.");
    setShowModal(false);
    setForm({ title: "", assignee: "", details: "", dueDate: "", files: [] });
    fetchApprovals();
  } catch (err) {
    console.error("Error submitting request:", err);
    alert(err.response?.data?.error || "Unexpected error");
  }
};





  const handleAssigneeUpdate = async () => {
    const data = new FormData();
    // data.append("status", updateForm.status);
    data.append("status", updateForm.status || selectedApproval.status);
    data.append("assignee_comments", updateForm.assignee_comments);
    updateForm.files.forEach((f) => data.append("files", f));

    try {
      await api.patch(`/approvals/${selectedApproval.id}/update-by-assignee`, data);
      alert("✅ Updated");
      setShowPreview(false);
      fetchApprovals();
    } catch (err) {
      console.error("❌ Update error:", err);
      alert("Update failed");
    }
  };

  const downloadFile = async (fileId, filename) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/approvals/download/${fileId}`, { headers: { Authorization: `Bearer ${token}` } });
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
      console.error("❌ Download error:", err);
      alert("Download failed");
    }
  };

  const filteredApprovals = approvals.filter((a) => a.title?.toLowerCase().includes(searchTerm.toLowerCase()));
  const paginated = filteredApprovals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredApprovals.length / itemsPerPage);
  const approvalTiles = paginated.map((a) => {
    const isDelayed =
      new Date() > new Date(a.due_date) &&
      a.status !== "Completed" &&
      a.status !== "Closed";

    let statusBadge = null;
    if (a.status === "Completed") {
      statusBadge = { text: "Completed", color: "#ffffff", backgroundColor: "#16a34a" };
    } else if (a.status === "Closed") {
      statusBadge = { text: "Closed", color: "#ffffff", backgroundColor: "#16a34a" };
    } else if (isDelayed) {
      statusBadge = { text: "Delayed", color: "#ffffff", backgroundColor: "#f59e0b" };
    }

    return {
      id: a.id,
      headerLabel: `${a.assigned_by_firstname} → ${a.assignee_firstname}`,
      label: a.title,
      assignedDate: new Date(a.created_at).toLocaleDateString(),
      dueDate: new Date(a.due_date).toLocaleDateString(),
      status: a.status,
      statusBadge,
      onClick: () => {
        setSelectedApproval(a);
        setShowPreview(true);
        setUpdateForm({
          status: a.status,
          assignee_comments: a.assignee_comments || "",
          files: [],
        });
        fetchAuditLogs(a.id);
      },
    };
  });

  return (
    <div className="approvals-container">
      <ModuleTileGrid
        title="Direct Assignments"
        subtitle={`Direct assignments ${activeTab}. Create requests, track status, and review assignment details.`}
        titleBarColor="#173b6f"
        containerMaxWidth="xl"
        titleBarTabs={[
          { key: "inbox", label: "INBOX", active: activeTab === "inbox", onClick: () => setActiveTab("inbox") },
          { key: "outbox", label: "OUTBOX", active: activeTab === "outbox", onClick: () => setActiveTab("outbox") },
        ]}
        controls={
          <div className="section-header">
            <button className="button2" onClick={() => setShowModal(true)}>Create New Request</button>
            <div className="search-and-pagination">
              <input type="text" placeholder="Search title" className="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <div className="pagination">
                <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>Prev</button>
                <span>Page {currentPage}</span>
                <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next</button>
              </div>
            </div>
          </div>
        }
        tiles={approvalTiles}
        tilesPerRow={{ xs: 1, sm: 2, md: 4, lg: 5 }}
        maxRows={2}
        tileVariant="approval"
        tileHeight={242}
        showDefaultFooter={false}
      />




      {/* CREATE REQUEST MODAL */}

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


      {/* PREVIEW MODAL */}

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
                <div className="preview-field"><strong>Due Date:</strong> {new Date(selectedApproval.due_date).toLocaleDateString()}</div>
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
                      <label>Final Status <span className="required-indicator">*</span></label>
                      <select
                        name="status"
                        value={updateForm.status}
                        onChange={handleUpdateChange}
                        required
                      >
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
                          alert("⚠️ Please select a final status before submitting.");
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
                              {status && status !== '-' && <div>📌 <strong>Status:</strong> {status}</div>}
                              {comments && comments !== '-' && <div>💬 <strong>Comments:</strong> {comments}</div>}
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



      {/* ✅ The rest of the component (modal, preview, card-grid) remains unchanged and was already updated */}
      {/* See previous version for card rendering, color coding, preview modal, and file logic */}
    </div>
  );
};

export default Approvals;






