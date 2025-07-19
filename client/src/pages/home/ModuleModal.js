











// ModuleModal.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./moduleModal.scss";

export default function ModuleModal({ onClose }) {
  const [allModules, setAllModules] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");

        const [modulesRes, subsRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/modules`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${process.env.REACT_APP_API_URL}/subscriptions`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setAllModules(modulesRes.data);
        setSubscriptions(subsRes.data.map(sub => sub.module_id));
      } catch (err) {
        console.error("Error fetching modules/subscriptions:", err);
      }
    };

    fetchData();
  }, []);

  const handleSubscribe = async (moduleId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${process.env.REACT_APP_API_URL}/subscribe`, { moduleId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubscriptions([...subscriptions, moduleId]);
    } catch (err) {
      console.error("Failed to subscribe:", err);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>All Modules</h3>
        <button className="close-button" onClick={onClose}>✖</button>

        <div className="module-grid">
          {allModules.map((mod) => (
            <div key={mod.id} className="module-card">
              <h4>{mod.name}</h4>
              <p>{mod.description || "No description"}</p>
              {subscriptions.includes(mod.id) ? (
                <button className="subscribed-btn" disabled>Subscribed</button>
              ) : (
                <button className="add-btn" onClick={() => handleSubscribe(mod.id)}>Add</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
