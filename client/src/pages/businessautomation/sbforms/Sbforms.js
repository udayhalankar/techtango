import React, { useState, useEffect, useRef } from 'react';
import './sbforms.scss';
import api from '../../../services/api';

import FormViewsTab from './FormViewsTab';
import { Settings } from "lucide-react";
const TABS = ['Templates', 'Forms Views', 'Report Views', 'Create Query', 'Chart Views'];

export const Sbforms = () => {
  const [activeTab, setActiveTab] = useState('Templates');
  const [showFormModal, setShowFormModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState([]);
  const [newField, setNewField] = useState({ name: '', type: 'text', inputtype: 'text', options: '' });
  const [templateList, setTemplateList] = useState([]);

  const [newFieldName, setNewFieldName] = useState("");
  const [newInputType, setNewInputType] = useState("text");
  const [newRadioOptions, setNewRadioOptions] = useState("");
  const [newDateFormat, setNewDateFormat] = useState("full");
  const [formFields, setFormFields] = useState([]);
  const [showViewBuilder, setShowViewBuilder] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef();
  const iconWrapperRef = useRef();
  
  
useEffect(() => {
  const handleClickOutside = (event) => {
    if (
      iconWrapperRef.current &&
      !iconWrapperRef.current.contains(event.target)
    ) {
      setShowDropdown(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);



      const addField = () => {
        const nameRegex = /^[a-z0-9]{1,20}$/;

        if (!newField.name.trim()) {
          alert("Field name is required.");
          return;
        }

        if (!nameRegex.test(newField.name)) {
          alert("Field name must be lowercase letters and numbers only, max 20 characters.");
          return;
        }

        if (!newField.inputtype) {
          alert("Please select an input type.");
          return;
        }

        setFields([...fields, newField]);
        setNewField({ name: '', type: 'text', inputtype: '' }); // Clear input after add
      };




useEffect(() => {
  const fetchTemplates = async () => {
    console.log("formFields changed:", formFields);
    try {
      const res = await api.get('/templates/list');
      setTemplateList(res.data);
    } catch (err) {
      console.error("Failed to load templates", err);
    }
  };

  fetchTemplates();
}, []);


const [editModal, setEditModal] = useState(false);
const [selectedTemplate, setSelectedTemplate] = useState(null);

const openEditModal = (tpl) => {
  setSelectedTemplate(tpl);
  setEditModal(true);
};

const handleUpdateTemplate = () => {
  alert('Update logic will be implemented here.');
  setEditModal(false);
};

const handleAddField = () => {
  // Field name validation
  console.log("Adding field");
  const nameRegex = /^[a-z0-9]{1,20}$/;
  if (!nameRegex.test(newFieldName)) {
    alert("Field name must be lowercase letters/numbers, max 20 chars, no spaces/special chars.");
    return;
  }

  // Check for duplicate names
  if (formFields.some(f => f.fieldname === newFieldName)) {
    alert("Field name already exists.");
    return;
  }

  // Determine backend-compatible datatype
  let dataType = "TEXT";
  let options = null;
  let format = null;

  if (newInputType === "checkbox") dataType = "INTEGER";
  if (newInputType === "dropdownlist") {
  dataType = "TEXT";
  options = newRadioOptions
    .split(",")
    .map(opt => opt.trim())
    .filter(Boolean);

  if (options.length < 2) {
    alert("Please provide at least 2 options for dropdown list.");
    return;
  }
}

  if (newInputType === "radio") {
    dataType = "INTEGER";
    options = newRadioOptions.split(",").map(opt => opt.trim()).filter(Boolean);
    if (options.length < 2) {
      alert("Please provide at least 2 options for radio buttons.");
      return;
    }
  }
  if (newInputType === "image") dataType = "TEXT";
  if (newInputType === "date") {
    dataType = "DATE";
    format = newDateFormat;
  }

  // Add new field to state
  const newField = {
    fieldname: newFieldName,
    datatype: dataType,
    inputtype: newInputType,
    options,        // for radio buttons
    format          // for date
  };

  setFormFields([...formFields, newField]);

  // Reset all form inputs
  setNewFieldName("");
  setNewInputType("text");
  setNewRadioOptions("");
  setNewDateFormat("full");
};



const handleRemoveField = (indexToRemove) => {
  setFormFields(prev => prev.filter((_, index) => index !== indexToRemove));
};



  const handleSaveTemplate = async () => {
  // ✅ 1. Basic Validation
  const nameRegex = /^[a-z0-9]+$/;
  const maxLength = 20;

  if (!templateName) {
    alert("Template name is required.");
    return;
  }

  if (!nameRegex.test(templateName)) {
    alert("Template name must be lowercase letters and numbers only. No spaces or special characters.");
    return;
  }

  if (templateName.length > maxLength) {
    alert("Template name must not exceed 20 characters.");
    return;
  }

  if (formFields.length === 0) {
  alert("Please add at least one field before saving.");
  return;
}

setShowFormModal(false);
setTemplateName('');
setFormFields([]);
setNewFieldName('');
setNewInputType('text');
setNewRadioOptions('');
setNewDateFormat('full');



  try {
        const payload = {
      templateName,
      fields: formFields,
      createdBy: 1
    };

    const res = await api.post('/templates/create', payload);
    alert('Template created: ' + res.data.table);
    setShowFormModal(false);
    setTemplateName('');
    setFields([]);
  } catch (err) {
    if (err.response?.data?.error?.includes('duplicate')) {
      alert("Template name already exists.");
    } else {
      alert("Error creating template.");
      console.error(err);
    }
  }
};




  return (
  <div className="sbforms-page">
    <div className="sbforms-main">
      <div className="sbcb-header">
  <div className="title-wrapper">
    <h4 className="builder-title">
      Smart Business Component Builder
      <span className="icon-wrapper" ref={iconWrapperRef}>
        <Settings onClick={() => setShowDropdown(!showDropdown)} />
        {showDropdown && (
          <div className="dropdown-menu" ref={dropdownRef}>
            <button onClick={() => setActiveTab('Templates')}>Templates</button>
            <button onClick={() => setActiveTab('Forms Views')}>Form Views</button>
            <button onClick={() => setActiveTab('Report Views')}>Report Views</button>
            <button onClick={() => setActiveTab('Create Query')}>Create Query</button>
            <button onClick={() => setActiveTab('Chart Views')}>Chart Views</button>
          </div>
        )}
      </span>
    </h4>
  </div>
  <hr className="title-divider" />
</div>




      {/* <div className="tabs">
        {TABS.map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div> */}

      <div className="tab-content">
        {/* All your tab switch logic stays unchanged */}
        {activeTab === 'Templates' && (
          <>
            <button className="primary-btn" onClick={() => setShowFormModal(true)}>
              Create New Form Template
            </button>

            <table className="grid-table">
              <thead>
                <tr>
                  <th>Template Name</th>                  
                  <th>Date Created</th>
                  <th>Created By</th>
                  <th>Edit</th>
                </tr>
              </thead>

              <tbody>                
                {templateList.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center' }}>No templates yet</td>
                    </tr>
                  ) : (
                    templateList.map((tpl, i) => (
                      <tr key={i}>
                        <td>{tpl.template_name}</td>
                        <td>{new Date(tpl.created_at).toLocaleDateString()}</td>
                        <td>{tpl.created_by}</td>
                        <td>
                          <button class="edit-btn" onClick={() => openEditModal(tpl)}>Edit</button>
                        </td>
                      </tr>
                    ))
                  )}
              </tbody>
            </table>
          </>
        )}

       {activeTab === 'Forms Views' && <FormViewsTab />}


        {activeTab === 'Report Views' && (
          <table className="grid-table">
            <thead>
              <tr>
                <th>Report View Name</th>
                <th>Query Name</th>
                <th>Date Created</th>
                <th>Created By</th>
                <th>View Report</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>No reports yet</td></tr>
            </tbody>
          </table>
        )}

        {activeTab === 'Create Query' && (
          <div className="query-section">
            <p>[ Query Builder Modal placeholder ]</p>
          </div>
        )}

        {activeTab === 'Chart Views' && (
          <table className="grid-table">
            <thead>
              <tr>
                <th>Chart View Name</th>
                <th>Query Name</th>
                <th>Date Created</th>
                <th>Created By</th>
                <th>View Chart</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>No chart views yet</td></tr>
            </tbody>
          </table>
        )}
      </div>

      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>Template Designer</h2>
            <input
              type="text"
              placeholder="Template Name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
            Only lowercase letters and numbers, max 20 characters. No spaces or special characters.

            <div className="field-add-row">
              <input
                type="text"
                placeholder="Field Name"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
              />

              <select
                value={newInputType}
                onChange={(e) => {
                  setNewInputType(e.target.value);
                  setNewRadioOptions(""); // Clear radio options on type change
                  setNewDateFormat("full"); // Reset date format
                }}
              >
                <option value="text">Text</option>
                <option value="textarea">Textarea</option>
                <option value="checkbox">Checkbox</option>
                <option value="radio">Radio Button</option>
                <option value="image">Image</option>
                <option value="date">Date</option>
                <option value="integer">Integer</option> {/* ✅ Add this */}
                <option value="dropdownlist">Dropdownlist</option> {/* ✅ Add this */}
              </select>

              {/* For Radio Buttons: input comma-separated options */}
              {newInputType === "radio" && (
                <input
                  type="text"
                  placeholder="Radio options (e.g. Yes,No,Maybe)"
                  value={newRadioOptions}
                  onChange={(e) => setNewRadioOptions(e.target.value)}
                />
              )}

              {newInputType === "dropdownlist" && (
                <input
                  type="text"
                  placeholder="Dropdown options (e.g. Option A, Option B)"
                  value={newRadioOptions}
                  onChange={(e) => setNewRadioOptions(e.target.value)}
                />
              )}


              {/* For Date Format Selection */}
              {newInputType === "date" && (
                <select
                  value={newDateFormat}
                  onChange={(e) => setNewDateFormat(e.target.value)}
                >
                  <option value="full">Full Date (dd/mm/yyyy)</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                  <option value="day">Day Only</option>
                </select>
              )}

              <button onClick={handleAddField}>Add Field</button>
            </div>



            <table className="field-grid-table">
                  <thead>
                    <tr>
                      <th>Field Name</th>
                      <th>Data Type</th>
                      <th>Input Type</th>
                      <th>Options / Format</th>
                       <th>Action</th> {/* 🧱 Add this */}
                    </tr>
                  </thead>
                  <tbody>
                    {formFields.map((field, index) => (
                      <tr key={index}>
                        <td>{field.fieldname}</td>
                        <td>{field.datatype}</td>
                        <td>{field.inputtype}</td>
                        <td>
                          {field.options?.join(", ") || field.format || "-"}
                        </td>
                        <td>
                        <button
                          onClick={() => handleRemoveField(index)}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer"
                          }}
                        >
                          Remove
                        </button>
                      </td>

                      </tr>
                    ))}
                  </tbody>
                </table>




                  {editModal && selectedTemplate && (
        <div className="modal-overlay" onClick={() => setEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Edit Template: {selectedTemplate.template_name}</h3>
            {/* Render editable fields here with logic to skip ones with data */}
            <p>(Only fields without data can be edited)</p>
            <button className="primary-btn" onClick={handleUpdateTemplate}>Save Changes</button>
          </div>
        </div>
      )}



            <button className="save-template-btn" onClick={handleSaveTemplate}>
              Save Template
            </button>

            <button
              className="close-modal-btn"
              onClick={() => {
                const confirmClose = window.confirm("All data will be lost. Do you want to continue?");
                if (confirmClose) {
                  setShowFormModal(false);
                  setTemplateName('');
                  setFormFields([]);
                  setNewFieldName('');
                  setNewInputType('text');
                  setNewRadioOptions('');
                  setNewDateFormat('full');
                }
              }}
            >
              ×
            </button>

          </div>
        </div>
      )}
    </div>
  </div>
);

};

export default Sbforms;
