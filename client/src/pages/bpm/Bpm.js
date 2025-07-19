import { Routes, Route, Outlet } from "react-router-dom";
import Menu from "../../components/menu/Menu";

import Dashboardmain from "../../pages/dashboardmain/Dashboardmain";
import Assignments from "../../pages/assignments/Assignments";
import Users from "../../pages/users/Users";
import Sbforms from "../../pages/sbforms/Sbforms";

export default function Bpm() {
  const Layout = () => (
    <div style={{ display: "flex" }}>
      <Menu />
      <div style={{ flex: 1, marginLeft: "20px" }}>
        <Outlet />
      </div>
    </div>
  );

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Users />} />
        {/* <Route path="users" element={<Users />} />
        <Route path="dashboard" element={<Dashboardmain />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="sbforms" element={<Sbforms />} /> */}
      </Route>
    </Routes>
  );
}
