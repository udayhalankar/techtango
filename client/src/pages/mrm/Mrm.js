import React from 'react';
import "./mrm.scss";
import Topbox from '../../components/topbox/Topbox';
// import Chartrender from '../../components/chartBox/xChartrender';
import ChartBox from '../../components/chartBox/ChartBox';
// import ListTodos from '../../components/ListTodos';

export const Dashboardmain = () => {
  return (
    
    <div className="dashboardmain2">
     
        {/* <div className="box box1">
        <Topbox />       
        </div> */}
        <div className="bx bx0">Title
       
        </div>
        <div className="bx bx1">ChartBox1
        <div class="item1">1</div>
  <div class="item2">2</div>
  <div class="item3">3</div>  
  <div class="item4">4</div>
  <div class="item5">5</div>
  <div class="item6">6</div>
        {/* <ChartBox /> */}
        </div>  
        <div className="bx bx2">Assignments        <Topbox />  
        </div>  
        {/* <div className="box box4">Leads by Source
        <ChartBox />
        </div>   */}
        <div className="bx bx3">ChartBox3
        {/* <ChartBox /> */}
        </div>  
        <div className="bx bx4">ChartBox4
        <ChartBox />
        </div>   
        <div className="bx bx5"><ChartBox />
        Box5
        </div>  
        {/* <div className="bx bx6"><ChartBox /></div>   */}
        {/* <div className="box bx7"><ChartBox /></div>   */}
        {/* <div className="box bx8"><ChartBox /></div>       */}
    </div>

  )
}

export default Dashboardmain;