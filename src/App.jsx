import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { StoreProvider } from './data/store'
import RolePicker from './pages/RolePicker'
import ManagerHome from './pages/manager/Home'
import StaffHome from './pages/staff/Home'
import Rooms from './pages/shared/Rooms'
import FloorMap from './pages/shared/FloorMap'
import Tasks from './pages/shared/Tasks'
import Training from './pages/shared/Training'
import Schedule from './pages/manager/Schedule'

// HashRouter so the build works from any static host (or a single HTML file).
export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<RolePicker />} />

          <Route path="/manager" element={<ManagerHome />} />
          <Route path="/manager/rooms" element={<Rooms />} />
          <Route path="/manager/map" element={<FloorMap />} />
          <Route path="/manager/tasks" element={<Tasks />} />
          <Route path="/manager/schedule" element={<Schedule />} />
          <Route path="/manager/training" element={<Training />} />

          <Route path="/staff" element={<StaffHome />} />
          <Route path="/staff/rooms" element={<Rooms />} />
          <Route path="/staff/map" element={<FloorMap />} />
          <Route path="/staff/tasks" element={<Tasks />} />
          <Route path="/staff/training" element={<Training />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </StoreProvider>
  )
}
