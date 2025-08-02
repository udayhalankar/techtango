import React, { useState, useRef, useEffect } from "react";
import "./formviews.scss";
import { Maximize2 } from "lucide-react";
import api from "../../services/api"; // adjust path as needed
import 'bootstrap/dist/css/bootstrap.min.css';


const GRID_SIZE = 10;

const formatToLocal = (utcString) => {
  const localDate = new Date(utcString);
  return localDate.toLocaleString(); // Adjust format if needed
};


const DraggableResizableField = ({ field, canvasRef, updateField }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const offset = useRef({ x: 0, y: 0 });

  const onMouseDown = (e) => {
    if (e.target.classList.contains("resize-handle")) return;
    e.stopPropagation();
    setIsDragging(true);
    const rect = canvasRef.current.getBoundingClientRect();
    offset.current = {
      x: e.clientX - rect.left - field.x,
      y: e.clientY - rect.top - field.y,
    };
    document.body.style.cursor = "move";
  };

  const onResizeStart = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    document.body.style.cursor = "nwse-resize";
  };

  const onMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (isDragging) {
      const x = Math.round((e.clientX - rect.left - offset.current.x) / GRID_SIZE) * GRID_SIZE;
      const y = Math.round((e.clientY - rect.top - offset.current.y) / GRID_SIZE) * GRID_SIZE;
      updateField(field.id, { x, y });
    }
    if (isResizing) {
      const width = Math.max(60, e.clientX - rect.left - field.x);
      const height = Math.max(40, e.clientY - rect.top - field.y);
      updateField(field.id, { width, height });
    }
  };

  const onMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    document.body.style.cursor = "default";
  };


  
  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, isResizing]);

  return (
    <div
  className="dropped-field"
  onMouseDown={onMouseDown}
  style={{
    left: field.x,
    top: field.y,
    width: field.width || 160,
    height: field.height || 40,
    position: "absolute",
    zIndex: 10,
  }}
>
  {/* LABEL COMPONENT */}
  {field.inputtype === "label" && (
  <input
    type="text"
    className="label-component"
    value={field.label}
    onChange={(e) => updateField(field.id, { label: e.target.value })}
  />
)}

  {/* REGULAR FIELDS */}
  {field.inputtype !== "label" && (
    <>
      {field.label && <label className="field-label">{field.label}</label>}

      {field.inputtype === "text" && <input type="text" placeholder={field.label || ""} />}
      {field.inputtype === "textarea" && <textarea placeholder={field.label || ""} />}
      {field.inputtype === "checkbox" && <input type="checkbox" />}
      {field.inputtype === "radio" && field.options?.map((opt, i) => (
        <label key={i}>
          <input type="radio" name={`radio-${field.id}`} /> {opt}
        </label>
      ))}
      {field.inputtype === "dropdownlist" && (
        <select>
          {field.options?.map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      )}
    </>
  )}

  {/* Resize Handle */}
  <div className="resize-handle" onMouseDown={onResizeStart} />
</div>

    

  );
};






const FormViewsTab = () => {
  const [activeViewTab, setActiveViewTab] = useState("drag");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [formFields, setFormFields] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateFields, setTemplateFields] = useState([]);
  const [formViewName, setFormViewName] = useState("");
  const [formSize, setFormSize] = useState("medium");
  const canvasRef = useRef();
  const [savedViews, setSavedViews] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [modalFields, setModalFields] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [modalTitle, setModalTitle] = useState("");
  const [selectedView, setSelectedView] = useState(null);  // 🆕 holds active view during data entry



//    const filteredViews = savedViews.filter(view =>
//   view.view_name.toLowerCase().includes(searchTerm.toLowerCase())
// );




const filteredViews = (() => {
  const searchFiltered = savedViews.filter(
    (view) =>
      view &&
      view.view_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const result = [];
  const templateGroups = {};

  // Step 1: Group views by template_id
  for (const view of searchFiltered) {
    const templateId = view.template_id;

    if (!templateGroups[templateId]) {
      templateGroups[templateId] = {
        primaries: [],
        updatesByName: {},
      };
    }

    // Collect primary
    if (view.view_type === "primary") {
      templateGroups[templateId].primaries.push(view);
    }

    // Collect latest update per view_name
    if (view.view_type === "update") {
      const viewName = view.view_name;
      const currentTimestamp = new Date(view.updated_at || view.created_at);

      const existing = templateGroups[templateId].updatesByName[viewName];
      const existingTimestamp = existing
        ? new Date(existing.updated_at || existing.modified_at || existing.created_at)
        : null;

      if (!existing || currentTimestamp > existingTimestamp) {
        templateGroups[templateId].updatesByName[viewName] = view;
      }
    }
  }

  // Step 2: Flatten into result
  Object.values(templateGroups).forEach(({ primaries, updatesByName }) => {
    // push all primaries
    result.push(...primaries);

    // push all latest updates by name
    Object.values(updatesByName).forEach((updateView) => {
      result.push(updateView);
    });
  });

  return result;
})();







const openDataEntryModal = async (viewId) => {
  try {
    const res = await api.get(`/form-views/${viewId}`);
    setModalTitle(res.data.view_name);
    setModalFields(res.data.layout || []);
    setSelectedView(res.data); // 🆕 Save the full view object here
    
    // Prepare empty values
    const initialValues = {};
    res.data.layout.forEach(f => {
      initialValues[f.fieldname] = "";
    });
    setFormValues(initialValues);
    setModalVisible(true);
  } catch (err) {
    console.error("Error opening data entry modal:", err);
  }
};


const handleInputChange = (fieldname, value) => {
  setFormValues(prev => ({ ...prev, [fieldname]: value }));
};


// const submitDataEntry = () => {
//   console.log("🔄 Form Submitted:", formValues);
//   alert("Form submitted (data printed to console for now)");
//   setModalVisible(false);
// };


const submitDataEntry = async () => {
  if (!selectedView?.id) {
    alert("View not loaded correctly. Please try again.");
    return;
  }

  try {
    const response = await api.post('/form-views/formdata/insert', {
      viewId: selectedView.id,
      formData: formValues,
    });

    console.log("✅ Form submitted successfully:", response.data);
    alert("✅ Form submitted successfully!");
    setModalVisible(false);
  } catch (error) {
    console.error("❌ Submission failed:", error.response?.data || error.message);
    alert("❌ Failed to submit form.\n" + (error.response?.data?.message || error.message));
  }
};





  useEffect(() => {
  const fetchSavedViews = async () => {
    try {
      const res = await api.get("/form-views/list");
      setSavedViews(res.data);
    } catch (err) {
      console.error("Error fetching saved views:", err);
    }
  };
  fetchSavedViews();
}, []);


  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await api.get("/templates/list");
        setTemplates(res.data);
      } catch (err) {
        console.error("Error fetching templates:", err);
      }
    };
    fetchTemplates();
  }, []);

  const handleTemplateSelect = async (templateId) => {
  setSelectedTemplateId(templateId);
  try {
    const res = await api.get(`/templates/${templateId}/fields`);
    setTemplateFields(res.data); // expects an array like [{ fieldname, inputtype }]
  } catch (err) {
    console.error("Error fetching template fields:", err);
  }
};


  const handleDragStart = (e, type) => {
    e.dataTransfer.setData("fieldType", type);
  };



const handleDrop = (e) => {

    const fieldMeta = JSON.parse(e.dataTransfer.getData("fieldMeta"));
  e.preventDefault();
  
  const existing = formFields.find(f => f.fieldname === fieldMeta.fieldname);
  if (existing) return; // Prevent duplicate

  if (fieldMeta.inputtype !== "label") {
  const existing = formFields.find(f => f.fieldname === fieldMeta.fieldname);
  if (existing) return;
}

  const rect = canvasRef.current.getBoundingClientRect();
  const x = Math.round((e.clientX - rect.left) / GRID_SIZE) * GRID_SIZE;
  const y = Math.round((e.clientY - rect.top) / GRID_SIZE) * GRID_SIZE;

  setFormFields((prev) => [
  ...prev,
  {
    id: Date.now(),
    ...fieldMeta,
    fieldname: fieldMeta.inputtype === "label" ? `label_${Date.now()}` : fieldMeta.fieldname,
    label: fieldMeta.inputtype === "label" ? "Label" : "",
    x,
    y,
    width: 160,
    height: 40,
  },
]);

};


const loadViewToCanvas = async (viewId) => {
  try {
    const res = await api.get(`/form-views/${viewId}`);
    setFormFields(res.data.layout); // assuming layout is in response
    setFormViewName(res.data.view_name);
    setSelectedTemplateId(res.data.template_id);
  } catch (err) {
    console.error("Error loading view:", err);
  }
};




  const updateField = (id, updates) => {
    setFormFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };


  const handleSaveView = async () => {
    
  if (!selectedTemplateId || !formViewName) {
    alert("Select a template and enter a view name");
    return;
  }

  try {
    await api.post("/form-views/save", {
      template_id: selectedTemplateId,
      view_name: formViewName,
      layout: formFields,
      created_by: 1, // replace with logged-in user's ID
    });

    alert("Form view saved successfully!");
  } catch (err) {
    console.error("Error saving form view:", err);
    alert("Failed to save form view");
  }
};








  const handleDragOver = (e) => e.preventDefault();




    



  return (
    <>

    {modalVisible && (
  <div className="modal show fade d-block" tabIndex="-1" role="dialog">
    <div className="modal-dialog modal-lg" role="document">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Data Entry - {modalTitle}</h5>
          <button type="button" className="btn-close" onClick={() => setModalVisible(false)}></button>
        </div>
        <div className="modal-body">
          <div className="data-entry-canvas" style={{ position: "relative", minHeight: "600px" }}>
          <form>
            {modalFields.map((field, index) => (
              <div className="mb-3" key={index}
              
               style={{
                position: "absolute",
                left: field.x,
                top: field.y,
                width: field.width,
                height: field.height,
              }}
              
              >
                <label className="form-label">{field.label}</label>
                {field.inputtype === "text" && (
                  <input
                    type="text"
                    className="form-control"
                    value={formValues[field.fieldname] || ""}
                    onChange={(e) => handleInputChange(field.fieldname, e.target.value)}
                  />
                )}
                {field.inputtype === "textarea" && (
                  <textarea
                    className="form-control"
                    value={formValues[field.fieldname] || ""}
                    onChange={(e) => handleInputChange(field.fieldname, e.target.value)}
                  />
                )}
                {field.inputtype === "dropdownlist" && (
                  <select
                    className="form-select"
                    value={formValues[field.fieldname] || ""}
                    onChange={(e) => handleInputChange(field.fieldname, e.target.value)}
                  >
                    <option value="">-- Select --</option>
                    {field.options?.map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
                {field.inputtype === "checkbox" && (
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={formValues[field.fieldname] || false}
                      onChange={(e) => handleInputChange(field.fieldname, e.target.checked)}
                    />
                  </div>
                )}
                
                


                {field.inputtype === "radio" && (
  <div className="d-flex gap-3 align-items-center">
    {field.options?.map((opt, i) => (
      <div key={i} className="form-check form-check-inline">
        <input
          type="radio"
          className="form-check-input"
          id={`radio-${field.fieldname}-${i}`}
          name={`radio-${field.fieldname}`}
          value={opt}
          checked={formValues[field.fieldname] === opt}
          onChange={(e) => handleInputChange(field.fieldname, e.target.value)}
        />
        <label className="form-check-label" htmlFor={`radio-${field.fieldname}-${i}`}>
          {opt}
        </label>
      </div>
    ))}
  </div>
)}



                
                


              </div>
            ))}
          </form>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={() => setModalVisible(false)}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={submitDataEntry}>
            Submit
          </button>
        </div>
      </div>
    </div>
  </div>
)}





      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setIsFullScreen(true)}
          style={{ background: "none", border: "none", cursor: "pointer" }}
          title="Expand"
        >
          {/* <Maximize2 size={18} /> */}
        </button>
      </div>

    
    
      <div className="formviews-layout">
        
<div className="left-panel bg-light p-3" style={{ width: "260px" }}>
  <h4>Views</h4>
  <input
    type="text"
    placeholder="Search"
    className="form-control mb-3"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
  />

  <div className="view-card-grid"  style={{ maxWidth: "240px" }}>
    {filteredViews.map((view) => (
      <div key={view.id} className="card shadow-sm mb-3" >
        <div className="card-body p-3">
          <h6 className="card-title mb-2">
            📄 <strong>{view.view_name}</strong>
          </h6>
          <p className="mb-1"><strong>Type:</strong> {view.view_type}</p>
          <p className="mb-3"><strong>Template:</strong> {view.template_name}</p>
          <p className="mb-3"><strong>ID:</strong> {view.id}</p>
          <p><strong>Created at:</strong> {formatToLocal(view.created_at)}</p>
          <p><strong>Modified at:</strong> {formatToLocal(view.updated_at)}</p>

          



<div className="d-flex gap-2">
  <button
    className="btn btn-outline-primary btn-sm flex-fill"
    style={{ minWidth: "80px" }}
    onClick={() => openDataEntryModal(view.id)}
  >
    Open
  </button>
  <button
    className="btn btn-outline-secondary btn-sm flex-fill"
    style={{ minWidth: "80px" }}
    onClick={() => loadViewToCanvas(view.id)}
  >
    Edit
  </button>
</div>





        </div>
      </div>
    ))}
  </div>
</div>





        <div className="center-panel">
          <h4>View Creator</h4>

         

          {/* View Name */}
          <label>Form View Name</label>
          <input
            type="text"
            placeholder="Enter view name"
            value={formViewName}
            onChange={(e) => setFormViewName(e.target.value)}
          />


           {/* Template Dropdown */}
          <label>Select Template</label>
          <select value={selectedTemplateId} onChange={(e) => handleTemplateSelect(e.target.value)}>
            <option value="">-- Select Template --</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.template_name}
                </option>
            ))}
          </select>

          {/* Form Size Selector */}
          <label>Form Size</label>
          <select value={formSize} onChange={(e) => setFormSize(e.target.value)}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>

          {/* Template Fields */}
          <br></br>
          <h5 style={{ background: "", color: "black" }}>Form Inputs (Drag & Drop)</h5>
          {templateFields.length === 0 && (
            <p style={{ fontSize: "14px", color: "#999" }}>Select a template to see fields</p>
          )}
          {templateFields.map((field, index) => (
            <div
                key={index}
                className="draggable-item"
                draggable
                onDragStart={(e) => e.dataTransfer.setData("fieldMeta", JSON.stringify(field))}
            >
                {field.fieldname} ({field.inputtype})
            </div>
            ))}

            <div
  className="draggable-item"
  draggable
  onDragStart={(e) =>
    e.dataTransfer.setData(
      "fieldMeta",
      JSON.stringify({ fieldname: "Label", inputtype: "label" })
    )
  }
>
  Label
</div>
<br></br>
<br></br>
<button className="primary-btn" onClick={handleSaveView}>
  Save Formview
</button>

            
        </div>

        <div className="right-panel">
          <div className="tab-bar">
            <button className={activeViewTab === "drag" ? "active" : ""} onClick={() => setActiveViewTab("drag")}>
              Drag & Drop View
            </button>
            <button className={activeViewTab === "code" ? "active" : ""} onClick={() => setActiveViewTab("code")}>
              Code View
            </button>
            <Maximize2 size={18} />
          </div>

          {activeViewTab === "drag" ? (
            <div className="form-canvas" ref={canvasRef} onDrop={(e) => handleDrop(e, e.dataTransfer.getData("fieldType"))} onDragOver={handleDragOver}>
              {formFields.map((field) => (
                <DraggableResizableField key={field.id} field={field} canvasRef={canvasRef} updateField={updateField} />
              ))}
            </div>
          ) : (
            <pre className="code-preview">{JSON.stringify(formFields, null, 2)}</pre>
          )}
        </div>
      </div>
    </>
  );
};

export default FormViewsTab;
