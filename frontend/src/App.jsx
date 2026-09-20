import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Assessment from "./pages/Assessment";
import MainLayout from "./layouts/MainLayout";
import NewRequest from "./pages/NewRequest";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Landing from "./pages/Landing";
import ProtectedRoute from "./components/ProtectedRoute";
import { ROLES } from "./utils/rolePermissions";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/assessment/:changeRequestId"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Assessment />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/new-request"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.BUSINESS_OWNER, ROLES.ADMIN]}
            >
              <MainLayout>
                <NewRequest />
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
