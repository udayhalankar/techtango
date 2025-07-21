import React, { useEffect, useState } from "react";
// import ChartBox from "./xChartBox"
import { Link } from "react-router-dom";
import "./chartBox.scss";

import {  BarChart,Bar, XAxis, YAxis,  CartesianGrid,  Tooltip,  Legend,  ResponsiveContainer} from "recharts";


export default function ChartBox() {
    const [todo, settodo] = useState();
  
    useEffect(() => {
      const fetchDatas = async () => {
        const res = await fetch("http://localhost:5000/api/todos");
        const todo = await res.json();
        console.log(todo);
        //used below site for reference and in the example the ?.data referers to 
        //the data in json output but same is not relevant in todos 
        //https://dev.to/femi_dev/how-to-create-a-chart-in-react-with-recharts-2b58
        // settodo(todo?.data);        
        settodo(todo);
      };
      fetchDatas();
    }, []);
  
    return (
      <div >
       {/* <h6>How to use Recharts with React</h6>  */}
        <Chartrndr todo={todo} />
      </div>
    );
  }

 function Chartrndr({ todo }) {
    return (

      <div className='chartBox'>
        <div className='boxInfo'>
            <div className='title'>
            
                <img src="/user.svg" alt='' />
                {/* <span>Total Users</span> */}
            </div>
            {/* <h3>11.238</h3> */}
            <Link to="/">View All</Link>
        </div>
        <div className='chartinfo'>
        <div className='chart'>

        
      <ResponsiveContainer width="99%" height={125} data={todo}>
        <BarChart
          data={todo}
          margin={{
            top: 5,
            right: 0,
            left: 5,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="description" />
        <YAxis />
        <Tooltip 
        contentStyle={{background: "opague"}}
        />
        <Legend />
        <Bar dataKey="assignto" fill="#8884d8" />
        <Bar dataKey="description" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>           
     </div>
    
    <div className='texts'>
    <span className="percentage"> 45%</span>
    <span className="duration"> This month</span> 
    </div>
    </div>
    </div>
    );
  }