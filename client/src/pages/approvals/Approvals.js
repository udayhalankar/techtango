// ✅ Full updated Approvals.js (now includes header, toggle, create request, search, pagination)
import React, { useState, useEffect, useRef } from "react";
import "./approvals.scss";
import api from "../../services/api";

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

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   const data = new FormData();
  //   Object.entries(form).forEach(([key, val]) => key === "files" ? val.forEach(file => data.append("files", file)) : data.append(key, val));
  //   try {
  //     await api.post("/approvals", data);
  //     alert("✅ Approval request submitted.");
  //     setShowModal(false);
  //     setForm({ title: "", assignee: "", details: "", dueDate: "", files: [] });
  //     fetchApprovals();
  //   } catch (err) {
  //     console.error("Error submitting request:", err);
  //     alert(err.response?.data?.error || "Unexpected error");
  //   }
  // };




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

  return (
    <div className="approvals-container">
      <header className="module-header">
        <div>
          <h1>ASSIGNMENTS</h1>
          <h6 className="section-label">ASSIGNMENTS {activeTab.toUpperCase()}</h6>
        </div>
        <div className="tab-toggle">
          <button className={activeTab === "inbox" ? "active" : ""} onClick={() => setActiveTab("inbox")}>INBOX</button>
          <button className={activeTab === "outbox" ? "active" : ""} onClick={() => setActiveTab("outbox")}>OUTBOX</button>
        </div>
      </header>

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


      <div className="card-grid">
        {paginated.map((a) => (
          <div
            className="approval-card"
            key={a.id}
            onClick={() => {
              setSelectedApproval(a);
              setShowPreview(true);
              setUpdateForm({
                status: a.status,
                assignee_comments: a.assignee_comments || "",
                files: [],
              });
              fetchAuditLogs(a.id); // 👈 fetch audit
            }}
            style={{
                backgroundColor:
                  a.status === "Rejected"
                    ? "#ffd5d5"
                    : a.status === "Closed"
                    ? "#d9ffd9"
                    : new Date() > new Date(a.due_date) &&
                      a.status !== "Completed" &&
                      a.status !== "Closed"
                    ? "#fff3cd" // light orange/yellow
                    : "white",
              }}
          >
            <div className="card-header">
              <div className="avatar">👤</div>
              <span className="username">
                {a.assigned_by_firstname} ➡ {a.assignee_firstname}
              </span>
            </div>
            <h3>{a.title}</h3>
            <div className="field-line">
              Date Assigned: {new Date(a.created_at).toLocaleDateString()}
            </div>
            <div className="field-line">
              Due Date: {new Date(a.due_date).toLocaleDateString()}
            </div>
              
              <div className="field-line status-line">
                <span>Status: {a.status}</span>
                <span className="status-badge">
                  {a.status === "Completed" && (
                    <span className="completed-badge">✅ Completed</span>
                  )}
                  {a.status === "Closed" && (
                    <span className="completed-badge">✅ Closed</span>
                  )}
                  {new Date() > new Date(a.due_date) &&
                    a.status !== "Completed" &&
                    a.status !== "Closed" && (
                      <span className="delay-badge">⚠️ Delayed</span>
                  )}
                </span>
              </div>



          </div>
        ))}
      </div>




      {/* CREATE REQUEST MODAL */}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-form" ref={modalRef}>
            <h3 className="modal-title">Create New Assignment</h3>
            <form onSubmit={handleSubmit}>
              <label>Title</label>
              <input name="title" value={form.title} onChange={handleChange} required />
              <label>Select Assignee</label>
              <select
                name="assignee"
                value={form.assignee}
                onChange={handleChange}
                required
              >
                <option value="">-- Select --</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstname} {user.lastname} (ID: {user.id})
                  </option>
                ))}
              </select>
              <label>Assignment Details</label>
              <textarea name="details" value={form.details} onChange={handleChange} required />
              <label>Complete By</label>
              <input
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={handleChange}
                required
              />
              <label>Attach Documents</label>
              <input type="file" multiple onChange={handleFileChange} />
              <div className="attachments">
                <strong>Attached Documents</strong>
                <ul>
                  {form.files.map((file, idx) => (
                    <li key={idx}>{file.name}</li>
                  ))}
                </ul>
              </div>
              <button type="submit" className="submit-btn">Submit</button>
              <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                Cancel
              </button>

              
            </form>
          </div>
        </div>
      )}


      {/* PREVIEW MODAL */}

      {showPreview && selectedApproval && (
        <div className="modal-overlay">
          <div className="modal-form" ref={previewRef}>
            <h3 className="modal-title">Assignment Details</h3>
            <div><strong>Title:</strong> {selectedApproval.title}</div>
            <div><strong>Details:</strong> {selectedApproval.details}</div>
            <div><strong>From:</strong> {selectedApproval.assigned_by_firstname}</div>
            <div><strong>To:</strong> {selectedApproval.assignee_firstname}</div>
            <div><strong>Due Date:</strong> {new Date(selectedApproval.due_date).toLocaleDateString()}</div>

            {activeTab === "inbox" ? (
              <>
                <label>Status</label>
                <select name="status" value={updateForm.status} onChange={handleUpdateChange}>
                  <option>New</option>
                  <option>In-Progress</option>
                  <option>Completed</option>
                </select>
                <label>Assignee Comments</label>
                <textarea name="assignee_comments" value={updateForm.assignee_comments} onChange={handleUpdateChange} />
                <label>Upload New Files</label>
                <input type="file" multiple onChange={handleUpdateFileChange} />
                <button onClick={handleAssigneeUpdate}>Submit Update</button>
              </>
            ) : selectedApproval.status === "Completed" ? (
              <>
                <label>Final Status <span style={{ color: "red" }}>*</span></label>
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
                <button
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
              </>
            ) : null}

            <div style={{ marginTop: "1rem" }}>
              <strong>Uploaded Files</strong>
              {selectedApproval.files?.length > 0 ? (
                <ul>
                  {selectedApproval.files.map((file) => (
                    <li key={file.id}>
                      {file.original_filename} by {file.uploaded_by_name} at{" "}
                      {new Date(file.uploaded_at).toLocaleString()}
                      <button
                        onClick={() => downloadFile(file.id, file.original_filename)}
                        style={{ marginLeft: "10px" }}
                      >
                        Download
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No attachments</p>
              )}
            </div>

              <div style={{
                  marginTop: "1rem",
                  maxHeight: "200px",
                  overflowY: "auto",
                  backgroundColor: "#f5f5f5",
                  border: "1px solid #ccc",
                  padding: "10px",
                  borderRadius: "8px",
                  fontSize: "14px"
                }}>
                  <strong style={{ display: "block", marginBottom: "8px" }}>🕵️‍♂️ Audit Trail</strong>

                  {/* {auditLogs.length > 0 ? (
                    <ul style={{ listStyle: "none", paddingLeft: 0 }}>
                      {auditLogs.map((log) => (
                        <li key={log.id} style={{ marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px dashed #ccc" }}>
                          <div><strong>🕒</strong> {new Date(log.modified_at).toLocaleString()}</div>
                          <div><strong>👤</strong> Modified By: {log.modified_by}</div>
                          <div><strong>🔄</strong> Action: {log.action}</div>
                          {log.changed_data && (
                            <div>📝 Changed: <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", margin: 0 }}>{typeof log.changed_data === 'string' ? log.changed_data : JSON.stringify(log.changed_data, null, 2)}</pre></div>
                          )}
                          {log.details && <div>📄 Details: {log.details}</div>}
                          {log.before_change && (
                            <div>
                              <strong>Before:</strong>
                              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", backgroundColor: "#fff", padding: "5px" }}>
                                {typeof log.before_change === 'string' ? log.before_change : JSON.stringify(log.before_change, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.after_change && (
                            <div>
                              <strong>After:</strong>
                              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", backgroundColor: "#fff", padding: "5px" }}>
                                {typeof log.after_change === 'string' ? log.after_change : JSON.stringify(log.after_change, null, 2)}
                              </pre>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontStyle: "italic", color: "#888" }}>No audit records</p>
                  )} */}


                  {auditLogs.length > 0 && (
                    <div style={{
                      marginTop: "1.5rem",
                      maxHeight: "200px",
                      overflowY: "auto",
                      backgroundColor: "#f9f9f9",
                      border: "1px solid #ccc",
                      padding: "10px",
                      borderRadius: "8px",
                      fontSize: "14px"
                    }}>
                      <strong style={{ display: "block", marginBottom: "10px" }}>🕵️ Audit Trail</strong>

                      <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
                        {auditLogs.map((log) => {
                          const actionText = log.action === "Insert" ? "Created" : "Modified";

                          // const status = log.changed_data?.status || log.after_change?.status;
                          // const comments = log.changed_data?.assignee_comments || log.after_change?.assignee_comments;

                          const { status, comments } = log;

                          return (
                            <li key={log.id} style={{ marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px dashed #ccc" }}>
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
                  )}

                </div>








            <button className="cancel-btn" onClick={() => setShowPreview(false)}>Close</button>
          </div>
        </div>
      )}



      {/* ✅ The rest of the component (modal, preview, card-grid) remains unchanged and was already updated */}
      {/* See previous version for card rendering, color coding, preview modal, and file logic */}
    </div>
  );
};

export default Approvals;












// // src/pages/approvals/Approvals.js
// import React, { useState, useEffect, useRef } from "react";
// import "./approvals.scss";
// import api from "../../services/api";

// const Approvals = () => {
//   const [activeTab, setActiveTab] = useState("outbox");
//   const [showModal, setShowModal] = useState(false);
//   const [showPreview, setShowPreview] = useState(false);
//   const [selectedApproval, setSelectedApproval] = useState(null);

//   const modalRef = useRef();
//   const previewRef = useRef();

//   const [form, setForm] = useState({
//     title: "",
//     assignee: "",
//     details: "",
//     dueDate: "",
//     files: [],
//   });

//   const [users, setUsers] = useState([]);
//   const [approvals, setApprovals] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10;

//   useEffect(() => {
//     fetchUsers();
//     fetchApprovals();
//   }, [activeTab]);

//   useEffect(() => {
//     const handleClickOutside = (e) => {
//       if (showModal && modalRef.current && !modalRef.current.contains(e.target)) {
//         setShowModal(false);
//       }
//       if (showPreview && previewRef.current && !previewRef.current.contains(e.target)) {
//         setShowPreview(false);
//       }
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, [showModal, showPreview]);

//   const fetchUsers = async () => {
//     try {
//       const res = await api.get("/users/org?includeSelf=true");
//       console.log("👥 Users loaded:", res.data);
//       setUsers(res.data);
//     } catch (err) {
//       console.error("Failed to load users:", err.response?.data || err.message);
//     }
//   };

//   const fetchApprovals = async () => {
//     const route = activeTab === "inbox" ? "/approvals/inbox" : "/approvals/outbox";
//     try {
//       const res = await api.get(route);
//       console.log("📦 Approvals fetched:", res.data);
//       setApprovals(res.data);
//       setCurrentPage(1);
//     } catch (err) {
//       console.error("❌ Failed to fetch approvals:", err.response?.data || err.message);
//     }
//   };

//   const handleFileChange = (e) => {
//     setForm({ ...form, files: [...e.target.files] });
//   };

//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     const data = new FormData();
//     data.append("title", form.title);
//     data.append("assignee", form.assignee);
//     data.append("details", form.details);
//     data.append("dueDate", form.dueDate);
//     form.files.forEach((file) => data.append("files", file));

//     try {
//       await api.post("/approvals", data);
//       alert("✅ Approval request submitted.");
//       setShowModal(false);
//       setForm({ title: "", assignee: "", details: "", dueDate: "", files: [] });
//       fetchApprovals();
//     } catch (err) {
//       console.error("Error submitting request:", err);
//       alert(err.response?.data?.error || "Unexpected error. Check console.");
//     }
//   };




//   const downloadFile = async (fileId, filename) => {
//   try {
//     const token = localStorage.getItem('token'); // or sessionStorage if you use that

//     const response = await fetch(`http://localhost:5000/api/approvals/download/${fileId}`, {
//       method: 'GET',
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });

//     if (!response.ok) throw new Error('Download failed');

//     const blob = await response.blob();
//     const url = window.URL.createObjectURL(blob);

//     const link = document.createElement('a');
//     link.href = url;
//     link.setAttribute('download', filename);
//     document.body.appendChild(link);
//     link.click();
//     link.remove();
//     window.URL.revokeObjectURL(url);
//   } catch (err) {
//     console.error('❌ Download error:', err);
//     alert('Download failed');
//   }
// };



//   const filteredApprovals = approvals.filter((a) =>
//     a.title?.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const paginated = filteredApprovals.slice(
//     (currentPage - 1) * itemsPerPage,
//     currentPage * itemsPerPage
//   );

//   const totalPages = Math.ceil(filteredApprovals.length / itemsPerPage);

//   return (
//     <div className="approvals-container">
//       <header className="module-header">
//         <div>
//           <h1>ASSIGNMENTS</h1>
//           <h6 className="section-label">ASSIGNMENTS {activeTab.toUpperCase()}</h6>
//         </div>
//         <div className="tab-toggle">
//           <button
//             className={activeTab === "inbox" ? "active" : ""}
//             onClick={() => setActiveTab("inbox")}
//           >
//             INBOX
//           </button>
//           <button
//             className={activeTab === "outbox" ? "active" : ""}
//             onClick={() => setActiveTab("outbox")}
//           >
//             OUTBOX
//           </button>
//         </div>
//       </header>

//       <div className="section-header">
//         <button className="button2" onClick={() => setShowModal(true)}>
//           Create New Request
//         </button>

//         <div className="search-and-pagination">
//           <input
//             type="text"
//             placeholder="Search title"
//             className="search-input"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//           <div className="pagination">
//             <button
//               onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
//               disabled={currentPage === 1}
//             >
//               Prev
//             </button>
//             <span>Page {currentPage}</span>
//             <button
//               onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
//               disabled={currentPage === totalPages}
//             >
//               Next
//             </button>
//           </div>
//         </div>
//       </div>

//       <div className="card-grid">
//         {paginated.map((a) => (
//           <div
//             className="approval-card"
//             key={a.id}
//             onClick={() => {
//               setSelectedApproval(a);
//               setShowPreview(true);
//             }}
//           >
//             <div className="card-header">
//               <div className="avatar">👤</div>
//               <span className="username">
//                 {a.assigned_by_firstname} ➡ {a.assignee_firstname}
//               </span>
//             </div>
//             <h3>{a.title}</h3>
//             <div className="field-line">
//               Date Assigned: {new Date(a.created_at).toLocaleDateString()}
//             </div>
//             <div className="field-line">
//               Due Date: {new Date(a.due_date).toLocaleDateString()}
//             </div>
//             <div className="field-line">Status: {a.status}</div>
//             <div className="card-footer"></div>
//           </div>
//         ))}
//       </div>

//       {showModal && (
//         <div className="modal-overlay">
//           <div className="modal-form" ref={modalRef}>
//             <h3 className="modal-title">Create New Assignment</h3>
//             <form onSubmit={handleSubmit}>
//               <label>Title</label>
//               <input name="title" value={form.title} onChange={handleChange} required />
//               <label>Select Assignee</label>
//               <select
//                 name="assignee"
//                 value={form.assignee}
//                 onChange={handleChange}
//                 required
//               >
//                 <option value="">-- Select --</option>
//                 {users.map((user) => (
//                   <option key={user.id} value={user.id}>
//                     {user.firstname} {user.lastname} (ID: {user.id})
//                   </option>
//                 ))}
//               </select>
//               <label>Assignment details</label>
//               <textarea name="details" value={form.details} onChange={handleChange} required />
//               <label>Complete by</label>
//               <input
//                 type="date"
//                 name="dueDate"
//                 value={form.dueDate}
//                 onChange={handleChange}
//                 required
//               />
//               <label>Attach Documents</label>
//               <input type="file" multiple onChange={handleFileChange} />
//               <div className="attachments">
//                 <strong>Attached Documents</strong>
//                 <ul>
//                   {form.files.map((file, idx) => (
//                     <li key={idx}>{file.name}</li>
//                   ))}
//                 </ul>
//               </div>
//               <button type="submit" className="submit-btn">Submit</button>
//               <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
//                 Cancel
//               </button>
//             </form>
//           </div>
//         </div>
//       )}

//       {showPreview && selectedApproval && (
//         <div className="modal-overlay">
//           <div className="modal-form" ref={previewRef}>
//             <h3 className="modal-title">Assignment Details</h3>
//             <div><strong>Title:</strong> {selectedApproval.title}</div>
//             <div><strong>Details:</strong> {selectedApproval.details}</div>
//             <div><strong>From:</strong> {selectedApproval.assigned_by_firstname}</div>
//             <div><strong>To:</strong> {selectedApproval.assignee_firstname}</div>
//             <div><strong>Status:</strong> {selectedApproval.status}</div>
//             <div><strong>Due Date:</strong> {new Date(selectedApproval.due_date).toLocaleDateString()}</div>
//             <div><strong>Created At:</strong> {new Date(selectedApproval.created_at).toLocaleDateString()}</div>

//             {selectedApproval.files && selectedApproval.files.length > 0 ? (
//                 <ul>
//                   {selectedApproval.files.map((file) => (
//                     <li key={file.id} style={{ marginBottom: '8px' }}>
//                       {file.original_filename} uploaded by {file.uploaded_by_name} at {new Date(file.uploaded_at).toLocaleString()}
//                       <button
//                         onClick={() => downloadFile(file.id, file.original_filename)}
//                         style={{ marginLeft: '10px' }}
//                       >
//                         Download
//                       </button>
//                     </li>
//                   ))}
//                 </ul>
//               ) : (
//                 <p>No attachments.</p>
//               )}

//             <div style={{ marginTop: "1rem" }}>
//               <button className="cancel-btn" onClick={() => setShowPreview(false)}>Close</button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Approvals;

