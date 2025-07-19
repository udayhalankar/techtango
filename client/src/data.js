// import { mapFinderOptions } from "sequelize/types/utils";
import React, { Fragment, useEffect, useState } from 'react';
import { AiFillHome } from "react-icons/ai";
import { AiOutlineForm } from "react-icons/ai";
import { VscServerProcess } from "react-icons/vsc";
import { AiFillCreditCard } from "react-icons/ai";
import { AiOutlineDiff } from "react-icons/ai";
import { PiHandshakeFill } from "react-icons/pi";
import { FaWpforms } from "react-icons/fa6";
import { IoFileTrayStacked } from "react-icons/io5";
import { TbMailbox } from "react-icons/tb";
import { SiGotomeeting } from "react-icons/si";
import { MdSendTimeExtension } from "react-icons/md";
import { MdAdminPanelSettings } from "react-icons/md";
import { FaUsersCog } from "react-icons/fa";
import { LiaFileInvoiceDollarSolid } from "react-icons/lia";
import { RiDatabaseLine } from "react-icons/ri";
import { TbReportSearch } from "react-icons/tb";
import { MdAssignmentTurnedIn } from "react-icons/md";
import { MdOutlineDashboardCustomize } from "react-icons/md";
import Tenant from './pages/tenant/Tenant';
import Tenants from './pages/tenant/Tenants';


export const menu = [
    {
    id: 1,
   
    
    ListItems: [
        {
            id: 1,
            title: "Homepage",
            url: "/",                       
            icon: <AiFillHome />,
        },
        {
            id: 2,
            title: "Dashboard",
            url: "/bpm/Dashboard", 
            icon: <MdOutlineDashboardCustomize />,
        },
        {
            id: 3,
            title: "Assignments",
            url: "/bpm/Assignments",                       
            icon: <MdAssignmentTurnedIn />,
        },
        
    ],

},
{
    id: 2,
    title: "Applications",
    ListItems: [
        {
            id: 1,
            title: "Document Mgmt",
            url: "/dms",
           icon: <AiOutlineDiff />,
        },
        {
            id: 2,
            title: "Records Mgmt",
            url: "/rms",
            icon: <AiFillCreditCard />,
        },
        {
            id: 3,
            title: "Business Process Mgmt",
            url: "/bpm",
            icon: <VscServerProcess />,
        },
        {
            id: 4,
            title: "Meeting Room Mgmt",
            url: "/mrm",
            icon: <SiGotomeeting />,
        },
        {
            id: 5,
            title: "Smart Forms",
            url: "/bpm/Sbforms",
            icon: <FaWpforms />,
        },
        {
            id: 6,
            title: "Case Management",
            url: "/cm",
            icon: <IoFileTrayStacked />,
        },
        {
            id: 7,
            title: "DAK Management",
            url: "/dak",
            icon: <TbMailbox />,
        },
        
        {
            id: 8,
            title: "Customer Com. Mgmt",
            url: "/ccm",
            icon: <MdSendTimeExtension />,
        },
        {
            id: 9,
            title: "Document Controlling",
            url: "/docucontrol",
            icon: <AiFillCreditCard />,
        },
    ],

},

{
    id: 3,
    title: "General",
    ListItems: [
        {
            id: 1,
            title: "Administration",
            url: "/admin",
            icon: <MdAdminPanelSettings />,
        },
        {
            id: 2,
            title: "Tenants",
            url: "/tenants",
            icon: <FaUsersCog />,
        },
        {
            id: 3,
            title: "Subtenants",
            url: "/subtenants",
            icon: <FaUsersCog />,
        },
        {
            id: 4,
            title: "Users",
            url: "/users",
            icon: <FaUsersCog />,
        },
        {
            id: 5,
            title: "Roles Mgmt",
            url: "/roles",
            icon: <FaUsersCog />,
        },
        
        {
            id: 6,
            title: "Billing",
            url: "/bill",
            icon: <LiaFileInvoiceDollarSolid />,
        },       
        
        {
            id: 7,
            title: "Data Management",
            url: "/dm",
            icon: <RiDatabaseLine />,
        },        
        
        {
            id: 8,
            title: "Reports",
            url: "/rpts",
            icon: <TbReportSearch />,
        },
    ],

}






// {
//     id: 4,
//     title: "Maintenence",
//     ListItems: [
//         {
//             id: 1,
//             title: "Homepage",
//             url: "/",
//             icon: <i class="material-icons">home</i>,
//         },
//         {
//             id: 2,
//             title: "Profile",
//             url: "/",
//             icon: <i class="material-icons">person2</i>,
//         },
//     ],

// },


];

export const singleUser = {
    id: 1,
    title: "John Doe",
    img: "https://images.pexels.com/photos/17397364/pexels-photo-17397364.jpeg?auto=compress&cs=tinysrgb&w=1600&lazy=load",
    info: {
      username: "Johndoe99",
      fullname: "John Doe",
      email: "johndoe@gmail.com",
      phone: "123 456 789",
      status: "verified",
    },
    chart: {
      dataKeys: [
        { name: "visits", color: "#82ca9d" },
        { name: "clicks", color: "#8884d8" },
      ],
      data: [
        {
          name: "Sun",
          visits: 4000,
          clicks: 2400,
        },
        {
          name: "Mon",
          visits: 3000,
          clicks: 1398,
        },
        {
          name: "Tue",
          visits: 2000,
          clicks: 3800,
        },
        {
          name: "Wed",
          visits: 2780,
          clicks: 3908,
        },
        {
          name: "Thu",
          visits: 1890,
          clicks: 4800,
        },
        {
          name: "Fri",
          visits: 2390,
          clicks: 3800,
        },
        {
          name: "Sat",
          visits: 3490,
          clicks: 4300,
        },
      ],
    },
    activities: [
      {
        text: "John Doe purchased Playstation 5 Digital Edition",
        time: "3 day ago",
      },
      {
        text: "John Doe added 3 items into their wishlist",
        time: "1 week ago",
      },
      {
        text: "John Doe purchased Sony Bravia KD-32w800",
        time: "2 weeks ago",
      },
      {
        text: "John Doe reviewed a product",
        time: "1 month ago",
      },
      {
        text: "John Doe added 1 items into their wishlist",
        time: "1 month ago",
      },
      {
        text: "John Doe reviewed a product",
        time: "2 months ago",
      },
    ],
  };
  export const singleProduct = {
    id: 1,
    title: "Playstation 5 Digital Edition",
    img: "https://store.sony.com.au/on/demandware.static/-/Sites-sony-master-catalog/default/dw1b537bbb/images/PLAYSTATION5W/PLAYSTATION5W.png",
    info: {
      productId: "Ps5SDF1156d",
      color: "white",
      price: "$250.99",
      producer: "Sony",
      export: "Japan",
    },
    chart: {
      dataKeys: [
        { name: "visits", color: "#82ca9d" },
        { name: "orders", color: "#8884d8" },
      ],
      data: [
        {
          name: "Sun",
          visits: 4000,
          orders: 2400,
        },
        {
          name: "Mon",
          visits: 3000,
          orders: 1398,
        },
        {
          name: "Tue",
          visits: 2000,
          orders: 3800,
        },
        {
          name: "Wed",
          visits: 2780,
          orders: 3908,
        },
        {
          name: "Thu",
          visits: 1890,
          orders: 4800,
        },
        {
          name: "Fri",
          visits: 2390,
          orders: 3800,
        },
        {
          name: "Sat",
          visits: 3490,
          orders: 4300,
        },
      ],
    },
    activities: [
      {
        text: "John Doe purchased Playstation 5 Digital Edition",
        time: "3 day ago",
      },
      {
        text: "Jane Doe added Playstation 5 Digital Edition into their wishlist",
        time: "1 week ago",
      },
      {
        text: "Mike Doe purchased Playstation 5 Digital Edition",
        time: "2 weeks ago",
      },
      {
        text: "Anna Doe reviewed the product",
        time: "1 month ago",
      },
      {
        text: "Michael Doe added Playstation 5 Digital Edition into their wishlist",
        time: "1 month ago",
      },
      {
        text: "Helen Doe reviewed the product",
        time: "2 months ago",
      },
    ],
  };

