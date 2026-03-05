/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Analytics from './pages/Analytics';
import Dashboard from './pages/Dashboard';
import DepthChart from './pages/DepthChart';
import GamePlan from './pages/GamePlan';
import Playbook from './pages/Playbook';
import PlayerHealth from './pages/PlayerHealth';
import Practice from './pages/Practice';
import Roster from './pages/Roster';
import Scouting from './pages/Scouting';
import Settings from './pages/Settings';
import Playlists from './pages/Playlists';
import Messages from './pages/Messages';
import UserManagement from './pages/UserManagement';
import AcademicEligibility from './pages/AcademicEligibility';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "Dashboard": Dashboard,
    "DepthChart": DepthChart,
    "GamePlan": GamePlan,
    "Playbook": Playbook,
    "PlayerHealth": PlayerHealth,
    "Practice": Practice,
    "Roster": Roster,
    "Scouting": Scouting,
    "Settings": Settings,
    "Playlists": Playlists,
    "Messages": Messages,
    "UserManagement": UserManagement,
    "AcademicEligibility": AcademicEligibility,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};