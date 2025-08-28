import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Articles from './pages/Articles';
import Categories from './pages/Categories';
import Tags from './pages/Tags';
import Comments from './pages/Comments';
import Users from './pages/Users';
import Tenants from './pages/Tenants';
import ApiKeys from './pages/ApiKeys';
import DeploymentsPage from './pages/DeploymentsPage';
import TenantRegistration from './pages/TenantRegistration';
import Quizzes from './pages/Quizzes';
import Leaderboards from './pages/Leaderboards';
import Rewards from './pages/Rewards';
import SocialIntegrations from './pages/SocialIntegrations';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="articles" element={<Articles />} />
            <Route path="categories" element={<Categories />} />
            <Route path="tags" element={<Tags />} />
            <Route path="comments" element={<Comments />} />
            <Route path="users" element={<Users />} />
            <Route path="tenants" element={<Tenants />} />
            <Route path="/api-keys" element={<ApiKeys />} />
            <Route path="deployments" element={<DeploymentsPage />} />
            <Route path="/register" element={<TenantRegistration />} />
            <Route path="quizzes" element={<Quizzes />} />
            <Route path="leaderboards" element={<Leaderboards />} />
            <Route path="rewards" element={<Rewards />} />
            <Route path="social-integrations" element={<SocialIntegrations />} />
            <Route path="analytics" element={<div className="p-6"><h1 className="text-2xl font-bold">Analytics</h1><p className="text-gray-600 mt-2">Página em desenvolvimento...</p></div>} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
