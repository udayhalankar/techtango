import React, { Fragment, useState } from 'react';


const InputTodo = () => {

  const [description, setDescription] = useState("");
  const [assignto, setAssignto] = useState("");

const onSubmitForm = async (e) => {
e.preventDefault();
  try {
    
    const body = {description, assignto};
    const response = await fetch ("http://localhost:5000/todos",{
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    
    window.location = "/"
    console.log(response);  
    
  } catch (err) {
    
    console.error(err.message)    
  
  }
}

  return (
   <Fragment>
    <h1 classname ="text-center mt-5"> My Todos </h1>
    <form className="d-flex mt-5" onSubmit={onSubmitForm}>


<button 
type="button" 
className="btn btn-warning" 
data-toggle="modal" 
data-target= { "#myModal" }
>

  Add Todo
</button>


  <div 
   class="modal" id="myModal">
    <div class="modal-dialog">
      <div class="modal-content">
      
        {/* <!-- Modal Header --> */}
        <div class="modal-header">
          <h4 class="modal-title">Add New</h4>
          <button type="button" class="close" data-dismiss="modal">&times;</button>
        </div>
        
        {/* <!-- Modal body --> */}
        <div class="modal-body">
        <input type="text" placeholder="Description" value={description} onChange={e=> setDescription(e.target.value)} className="form-control" />
  <br />
  <input type="text" placeholder="Assignto" value={assignto} onChange={e=> setAssignto (e.target.value)} className="form-control" />
 <br />

        </div>
        
        {/* <!-- Modal footer --> */}
        <div class="modal-footer">
        <button className="btn btn-success">Save todo</button>
        <button type="button" class="btn btn-danger" data-dismiss="modal" onClick={() => {setDescription(""); setAssignto("") } }>Close</button>
        </div>
        
      </div>
    </div>
  </div>
  






  
</form>
    
   </Fragment>
  );
}

export default InputTodo
