import React, { Fragment, useEffect, useState } from 'react';
import "./topbox.scss";

const Topbox = () => {

  const [todos, setTodos] = useState([]);
  
  const getTodos = async() => {
      try {

          const response = await fetch ("http://localhost:5000/todos");
          const jsonData = await response.json();

          setTodos (jsonData);

      } catch (err) {

          console.error(err.message);            
      
      }
  };

useEffect(() => {
  getTodos();
}, []);


return (
  <Fragment>
    <div className="topBox">
      <h5>Assignments</h5> 
 <div className="list">     
{todos.map(todo => (
  <div className="listItem" key={todo.todo_id}>
    <div className="description">
    {/* <span className="todoTexts">{todo.todo_id}</span> */}
      <span className="descriptionTexts">{todo.description}</span>
      </div>
      <div className="description">
      <span className="asgntxt">{todo.assignto}</span>
  </div>
  
  </div>
  
  
              )
              )}
              </div>
              </div>
      
  </Fragment>
)
}

export default Topbox;
