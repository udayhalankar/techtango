import React, { useState, useEffect } from 'react';
import { DataGrid, GridToolbar, GridColDef, GridValueGetterParams} from "@mui/x-data-grid";
import Box from '@mui/material/Box';
import { red } from '@mui/material/colors';
import { Link } from "react-router-dom";
import "./datatable.scss";
import EditTodo from '../EditTodos';
import { Mutation, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Props = {
    columns: GridColDef[];
    rows: object[];
    slug: string;
}

const DataTable = (props: Props) => {
//const queryClient = useQueryClient();

  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);


  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (id: number) => {
      // return fetch(`http://localhost:5000/${props.slug}/${id}`, {
        return fetch(`http://localhost:5000/${props.slug}/${id}`, {
        method: "delete",
      });
    },
    onSuccess: ()=>{
      queryClient.invalidateQueries([`all${props.slug}`]);
    }
  });
    
    //delete 
    // const handleDelete = async (id) => {
    //     try {
            
    //         const deleteUser = await fetch(`http://localhost:5000/users/${id}`, {
    //             method: "DELETE"
    //         });
            
    //         setUsers(users.filter(user => user.id !== id));
    //         // console.log(id + "has been deleted")
    //         alert(id+"has been deleted")
    //     } catch (err) {

    //         console.error(err.message);
            
    //     }
    // }

    const handleDelete = (id:Number) => {
    //     //call delete api
    mutation.mutate(id)
    console.log(id + "has been deleted")
     }

    const actionColumn:GridColDef={
        field:"action",
        headerName:"Action",
        width:200,
        renderCell:(params)=>{
            return(
                <div className='action'>
                  {/* <EditTodo /> */}
                    <Link to={`/${props.slug}/${params.row.id}`}>
                    <img src="./view.svg" alt=""/>
                    </Link>
                    <div className="delete" onClick={() => handleDelete(params.row.id)}>
            <img src="/delete.svg" alt="" />
                    </div>
                </div>
            )
        }
    }   

  //Call api using below code
  // const [users, setUsers] = useState([])

  // useEffect(() => {
  //   fetch("http://localhost:5000/users")
  //     .then((data) => data.json())
  //     .then((data) => setUsers(data))

  // }, [])

  // console.log(users)

  return (
    <div className='dataTable' >
      <Box sx={{ height: '100%', width: '100%' }}>
      <DataGrid className='dataGrid'   
        rows={props.rows}
        columns={[...props.columns, actionColumn]}
        pageSize={10}
        initialState={{
          pagination: {
            paginationModel: {
              pageSize: 10,
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

export default DataTable