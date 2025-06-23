
import './App.css'
import { BrowserRouter } from 'react-router-dom';
import Router from "./Router/routes.jsx";

const App = () => {

  return (
    <BrowserRouter>
      <Router />
    </BrowserRouter>
  );
};

export default App;