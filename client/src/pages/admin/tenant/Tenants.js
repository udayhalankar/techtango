import React, { useState, useEffect } from 'react';
import DataTable from '../../../components/datatable/DataTable';
import "./tenants.scss";
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import 'bootstrap/dist/css/bootstrap.css';
// import DataGrid1 from '../../components/datatable/XXDataGrid1';
import { Margin } from '@mui/icons-material';
import { Grid } from '@mui/material';
import InputTodo from '../../../components/InputTodo';
import EditTodo from '../../../components/EditTodos';
// import Add from '../../components/add/Add';
import { useQuery } from "@tanstack/react-query";
import Usersadd from '../users/Usersadd';
import { GridColDef } from "@mui/x-data-grid";
import Topbox from '../../../components/topbox/Topbox';
import { apiUrl } from "../../../services/urls";




const columns: GridColDef[] = [
{ field: 'id', headerName: 'ID', width: 20 },
  //{ field: 'fullname', headerName: 'FullName', width: 150, valueGetter: (params: GridValueGetterParams) => `${params.row.firstname || ""} ${params.row.lastname || ""}`},
{ field: 'tenantname', value: 'tenantname',  headerName: 'tenantname', type: 'string', width: 150, editable: false },
{ field: 'lastname', headerName: 'lastname', type: 'string', width: 150, editable: false },
  { field: 'email', headerName: 'email', width: 150, editable: false },
  { field: 'phone', headerName: 'phone' },
  // { field: 'created_by', headerName: 'Created By' },
  // { field: 'updated_at', headerName: 'Last Modified' },

]

const Tenants = () => {

  const [open, setOpen] = useState(false);

  // TEST THE API
  const [users, setUsers] = useState([])
  const { isLoading, data } = useQuery({
    
    queryKey: ["allusers"],
    queryFn: () =>
      fetch(apiUrl("/tenants")).then(
        (res) => res.json()
      ),
  });

  return (
    <div className="users">
      <div className="info">
        <h3>Users</h3>
        <Usersadd />
        {/* <button onClick={() => setOpen(true)}>Add New User</button> */}
      </div>
     
      {/* <DataTable slug="users" columns={columns} rows={data} /> */}
      {/* TEST THE API */}

      {isLoading ? (
        "Loading..."
      ) : (
        <DataTable slug="users" columns={columns} rows={data} />
      )}
      {/* {open && <Add slug="users" columns={columns} setOpen={setOpen} />} */}
    </div>
  );



















// Working Code

//   const [open, setOpen] = useState(false);
//   const [users, setUsers] = useState([])

//   useEffect(() => {
//     fetch("http://localhost:5000/users")
//       .then((data) => data.json())
//       .then((data) => setUsers(data))

//   }, [])

//   console.log(users)

//     return (        
//         <div className="users">
//             <div className='box'>           
//             <div>
//             <div className='buttonaddnew'> 
//                 <h5>Users</h5>
//                 <br /> 
                
//                 <button className='info' onClick={() => setOpen(true)}>Add New User</button>
//               {/* <Button variant="contained"  sx={{ml: 2}} >Add New</Button> */}
//              {/* <button class="btn btn-primary" data-toggle="modal" data-target="#myModal">
//     Add New
//   </button> */}
//                 </div>
//             </div>
       
//             <div class="container">

//   {/* <!-- Button to Open the Modal --> */}
   
// </div>
                      
//             {/* <DataGrid1 /> */}
//             {/* <InputTodo /> */}
//             <DataTable slug="users" columns={columns} rows={users} />
//             {open && <Add slug="user" columns={columns} setOpen={setOpen} />}
//             </div>
//         </div>
         
//     )
}

export default Tenants;
