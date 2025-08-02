import React, { useState, useRef, useEffect } from "react";
import "./formviews.scss";
import { Maximize2 } from "lucide-react";

const GRID_SIZE = 10;

// const DraggableResizableField = ({ field, canvasRef, updateField }) => {
//   const [isResizing, setIsResizing] = useState(false);

//   const onResizeStart = (e) => {
//     e.stopPropagation();
//     setIsResizing(true);
//     document.body.style.cursor = "nwse-resize";
//   };

//   const onResizing = (e) => {
//     if (!isResizing) return;
//     const canvasRect = canvasRef.current.getBoundingClientRect();
//     const newWidth = Math.max(60, e.clientX - canvasRect.left - field.x);
//     const newHeight = Math.max(30, e.clientY - canvasRect.top - field.y);
//     updateField(field.id, { width: newWidth, height: newHeight });
//   };

//   const onResizeEnd = () => {
//     setIsResizing(false);
//     document.body.style.cursor = "default";
//   };

//   useEffect(() => {
//     window.addEventListener("mousemove", onResizing);
//     window.addEventListener("mouseup", onResizeEnd);
//     return () => {
//       window.removeEventListener("mousemove", onResizing);
//       window.removeEventListener("mouseup", onResizeEnd);
//     };
//   }, [isResizing]);

//   const onDragEnd = (e) => {
//     if (isResizing) return;
//     const rect = canvasRef.current.getBoundingClientRect();
//     const x = Math.round((e.clientX - rect.left) / GRID_SIZE) * GRID_SIZE;
//     const y = Math.round((e.clientY - rect.top) / GRID_SIZE) * GRID_SIZE;
//     updateField(field.id, { x, y });
//   };

//   return (
//     <div
//       className="dropped-field"
//       style={{
//         left: field.x,
//         top: field.y,
//         width: field.width || 160,
//         height: field.height || 40,
//       }}
//       draggable={!isResizing}
//       onDragEnd={onDragEnd}
//     >
//       {field.type === "text" && <input type="text" placeholder="Text Box" />}
//       {field.type === "radio" && (
//         <div>
//           <label><input type="radio" name={`radio-${field.id}`} /> Option 1</label>
//           <label><input type="radio" name={`radio-${field.id}`} /> Option 2</label>
//         </div>
//       )}
//       <div className="resize-handle" onMouseDown={onResizeStart}></div>
//     </div>
//   );
// };


const DraggableResizableField = ({ field, canvasRef, updateField }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  

  const onMouseDown = (e) => {
    if (e.target.classList.contains("resize-handle")) return;
    e.stopPropagation();
    setIsDragging(true);
    document.body.style.cursor = "move";
  };

  const onResizeStart = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    document.body.style.cursor = "nwse-resize";
  };

  const onMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / GRID_SIZE) * GRID_SIZE;
    const y = Math.round((e.clientY - rect.top) / GRID_SIZE) * GRID_SIZE;

    if (isDragging) {
      updateField(field.id, { x, y });
    }

    if (isResizing) {
      const width = Math.max(60, x - field.x);
      const height = Math.max(30, y - field.y);
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
        zIndex: 10,
      }}
    >
      {field.type === "text" && <input type="text" placeholder="Text Box" />}
      {field.type === "radio" && (
        <div>
          <label>
            <input type="radio" name={`radio-${field.id}`} /> Option 1
          </label>
          <label>
            <input type="radio" name={`radio-${field.id}`} /> Option 2
          </label>
        </div>
      )}
      <div className="resize-handle" onMouseDown={onResizeStart} />
    </div>
  );
};




const FormViewsTab = () => {
  const [activeViewTab, setActiveViewTab] = useState("drag");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [formFields, setFormFields] = useState([]);
  const canvasRef = useRef();

  const handleDrop = (e, fieldType) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / GRID_SIZE) * GRID_SIZE;
    const y = Math.round((e.clientY - rect.top) / GRID_SIZE) * GRID_SIZE;
    const newField = {
      id: Date.now(),
      type: fieldType,
      x,
      y,
    };
    setFormFields((prev) => [...prev, newField]);
  };

  const updateField = (id, updates) => {
    setFormFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const handleDragStart = (e, type) => {
    e.dataTransfer.setData("fieldType", type);
  };

  const handleDragOver = (e) => e.preventDefault();

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setIsFullScreen(true)}
          style={{ background: "none", border: "none", cursor: "pointer" }}
          title="Expand"
        >
          <Maximize2 size={18} />
        </button>
      </div>

      <div className="formviews-layout">
        <div className="left-panel">
          <h4>Views</h4>
          <input type="text" placeholder="Search" className="search-input" />
        </div>

        <div className="center-panel">
          <h4>Components</h4>
          <div
            className="draggable-item"
            draggable
            onDragStart={(e) => handleDragStart(e, "text")}
          >
            Text Box
          </div>
          <div
            className="draggable-item"
            draggable
            onDragStart={(e) => handleDragStart(e, "radio")}
          >
            Radio Button
          </div>
        </div>

        <div className="right-panel">
          <div className="tab-bar">
            <button
              className={activeViewTab === "drag" ? "active" : ""}
              onClick={() => setActiveViewTab("drag")}
            >
              Drag & Drop View
            </button>
            <button
              className={activeViewTab === "code" ? "active" : ""}
              onClick={() => setActiveViewTab("code")}
            >
              Code View
            </button>
          </div>

          {activeViewTab === "drag" ? (
            <div
              className="form-canvas"
              ref={canvasRef}
              onDrop={(e) => handleDrop(e, e.dataTransfer.getData("fieldType"))}
              onDragOver={handleDragOver}
            >
              {formFields.map((field) => (
                <DraggableResizableField
                  key={field.id}
                  field={field}
                  canvasRef={canvasRef}
                  updateField={updateField}
                />
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




// import React, { useState, useRef } from "react";
// import "./formviews.scss";
// import { Maximize2 } from "lucide-react";

// const FormViewsTab = () => {
//   const [activeViewTab, setActiveViewTab] = useState("drag");
//   const [isFullScreen, setIsFullScreen] = useState(false);
//   const [formFields, setFormFields] = useState([]);
//   const canvasRef = useRef();

//   const handleDragStart = (e, fieldType) => {
//     e.dataTransfer.setData("fieldType", fieldType);
//   };

//   const handleDrop = (e) => {
//     e.preventDefault();
//     const fieldType = e.dataTransfer.getData("fieldType");
//     const canvas = canvasRef.current;
//     const rect = canvas.getBoundingClientRect();

//     const x = e.clientX - rect.left;
//     const y = e.clientY - rect.top;

//     const snapSize = 10;
//     const snappedX = Math.round(x / snapSize) * snapSize;
//     const snappedY = Math.round(y / snapSize) * snapSize;

//     const newField = {
//       id: Date.now(),
//       type: fieldType,
//       x: snappedX,
//       y: snappedY,
//     };

//     setFormFields((prev) => [...prev, newField]);
//   };

//   const handleDragOver = (e) => {
//     e.preventDefault();
//   };

//   const handleDragEnd = (e, id) => {
//     const snapSize = 10;
//     const canvas = canvasRef.current;
//     const rect = canvas.getBoundingClientRect();

//     const x = e.clientX - rect.left;
//     const y = e.clientY - rect.top;

//     const snappedX = Math.max(0, Math.min(Math.round(x / snapSize) * snapSize, rect.width - 20));
//     const snappedY = Math.max(0, Math.min(Math.round(y / snapSize) * snapSize, rect.height - 20));

//     setFormFields((prevFields) =>
//       prevFields.map((field) =>
//         field.id === id ? { ...field, x: snappedX, y: snappedY } : field
//       )
//     );
//   };

//   const renderField = (field) => {
//   return (
//     <div
//       key={field.id}
//       className="dropped-field"
//       draggable
//       onDragStart={(e) => {
//         // Prevent default drag image
//         const ghost = document.createElement("div");
//         ghost.style.position = "absolute";
//         ghost.style.top = "-9999px";
//         ghost.style.left = "-9999px";
//         document.body.appendChild(ghost);
//         e.dataTransfer.setDragImage(ghost, 0, 0);
//         e.dataTransfer.setData("fieldId", field.id);
//       }}
//       onDragEnd={(e) => {
//         const canvas = canvasRef.current;
//         const rect = canvas.getBoundingClientRect();
//         const x = e.clientX - rect.left;
//         const y = e.clientY - rect.top;

//         const snapSize = 10;
//         const snappedX = Math.round(x / snapSize) * snapSize;
//         const snappedY = Math.round(y / snapSize) * snapSize;

//         setFormFields((prev) =>
//           prev.map((f) =>
//             f.id === field.id ? { ...f, x: snappedX, y: snappedY } : f
//           )
//         );
//       }}
//       style={{
//         position: "absolute",
//         left: `${field.x}px`,
//         top: `${field.y}px`,
//         zIndex: 10,
//         cursor: "move",
//         userSelect: "none",
//       }}
//     >
//       {/* Prevent internal drag */}
//       <div onDragStart={(e) => e.stopPropagation()}>
//         {field.type === "text" && (
//           <input
//             type="text"
//             placeholder="Text Box"
//             draggable={false}
//             style={{ pointerEvents: "auto" }}
//           />
//         )}
//         {field.type === "radio" && (
//           <div>
//             <label>
//               <input type="radio" name={`radio-${field.id}`} draggable={false} /> Option 1
//             </label>
//             <label>
//               <input type="radio" name={`radio-${field.id}`} draggable={false} /> Option 2
//             </label>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };


//   return (
//     <>
//       <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "4px" }}>
//         <button
//           onClick={() => setIsFullScreen(true)}
//           style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
//           title="Expand to Full Screen"
//         >
//           <Maximize2 size={18} />
//         </button>
//       </div>

//       <div className="formviews-layout">
//         <div className="left-panel">
//           <h4>Views</h4>
//           <input type="text" placeholder="Search" className="search-input" />
//           <div className="form-cards">{/* View cards */}</div>
//         </div>

//         <div className="center-panel">
//           <h4>Components</h4>
//           <input type="text" placeholder="Template" disabled />
//           <input type="text" placeholder="View Name" />
//           <input type="text" placeholder="View Type" />
//           <h5>Template Components</h5>
//           <div className="draggable-item" draggable onDragStart={(e) => handleDragStart(e, "text")}>
//             Text Box
//           </div>
//           <div className="draggable-item" draggable onDragStart={(e) => handleDragStart(e, "radio")}>
//             Radio Button
//           </div>
//         </div>

//         <div className="right-panel">
//           <div className="tab-bar">
//             <button
//               onClick={() => setActiveViewTab("drag")}
//               className={activeViewTab === "drag" ? "active" : ""}
//             >
//               Drag & Drop View
//             </button>
//             <button
//               onClick={() => setActiveViewTab("code")}
//               className={activeViewTab === "code" ? "active" : ""}
//             >
//               Code View
//             </button>
//           </div>

//           {activeViewTab === "drag" ? (
//             <div
//               className="form-canvas"
//               ref={canvasRef}
//               onDrop={handleDrop}
//               onDragOver={handleDragOver}
//             >
//               {formFields.length === 0 && <p className="placeholder">Drag components here</p>}
//               {formFields.map(renderField)}
//               <button className="primary-btn" style={{ marginTop: "20px" }}>
//                 Save View
//               </button>
//             </div>
//           ) : (
//             <pre className="code-preview">{JSON.stringify(formFields, null, 2)}</pre>
//           )}
//         </div>
//       </div>
//     </>
//   );
// };

// export default FormViewsTab;
