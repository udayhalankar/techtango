import React, { Fragment, useEffect, useState } from 'react';
import "./topbox.scss";
import { apiUrl } from "../../services/urls";

const Topbox = () => {
  const [todos, setTodos] = useState([]);

  const getTodos = async () => {
    try {
      const response = await fetch(apiUrl("/todos"));

      const contentType = response.headers.get("content-type");

      if (!response.ok) {
        const text = await response.text();
        console.error("❌ Server error:", response.status, text);
        return;
      }

      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("❌ Expected JSON but got:", text);
        return;
      }

      const jsonData = await response.json();
      setTodos(jsonData);
    } catch (err) {
      console.error("❌ Fetch failed:", err.message);
    }
  };

  useEffect(() => {
    getTodos();
  }, []);

  return (
    <Fragment>
      <div className="topBox">
        <h5>Assignments</h5>
        <div className="list">
          {todos.length === 0 ? (
            <div style={{ padding: "1rem", color: "#999" }}>No assignments found.</div>
          ) : (
            todos.map((todo) => (
              <div className="listItem" key={todo.todo_id}>
                <div className="description">
                  <span className="descriptionTexts">{todo.description}</span>
                </div>
                <div className="description">
                  <span className="asgntxt">{todo.assignto}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Fragment>
  );
};

export default Topbox;
