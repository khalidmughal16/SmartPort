import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/app/AppShell";
import { Toast } from "@/components/app/Toast";
import { Landing } from "@/pages/landing/Landing";
import { Component as SignIn } from "@/components/ui/sign-in-card-2";
import { Component as SignUp } from "@/components/ui/sign-up-card";
import { useApp } from "@/store/useApp";
import { Dashboard } from "@/pages/app/Dashboard";
import { YardMap } from "@/pages/app/YardMap";
import { Containers } from "@/pages/app/Containers";
import { Vessels } from "@/pages/app/Vessels";
import { GateIn } from "@/pages/app/GateIn";
import { Appointments } from "@/pages/app/Appointments";
import { Placement } from "@/pages/app/Placement";
import { CraneTasks } from "@/pages/app/CraneTasks";
import { AStarRouter } from "@/pages/app/AStarRouter";
import { CustomsBilling } from "@/pages/app/CustomsBilling";
import { Reports } from "@/pages/app/Reports";
import { Users } from "@/pages/app/Users";
import { Profile } from "@/pages/app/Profile";

/** Already signed in? Skip the auth screens. */
const GuestOnly = ({ children }: { children: JSX.Element }) => (useApp((s) => s.role) ? <Navigate to="/dashboard" replace /> : children);

export function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<GuestOnly><SignIn /></GuestOnly>} />
        <Route path="/signup" element={<GuestOnly><SignUp /></GuestOnly>} />
        <Route element={<AppShell />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="yard-map" element={<YardMap />} />
          <Route path="containers" element={<Containers />} />
          <Route path="vessels" element={<Vessels />} />
          <Route path="gate-in" element={<GateIn />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="placement" element={<Placement />} />
          <Route path="crane-tasks" element={<CraneTasks />} />
          <Route path="router" element={<AStarRouter />} />
          <Route path="customs-billing" element={<CustomsBilling />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<Users />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={null} />
        </Route>
      </Routes>
      <Toast />
    </>
  );
}
