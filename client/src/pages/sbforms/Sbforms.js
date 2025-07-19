import React from 'react';
import "./sbforms.scss";
import Navbar  from '../../components/navbar/Navbar';
import Footer from '../../components/footer/Footer';
import Menu from '../../components/menu/Menu'
import ChartBox from '../../components/chartBox/ChartBox';
import Topbox from '../../components/topbox/Topbox';
import RmsMenu from '../../components/rmsMenu/RmsMenu';

export const Sbforms = () => {
  return (
    
<div class="grid-container">
  <div class="item1">
    <Navbar />
  </div>
  <div class="item2">
    <RmsMenu />
  </div>
  <div class="item3">
    RMS Dashboard  
  </div>  
  <div class="item4">
  <div class="itm4tile">first</div>
  <div class="itm4tile">third</div>
  <div class="itm4tile">third</div>  
  <div class="itm4tile">first</div>
  <div class="itm4tile">third</div>
  <div class="itm4tile">third</div>
  </div>
  <div class="item5">
  <Topbox />  
  </div>
  <div class="item6">
  https://newsapi.org/v2/top-headlines?country=in&apiKey=API_KEY
  </div>
  <div class="item7">
  <div class="itm7tile">first</div>
  <div class="itm7tile">third</div>
  <div class="itm7tile">third</div>  
  <div class="itm7tile">first</div>
  <div class="itm7tile">third</div>
  <div class="itm7tile">third</div>
  <div class="itm7tile">third</div>
  <div class="itm7tile">third</div>
  <div class="itm7tile">third</div>
  <div class="itm7tile">third</div>
  
  </div>
  <div class="item8">
    <div class="itm8tile">
    <ChartBox />
    </div>
  </div>
  <div class="item9">
  <Footer />
  </div>
 
</div>

    
    
  )
}

export default Sbforms;