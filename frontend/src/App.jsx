import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Assessment from "./pages/Assessment";
import MainLayout from "./layouts/MainLayout";

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
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;