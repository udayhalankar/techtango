import React, { useState, useEffect } from 'react';
import Single from "../../components/single/Single";
import { Link, useParams } from "react-router-dom";
import "../../components/single/single.scss";
import Axios from 'axios';
//import { singleUser } from "../../data"
import "./user.scss"
import { apiUrl } from "../../../services/urls";

  export const User = () => {

    const { id } = useParams();


    const [singleUser, setsingleUser] = useState({});

    

    useEffect(() => {
        fetch(apiUrl(`/users/${id}`)).then((res) => {
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
            {/* <div className="details">
              {Object.entries(singleUser.info).map((item) => (
                <div className="item" key={item[0]}>
                  <span className="itemTitle">{item[0]}</span>
                  <span className="itemValue">{item[1]}</span>
                </div>
              ))}
            </div> */}
          </div>
          <hr />
          
        </div>
       
      </div>
    );
  
   

  //   return (
  //     <div className="user">
  //       <Single {...singleUser}/>
  //     </div>
  //   )
   
  //  //Working Code
  //   return (
  //       <div>
  //           {/* <div className="row">
  //               <div className="offset-lg-3 col-lg-6"> */}

  //              <div className="container">
                
  //           <div className="card row" style={{ "textAlign": "left" }}>
  //               <div className="card-title">
  //                   <h2>Employee Create</h2>
  //               </div>
  //               <div className="card-body"></div>

  //               {singleUser &&
  //                   <div>
  //                       <h2>The Employee name is : <b>{singleUser.firstname}</b>  ({singleUser.id})</h2>
  //                       <h3>Contact Details</h3>
  //                       <h5>Lastname : {singleUser.lastname}</h5>
                        
  //                   </div>
  //               }
  //           </div>
  //           </div>
  //           {/* </div>
  //           </div> */}
  //       </div >
  //   );

  
}

export default User
