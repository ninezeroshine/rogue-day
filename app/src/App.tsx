import './index.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout';
import { RunPage } from './pages/RunPage';
import { JournalPage } from './pages/JournalPage';
import { ProfilePage } from './pages/ProfilePage';
import { TemplatesPage } from './pages/TemplatesPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<RunPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/templates" element={<TemplatesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
