import React from 'react';
import './formviewbuilder.scss'

export const FormViewBuilder = () => {
  return (
    <div>FormViewBuilder
        <div className="form-builder-container">
  <div className="left-sidebar">
    <h4>Available Fields</h4>
    {/* Render draggable template fields */}
  </div>

  <div className="form-canvas">
    <h4>Form Layout</h4>
    {/* Render drop area + layout elements */}
  </div>

  <div className="right-sidebar">
    <h4>Properties</h4>
    {/* Render settings for selected element */}
  </div>
</div>


    </div>

    
  )
}

export default FormViewBuilder;
