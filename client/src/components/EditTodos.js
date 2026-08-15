import React, { Fragment, useState } from "react";
import { apiUrl } from "../services/urls";

const EditTodo = ({ todo }) => {
    const [description, setDescription] = useState(todo.description);
    const [assignto, setAssignto] = useState(todo.assignto);


//Edit description function
const updateDescription = async e => {

  e.preventDefault();
  try {

    const body = { description, assignto };
    const response = await fetch(apiUrl(`/todos/${todo.todo_id}`), {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(body)
    } )
    
    console.log(response);
    window.location = "./"

  } catch (err) {
    console.error(err.message)
    
  }
}

    return <Fragment>
        {/* Button to Open the Modal */}
<button 
type="button" 
className="btn btn-warning" 
data-toggle="modal" 
data-target= { `#id${todo.todo_id}` }
>

  Edit 
</button>

{/* 
id=id10
*/}

<div 
class="modal" 
id={ `id${todo.todo_id}` }
onClick={() => {setDescription(todo.description); setAssignto(todo.assignto) } }
>
  <div class="modal-dialog">
    <div class="modal-content">

      {/* Modal Header */}
      <div class="modal-header">
        <h4 class="modal-title">Edit description</h4>
        <button type="button" class="close" data-dismiss="modal"  
        onClick={() => {setDescription(todo.description); setAssignto(todo.assignto) } } >&times;</button>
      </div>

      {/* Modal body */}
      <div class="modal-body">
        <input type="text" className="form-control" value={description} onChange={(e) => setDescription(e.target.value)}  onClick2={(e) => setDescription(e.target.value)}/>
        <input type="text" className="form-control" value={assignto} onChange={(e) => setAssignto(e.target.value)}  onClick2={(e) => setAssignto(e.target.value)}/>
      </div>

      {/* Modal footer */}
      <div class="modal-footer">
        <button 
        type="button" 
        class="btn btn-warning" 
        data-dismiss="modal"
        onClick={e => updateDescription(e)}
        >Edit</button>
        <button type="button" class="btn btn-danger" data-dismiss="modal" onClick={() => {setDescription(todo.description); setAssignto(todo.assignto) }  }>Close</button>
      </div>

    </div>
  </div>
</div>
    </Fragment>;
}

export default EditTodo;
