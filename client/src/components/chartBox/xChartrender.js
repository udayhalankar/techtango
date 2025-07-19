import React, { useEffect, useState } from "react";
// import ChartBox from "./xChartBox"


// import { Link } from "react-router-dom";
import "./chartBox.scss";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";


export default function Chartrender() {
    const [todo, settodo] = useState();
  
    useEffect(() => {
      const fetchDatas = async () => {
        const res = await fetch("http://localhost:5000/todos");
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
        How to use Recharts with React
        <ChartBox todo={todo} />
      </div>
    );
  }

 function ChartBox({ todo }) {
    return (
      <ResponsiveContainer width="100%" height={400} data={todo}>
        <BarChart
          data={todo}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="assignto" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="assignto" fill="#8884d8" />
        <Bar dataKey="description" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    );
  }