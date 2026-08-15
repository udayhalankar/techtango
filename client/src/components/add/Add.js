import React, { Fragment, useState } from 'react';
import { GridColDef } from "@mui/x-data-grid";
import "./add.scss";
import "bootstrap/dist/css/bootstrap.min.css";
import { Mutation, useMutation, useMutationState, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "../../services/urls";


type Props = {
  slug: string;
  columns: GridColDef[];
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const Add = (props: Props) => { 


  // const [body, setBody] = useState("");
   const [value, setValue] = useState("");
   const[field, setField] = useState("");
  const [item, setItem] = useState("");
  const [key, setKey] = useState("");
  const body = {value};

// const change = event => {
//     setValue(event.target.value)    
// }


  const queryClient = useQueryClient();
    const mutation = useMutation({
      
      mutationFn: () => {
      return fetch(apiUrl(`/${props.slug}`), {
        method: "post",
   headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          
          email: value[0].email,
          firstname: value[0].firstname,
        }),
     
      });
      console.log(body)
    },
    onError: () => {
      alert("Error");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries([`all${props.slug}s`]);
    },
  });




  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    
    e.preventDefault();   
     

  //   //add new item
  alert(value)
  mutation.mutate();
  props.setOpen(false)
  };
  return (
    
    <div className="add">
   
      <div className="Modal">
      
        <span className="close" onClick={() => props.setOpen(false)}>
          X
        </span>
        <h1>Add new {props.slug}</h1> 
       <form onSubmit={handleSubmit}>
     
          {props.columns          

          
            .filter((item) => item.field !== "id" && item.field !== "img")
            .map((column) => (
               
              <div className="item"   key={key}>
                {/* key={item[0]} */}
                <label>{column.headerName}</label>
                <input 
                type={column.type} 
                placeholder={column.field}   
                value = {column.field.value}
                onChange={(e)=>
                  {
                    setValue(e.target.value)
                    
                  }}         
                   />
                
              </div>
            ))}
          <button className="btn btn-danger" width="50px">Send</button>
        </form>
      </div>
    </div>



  );
};

export default Add;
