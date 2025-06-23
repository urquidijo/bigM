import { Route, Routes } from "react-router-dom";
import BigMSolver from "../components/InputForm";
import MetodoDosFases from "../components/MetodoDosFases";
import HomePage from "../components/Home";

const Router = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/BigM" element={<BigMSolver />} />
      <Route path="/DosFases" element={<MetodoDosFases />} />
    </Routes>
  );
};

export default Router;
