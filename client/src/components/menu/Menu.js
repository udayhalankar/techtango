import React from 'react'
import "./menu.scss"
import { Link } from "react-router-dom"
import { menu } from "../../data";


const Menu = () => {
  return (

    

    <div className="menu">
      {menu.map((item) => (
        <div className="item" key={item.id}> 
          <span className="title">{item.title}</span>
          
          {item.ListItems.map((ListItem) => (
            <Link to={ListItem.url} className="ListItem" key={ListItem.id}>
             <span  alt="">{ListItem.icon}</span>
              <span className="ListItemTitle">{ListItem.title}</span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Menu;
