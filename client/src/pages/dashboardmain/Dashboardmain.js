import React from 'react';
import "./dashboardmain.scss";
import Topbox from '../../components/topbox/Topbox';
// import Chartrender from '../../components/chartBox/xChartrender';
import ChartBox from '../../components/chartBox/ChartBox';
// import ListTodos from '../../components/ListTodos';

export const Dashboardmain = () => {
  return (
    <div className="dashboardmain">
        <div className="box box1">
        <Topbox />       
        </div>
        <div className="box box2">ChartBox1
        <ChartBox />
        </div>  
        <div className="box box3">ChartBox2
        <ChartBox />
        </div>  
        <div className="box box4">Leads by Source2
        <ChartBox />
        </div>  
        <div className="box box5">ChartBox3
        <ChartBox />
        </div>  
        <div className="box box6">ChartBox4
        <ChartBox />
        </div>   
        <div className="box box7"><ChartBox /></div>  
        <div className="box box8"><ChartBox /></div>  
        <div className="box box9"><ChartBox /></div>      
    </div>

  )
}

export default Dashboardmain;