// import React, { fragment, useState } from 'react';
import React, { Fragment, useState } from "react";
import './App.css';
import InputTodo from './components/InputTodo';
import ListTodos from './components/ListTodos';
import Navbar  from './components/navbar/Navbar';
import Footer from './components/footer/Footer';
import Menu from './components/menu/Menu';
import Home from './pages/home/Home';
import Users from './pages/users/Users';
import User from "./pages/users/User";
import Assignments from "./pages/assignments/Assignments";
import Tenants from "./pages/tenant/Tenants";
import Subtenants from "./pages/subtenants/Subtenants";
import Login from "./pages/login/Login";
import Dms from "./pages/dms/Dms";
import "./styles/global.scss";
import Rms from "./pages/rms/Rms";
import Bpm from "./pages/bpm/Bpm";
import Mrm from "./pages/mrm/Mrm";
import Sbforms from "./pages/sbforms/Sbforms";
import Rmsrequest from "./pages/rmsrequest/Rmsrequest";
import Cm from "./pages/cm/Cm";
import Dak from "./pages/dak/Dak";
import Ccm from "./pages/ccm/Ccm";
import Docucontrol from "./pages/docucontrol/Docucontrol";
import {  createBrowserRouter, RouterProvider,  Outlet } from "react-router-dom";
import Dashboardmain from "./pages/dashboardmain/Dashboardmain";
import { Mutation, useMutation, useQuery, useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query";



 {/* QueryClient Code */}
const queryClient = new QueryClient();

function App() {

  const Layout = () => {
     
    return (       
      <div className="main">

        <Navbar />
        
        <div className="container">
          

          
        <div className="menuContainer">
          <Menu />
       
        </div>
          <div className="contentContainer">

            {/* QueryClient Code */}
          <QueryClientProvider client={queryClient}>
        
          <Outlet />
     
          </QueryClientProvider>
           
          
          </div>
        </div>
  
        <Footer />
      </div>
    );
  };



  

//below code call displays the conponent on the right hand side instead of opening it as a new window
  const router = createBrowserRouter([
   
    {
     
      path: "/",
      element: <Layout />,
      children: [
        {
          path: "/",
          element: <Home />,
        },
        {
          path: "/dashboard",
          element: <Dashboardmain />,
        },
        {
          path: "/assignments",
          element: <Assignments />,
        },
        {
          path: "/tenants",
          element: <Tenants />,
        },

        {
          path: "/subtenants",
          element: <Subtenants />,
        },

        {
          path: "/mrm",
          element: <Mrm />,
        },
        
        {
          path: "/users",
          element: <Users />,
        }
        ,
        {
          path: "/rmsrequest",
          element: <Rmsrequest />,
        }
        ,
        
        {
          path: "/users/:id",
          element: <User />,
        }
        
      ]
    },







    



    {
      path:"/login",
      element: <Login />,
    },
    {
      path: "/dms",
      element: <Dms />,
    },
    {
      path: "/rms",
      element: <Rms />,
    },
    
    {
      path: "/mrm",
      element: <Mrm />,
    },
    {
      path: "/Sbforms",
      element: <Sbforms />,
    },
    {
      path: "/cm",
      element: <Cm />,
    },
    {
      path: "/dak",
      element: <Dak />,
    },
    {
      path: "/ccm",
      element: <Ccm />,
    },
    {
      path: "/tenants",
      element: <Tenants />,
    },
    {
      path: "/subtenants",
      element: <Subtenants />,
    },
    {
      path: "/docucontrol",
      element: <Docucontrol />,
    }

    ]);
    
    
    return <RouterProvider router={router} />;
    
}

export default App;
