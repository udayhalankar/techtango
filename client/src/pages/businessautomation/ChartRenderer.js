// src/components/ChartRenderer.js
import React from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

export default function ChartRenderer({ config, data }) {
  if (!config || !data) return null;
  const { type, mapping } = config;
  const { categoryField, valueField, xField, yField, series=[] } = mapping || {};

  if (type === "pie") {
    const COLORS = data.map((_,i)=>`hsl(${(i*47)%360} 70% 50%)`);
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Tooltip /><Legend />
          <Pie data={data} dataKey={valueField} nameKey={categoryField} label>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "scatter") {
    // Simple line-like fallback for MVP
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey={xField} /><YAxis />
          <Tooltip /><Legend />
          <Line type="monotone" dataKey={yField} dot />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === "radar") {
    return (
      <ResponsiveContainer width="100%" height={360}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey={categoryField} />
          <PolarRadiusAxis />
          <Legend /><Tooltip />
          {series.map((s,i)=><Radar key={i} name={s.label} dataKey={s.valueField} stroke={s.color} fill={s.color} fillOpacity={0.5} />)}
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <XAxis dataKey={categoryField} /><YAxis />
          <Tooltip /><Legend />
          {series.map((s,i)=><Area key={i} type="monotone" dataKey={s.valueField} name={s.label} stroke={s.color} fill={s.color} />)}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey={categoryField} /><YAxis />
          <Tooltip /><Legend />
          {series.map((s,i)=><Line key={i} type="monotone" dataKey={s.valueField} name={s.label} stroke={s.color} dot={false} />)}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // default: bar
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey={categoryField} /><YAxis />
        <Tooltip /><Legend />
        {series.map((s,i)=><Bar key={i} dataKey={s.valueField} name={s.label} fill={s.color} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}



// //COMPLETE WORKING CODE - NO ISSUES - COMMENTED SINCE NEW ENHANCMENTS ARE BEING ADDED
// // src/components/ChartRenderer.js
// import React from "react";
// import {
//   BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend,
//   PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area,
//   RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
// } from "recharts";

// export default function ChartRenderer({ config, data }) {
//   if (!config || !data) return null;
//   const { type, mapping } = config;
//   const { categoryField, valueField, xField, yField, series=[] } = mapping || {};

//   if (type === "pie") {
//     const COLORS = data.map((_,i)=>`hsl(${(i*47)%360} 70% 50%)`);
//     return (
//       <ResponsiveContainer width="100%" height={300}>
//         <PieChart>
//           <Tooltip /><Legend />
//           <Pie data={data} dataKey={valueField} nameKey={categoryField} label>
//             {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
//           </Pie>
//         </PieChart>
//       </ResponsiveContainer>
//     );
//   }

//   if (type === "scatter") {
//     // Simple line fallback for MVP
//     return (
//       <ResponsiveContainer width="100%" height={300}>
//         <LineChart data={data}>
//           <XAxis dataKey={xField} /><YAxis />
//           <Tooltip /><Legend />
//           <Line type="monotone" dataKey={yField} dot />
//         </LineChart>
//       </ResponsiveContainer>
//     );
//   }

//   if (type === "radar") {
//     return (
//       <ResponsiveContainer width="100%" height={360}>
//         <RadarChart data={data}>
//           <PolarGrid />
//           <PolarAngleAxis dataKey={categoryField} />
//           <PolarRadiusAxis />
//           <Legend /><Tooltip />
//           {series.map((s,i)=><Radar key={i} name={s.label} dataKey={s.valueField} stroke={s.color} fill={s.color} fillOpacity={0.5} />)}
//         </RadarChart>
//       </ResponsiveContainer>
//     );
//   }

//   if (type === "area") {
//     return (
//       <ResponsiveContainer width="100%" height={300}>
//         <AreaChart data={data}>
//           <XAxis dataKey={categoryField} /><YAxis />
//           <Tooltip /><Legend />
//           {series.map((s,i)=><Area key={i} type="monotone" dataKey={s.valueField} name={s.label} stroke={s.color} fill={s.color} />)}
//         </AreaChart>
//       </ResponsiveContainer>
//     );
//   }

//   if (type === "line") {
//     return (
//       <ResponsiveContainer width="100%" height={300}>
//         <LineChart data={data}>
//           <XAxis dataKey={categoryField} /><YAxis />
//           <Tooltip /><Legend />
//           {series.map((s,i)=><Line key={i} type="monotone" dataKey={s.valueField} name={s.label} stroke={s.color} dot={false} />)}
//         </LineChart>
//       </ResponsiveContainer>
//     );
//   }

//   // default bar
//   return (
//     <ResponsiveContainer width="100%" height={300}>
//       <BarChart data={data}>
//         <XAxis dataKey={categoryField} /><YAxis />
//         <Tooltip /><Legend />
//         {series.map((s,i)=><Bar key={i} dataKey={s.valueField} name={s.label} fill={s.color} />)}
//       </BarChart>
//     </ResponsiveContainer>
//   );
// }
// //COMPLETE WORKING CODE - NO ISSUES - COMMENTED SINCE NEW ENHANCMENTS ARE BEING ADDED