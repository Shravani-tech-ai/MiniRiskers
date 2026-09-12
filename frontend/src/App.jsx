import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Assessment from "./pages/Assessment";
import MainLayout from "./layouts/MainLayout";
import NewRequest from "./pages/NewRequest";

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route
            path="/"
            element={<Dashboard />}
          />

          <Route
            path="/assessment/:changeRequestId"
            element={<Assessment />}
          />
          
          <Route path="/new-request" element={<NewRequest />} />

        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;