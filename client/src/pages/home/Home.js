import React, { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ModuleModal from "./ModuleModal";
import "./home.scss";
import api from '../../services/api';

export default function Home() {
  const sliderRef = useRef();
  const [modules, setModules] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const scrollLeft = () => {
    sliderRef.current.scrollBy({ left: -300, behavior: "smooth" });
  };

  const scrollRight = () => {
    sliderRef.current.scrollBy({ left: 300, behavior: "smooth" });
  };

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await api.get('/subscriptions');
        setModules(res.data);
      } catch (err) {
        console.error("Failed to fetch modules", err); // global modal will handle 401/403
      }
    };
    fetchModules();
  }, []);

  return (
    <div className="home-page">
      <div className="nav-bar">
        <button>Proposals</button>
        <button>Meetings</button>
        <button>Assignments</button>
        <button>Workflow Assignments</button>
        <button>Notifications</button>
      </div>

      <div className="top-section">
        <div className="banner">
          <h2>Joint Operations Committee</h2>
          <p className="app-title">The All-in-One app!</p>
          <p>Download the ESR App for a seamless experience</p>
          <button className="details-btn">Details</button>
          <div className="phone-image">📱</div>
        </div>

        <div className="meetings">
          <h3>Scheduled Meetings</h3>
          <table>
            <thead>
              <tr><th>Date</th><th>Agenda</th></tr>
            </thead>
            <tbody>
              <tr><td>15 Nov 2024</td><td>Discuss Multiple Items.</td></tr>
              <tr><td>22 Nov 2024</td><td>Discuss Multiple Items.</td></tr>
              <tr><td>27 Nov 2024</td><td>Discuss Multiple Items.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="add-modules-button">
        Applications
        <button className="add-btn" onClick={() => setShowModal(true)}>Add Modules</button>
      </div>

      <div className="slider-container">
        <button className="slider-arrow left" onClick={scrollLeft}>◀</button>
        <div className="cards-slider" ref={sliderRef}>
          {modules.map((mod) => {
            if (!mod.route) {
              console.warn(`Skipping module: ${mod.module_name} due to missing routeinfo`);
              return null;
            }
            return (
              <div className="card my-assignments" key={mod.module_id}>
                <Link to={mod.route} className="card-link">
                  <h4>{mod.module_name}</h4>
                  <p>{mod.description}</p>
                  {/* <p>View your assignments and update status</p> */}
                </Link>
              </div>
            );
          })}
        </div>
        <button className="slider-arrow right" onClick={scrollRight}>▶</button>
      </div>

      <div className="bottom-info">
        <div className="info-box">
          <h4>Statistics</h4>
          <ul>
            <li>New Proposals: 18</li>
            <li>Proposals on Hold: 7</li>
            <li>Assignments closed last week: 5</li>
            <li>Open Assignments: 42</li>
            <li>Assignments due next week: 7</li>
          </ul>
        </div>
        <div className="info-box">
          <h4>Minutes of Previous Meeting</h4>
          <p>This is the text for the minutes of previous meeting.</p>
        </div>
        <div className="info-box">
          <h4>Overdue Assignments</h4>
          <p>Click here to view all overdue and escalated assignments</p>
        </div>
      </div>

      {showModal && <ModuleModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
