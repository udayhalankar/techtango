// import React from 'react';
// import "./rms.scss";
// import ListTodos from '../../components/ListTodos';
// import InputTodo from '../../components/InputTodo';
// import Navbar  from '../../components/navbar/Navbar';
// import Footer from '../../components/footer/Footer';

// import ChartBox from '../../components/chartBox/ChartBox';
// import Topbox from '../../components/topbox/Topbox';
// import { AiOutlineDiff } from "react-icons/ai";
// import { Link } from "react-router-dom";
// import RmsMenu from '../../components/rmsMenu/RmsMenu';


// export const Rms = () => {
//   return (
// <div>
// {/* <Layout />   */}

// RMS 
// </div>
   
    
//   )
// }

// export default Rms;

// src/pages/Rms.js
import React from "react";
import { Link } from "react-router-dom";
import {
  MdPostAdd,          // Register new
  MdManageSearch,     // Search & Submit Request
  MdAssignmentTurnedIn, // Process Request
  MdInventory2,       // Material Request
  MdAssignment,       // RC Assignments
  MdSettings          // RM Configuration
} from "react-icons/md";
import "./rms.scss";

const Tile = ({ to, Icon, label }) => (
  <Link to={to} className="rms-tile" aria-label={label}>
    <div className="rms-tile-inner">
      <Icon className="rms-icon" aria-hidden="true" />
      <div className="rms-label">{label}</div>
    </div>
  </Link>
);

export default function Rms() {
  return (
    <div className="rms-wrap">
      <h1 className="rms-title">Physical Records Management</h1>
      <div className="rms-grid">
        <Tile to="/registernew"     Icon={MdPostAdd}          label="Register New File" />
        <Tile to="/submitrequest"   Icon={MdManageSearch}     label="Search & Submit Request" />
        <Tile to="/processrequest"  Icon={MdAssignmentTurnedIn} label="Process Request" />
        <Tile to="/materialrequest" Icon={MdInventory2}       label="Material Request" />
        <Tile to="/rcassignments"   Icon={MdAssignment}       label="RC Assignments" />
        {/* Link to the base; your router will handle /rmconfig/* children */}
        <Tile to="/rmconfig"        Icon={MdSettings}         label="RM Configuration" />
      </div>
    </div>
  );
}
