import React, { Fragment, useState } from 'react';
import { apiUrl } from "../../../services/urls";


const Usersadd = () => {

  const [firstname, setFirstname] = useState("");
  const [email, setEmail] = useState("");

const onSubmitForm = async (e) => {
e.preventDefault();
  try {
    
    const body = {firstname, email};
    const response = await fetch(apiUrl("/users"),{
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    
    window.location = "/users"
    console.log(response);  
    
  } catch (err) {
    
    console.error(err.message)    
  
  }
}

  return (
   <Fragment>
    {/* <h1 classname ="text-center mt-5"> My Todos </h1> */}
    <form className="d-flex mt-0" onSubmit={onSubmitForm}>


<button 
type="button" 
className="btn btn-warning" 
data-toggle="modal" 
data-target= { "#myModal" }
>

  Add New User
</button>


  <div 
   class="modal" id="myModal">
    <div class="modal-dialog">
      <div class="modal-content">
      
        {/* <!-- Modal Header --> */}
        <div class="modal-header">
          <h4 class="modal-title">Add New User</h4>
          <button type="button" class="close" data-dismiss="modal">&times;</button>
        </div>
        
        {/* <!-- Modal body --> */}
        <div class="modal-body">
        <input type="text" placeholder="FirstName" value={firstname} onChange={e=> setFirstname(e.target.value)} className="form-control" />
  <br />
  <input type="text" placeholder="Email" value={email} onChange={e=> setEmail (e.target.value)} className="form-control" />
 <br />

        </div>
        
        {/* <!-- Modal footer --> */}
        <div class="modal-footer">
        <button className="btn btn-success">Save User</button>
        <button type="button" class="btn btn-danger" data-dismiss="modal" onClick={() => {setFirstname(""); setEmail("") } }>Close</button>
        </div>
        
      </div>
    </div>
  </div>
  
  
</form>
    
   </Fragment>
  );
}

export default Usersadd;
