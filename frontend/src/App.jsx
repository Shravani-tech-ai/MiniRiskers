import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Assessments from "./pages/Assessments";
import Analytics from "./pages/Analytics";
import Methodology from "./pages/Methodology";
import Assessment from "./pages/Assessment";
import TrackProgress from "./pages/TrackProgress";
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
          path="/assessments"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Assessments />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Analytics />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/track-progress"
          element={
            <ProtectedRoute>
              <MainLayout>
                <TrackProgress />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/track-progress/:changeRequestId"
          element={
            <ProtectedRoute>
              <MainLayout>
                <TrackProgress />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/methodology"
          element={
            <ProtectedRoute
              allowedRoles={[
                ROLES.RISK_ANALYST,
                ROLES.RISK_COMMITTEE,
                ROLES.AUDITOR,
                ROLES.ADMIN,
              ]}
            >
              <MainLayout>
                <Methodology />
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
