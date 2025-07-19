import React, { useState, useEffect } from 'react';
import Single from "../../components/single/Single";
import { Link, useParams } from "react-router-dom";
import "../../components/single/single.scss";
import Axios from 'axios';
import "./rmsrequest.scss"

  export const Rmsrequest = () => {

    const { id } = useParams();


    const [singleUser, setsingleUser] = useState({});

    

    useEffect(() => {
        fetch("http://localhost:5000/users/" + id).then((res) => {
            return res.json();
        }).then((resp) => {
            setsingleUser(resp);
        }).catch((err) => {
            console.log(err.message);
        })
    }, []);




    return (
      <div className="single">
        <div className="view">
          <div className="info">
            <div className="topInfo">
              {/* {props.img && <img src={props.img} alt="" />} */}
              <h1>{singleUser.firstname}</h1>
              {alert(singleUser.info)}
              <button>Update</button>
            </div>
           
          </div>
          <hr />
          
        </div>
       
      </div>
    );
  
   

  

  
}

export default Rmsrequest