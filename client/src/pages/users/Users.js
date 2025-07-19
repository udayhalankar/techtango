import React, { useState } from 'react';
import DataTable from '../../components/datatable/DataTable';
import "./users.scss";
import Usersadd from './Usersadd';
import { useQuery } from "@tanstack/react-query";
import { GridColDef } from "@mui/x-data-grid";

// Define your columns
const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 20 },
  { field: 'firstname', headerName: 'First Name', width: 150 },
  { field: 'lastname', headerName: 'Last Name', width: 150 },
  { field: 'email', headerName: 'Email', width: 150 },
  { field: 'phone', headerName: 'Phone', width: 150 },
];

const Users = () => {
  const [open, setOpen] = useState(false);

  const { isLoading, error, data } = useQuery({
    queryKey: ["allusers"],
    queryFn: () =>
      fetch("http://localhost:5000/api/users").then((res) => res.json()),
  });

  // Defensive fallback: ensure rows is always an array
  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="users">
      <div className="info">
        <h3>Users</h3>
        <Usersadd />
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : error ? (
        <p>Failed to load users.</p>
      ) : (
        <DataTable slug="users" columns={columns} rows={rows} />
      )}
    </div>
  );
};

export default Users;
