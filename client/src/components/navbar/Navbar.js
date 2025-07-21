import React from 'react';
import "./navbar.scss";
import Image from './ttlogo.png';
import { BsSearch } from "react-icons/bs";
import { BsLifePreserver } from "react-icons/bs";
import { BsBoxes } from "react-icons/bs";
import { BsBell } from "react-icons/bs";
import { AiFillSetting } from "react-icons/ai";
import { Link } from 'react-router-dom';

const firstname = localStorage.getItem("firstname");
const picture = localStorage.getItem("picture");

const Navbar = () => {
  return (
    <div className='navbar'>
      <div className="logo">
        <img src={Image} alt="logo"/>
        <span>Origin RMS by Techtango</span>
      </div>
<div className="icons">
  
<BsSearch />
<BsBoxes />
<BsLifePreserver />
<div className='notification'>
<BsBell />    
<div className="user-info">
          {/* <img 
          src="https://lh3.googleusercontent.com/ogw/AGvuzYbzV0pDdbjARQCfLno8g1OQfjmr5ct2vdNWNbF9MQ=s32-c-mo" 
          alt="" />
          <span> Uday</span> */}

          {picture && <img src={picture} alt="Profile" className="avatar" />}
          {firstname && <span className="username">Hi, {firstname}</span>}

        </div>
</div>
<AiFillSetting /> 

        
        <div>
          <Link to="/logout">Logout</Link>
        </div>
        
  </div>      
      </div>
  )
}

export default Navbar;