import React, { useState, useEffect } from 'react';
import './sbforms.scss';
import Footer from '../../components/footer/Footer';
import api from '../../services/api';

const TABS = ['Templates', 'Forms Views', 'Report Views', 'Create Query', 'Chart Views'];

export const Sbforms = () => {
  const [activeTab, setActiveTab] = useState('Templates');
  const [showFormModal, setShowFormModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState([]);
  const [newField, setNewField] = useState({ name: '', type: 'text' });
  const [templateList, setTemplateList] = useState([]);

  const addField = () => {
  const fieldRegex = /^[a-z0-9]{1,20}$/;

  

  if (!newField.name.trim()) {
    alert("Field name is required.");
    return;
  }

  if (!fieldRegex.test(newField.name)) {
    alert("Field name must be lowercase letters and numbers only (max 20 characters). No spaces or special characters.");
    return;
  }

  setFields([...fields, newField]);
  setNewField({ name: '', type: 'text' });
};


useEffect(() => {
  const fetchTemplates = async () => {
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

  if (fields.length === 0) {
    alert("Please add at least one field before saving.");
    return;
  }

  try {
    const payload = {
      templateName,
      fields,
      createdBy: 1 // Replace with actual user ID
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
      <h2>🛠️ Smart Business Form Builder</h2>

      <div className="tabs">
        {TABS.map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

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

        {activeTab === 'Forms Views' && (
          <table className="grid-table">
            <thead>
              <tr>
                <th>Form View Name</th>
                <th>Template Name</th>
                <th>Date Created</th>
                <th>Created By</th>
                <th>View Form</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>No form views yet</td></tr>
            </tbody>
          </table>
        )}

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
            <h3>Template Designer</h3>
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
                value={newField.name}
                onChange={(e) => setNewField({ ...newField, name: e.target.value })}
              />
              <select
                value={newField.type}
                onChange={(e) => setNewField({ ...newField, type: e.target.value })}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="checkbox">Checkbox</option>
                <option value="longtext">Long Text</option>
                <option value="image">Image Upload</option>
              </select>
              <button onClick={addField}>Add Field</button>
            </div>

            <ul className="field-list">
              {fields.map((f, i) => (
                <li key={i}>
                  {f.name} ({f.type})
                  <button className="remove-btn" onClick={() => {
                    const updated = [...fields];
                    updated.splice(i, 1);
                    setFields(updated);
                  }}>✕</button>
                </li>
              ))}
            </ul>

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
          </div>
        </div>
      )}
    </div>
    <Footer />
  </div>
);

};

export default Sbforms;
