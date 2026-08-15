import React, { useState, useEffect } from 'react';
import { DataGrid, GridToolbar, GridColDef, GridValueGetterParams} from "@mui/x-data-grid";
import Box from '@mui/material/Box';
import { red } from '@mui/material/colors';
import "./datatable.scss";
import { apiUrl } from "../../services/urls";
const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 20 },
  { field: 'tenantname', headerName: 'tenantname'},
  // { field: 'middlename', headerName: 'middlename'},
  // { field: 'lastname', headerName: 'LastName' },
  // { field: 'tenantname', headerName: 'TenantName', width: 200, valueGetter: (params: GridValueGetterParams) => `${params.row.firstname || ""} ${params.row.lastname || ""}`},
  { field: 'contactperson', headerName: 'contactperson', width: 150, editable: false },
  { field: 'phone', headerName: 'phone' },
  { field: 'created_by', headerName: 'Created By' },
  { field: 'created_at', headerName: 'Date Created' },
  // { field: 'updated_by', headerName: 'Updated By' },
  { field: 'updated_at', headerName: 'Last Modified' },
  {field: 'action', headerName: "Actions", width: 300,
renderCell: (params) => {
  return <div className='action'>
  <div className='details'>Details</div>
  <div className='edit'>Edit</div>
  <div className='delete'>Delete</div>
  </div>
}
}
]

const DataGrid1 = () => {

  const [users, setUsers] = useState([])

  useEffect(() => {
    fetch(apiUrl("/tenants"))
      .then((data) => data.json())
      .then((data) => setUsers(data))

  }, [])

  console.log(users)

  return (
    <div className='dataTable' >
      <Box sx={{ height: '100%', width: '105%' }}>
      <DataGrid className='dataGrid'
   
        rows={users}
        columns={columns}
        pageSize={12}
        initialState={{
          pagination: {
            paginationModel: {
              pageSize: 12,
            },
          },}}
          density="compact"
          slots={{toolbar:GridToolbar}}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: {debounce: 500},
              color: red,
            }
          }
           
          }
  
          pageSizeOptions={[5]}
          checkboxSelection
          disableRowSelectionOnClick
          disableColumnFilter          
          // disableColumnSelector
          disableDensitySelector
        />
      </Box>
    </div>
  )
}

export default DataGrid1
