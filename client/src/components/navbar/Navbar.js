import React from 'react';
import "./navbar.scss";
import Image from './ttlogo.png';
import { BsSearch, BsLifePreserver, BsBoxes, BsBell } from "react-icons/bs";
import { AiFillSetting } from "react-icons/ai";
import { Link } from 'react-router-dom';

const firstname = localStorage.getItem("firstname");
const picture = localStorage.getItem("picture");

const Navbar = () => {
  return (
    <div className="navbar">
      <div className="logo">
        <img src={Image} alt="logo" className="logo-img" />
       
      </div>

      <div className="icons">
        <BsSearch />
        <BsBoxes />
        <BsLifePreserver />

        <div className="notification">
          <BsBell />
        </div>

        <div className="user-info">
          {picture && <img src={picture} alt="Profile" className="avatar" />}
          {firstname && <span className="username">Hi, {firstname}</span>}
        </div>

        <AiFillSetting />

        <Link to="/logout" className="logout-link">Logout</Link>
      </div>
    </div>
  );
};

export default Navbar;
