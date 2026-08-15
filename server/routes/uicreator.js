import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Home";
import UICreator from "./UICreator";
import NotFound from "./NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* match /uicreator (and optionally nested paths) */}
        <Route path="/uicreator/*" element={<UICreator />} />
        {/* good to have a 404 fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
