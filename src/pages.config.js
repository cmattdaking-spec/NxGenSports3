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
import ADPortal from './pages/ADPortal.jsx';
import AcademicEligibility from './pages/AcademicEligibility.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DepthChart from './pages/DepthChart.jsx';
import FilmRoom from './pages/FilmRoom.jsx';
import GamePlan from './pages/GamePlan.jsx';
import GameSchedule from './pages/GameSchedule.jsx';
import InGameAssistant from './pages/InGameAssistant.jsx';
import Login from './pages/Login.jsx';
import Messages from './pages/Messages.jsx';
import NxAnnouncement from './pages/NxAnnouncement.jsx';
import NxLab from './pages/NxLab.jsx';
import NxPlay from './pages/NxPlay.jsx';
import PerformanceAnalytics from './pages/PerformanceAnalytics.jsx';
import Playbook from './pages/Playbook.jsx';
import PlayerDevelopment from './pages/PlayerDevelopment.jsx';
import PlayerHealth from './pages/PlayerHealth.jsx';
import Playlists from './pages/Playlists.jsx';
import Practice from './pages/Practice.jsx';
import Recruiting from './pages/Recruiting.jsx';
import Reports from './pages/Reports.jsx';
import Roster from './pages/Roster.jsx';
import Scouting from './pages/Scouting.jsx';
import Settings from './pages/Settings.jsx';
import StrengthConditioning from './pages/StrengthConditioning.jsx';
import UserManagement from './pages/UserManagement.jsx';
import PlayerPortal from './pages/PlayerPortal.jsx';
import ParentPortal from './pages/ParentPortal.jsx';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ADPortal": ADPortal,
    "AcademicEligibility": AcademicEligibility,
    "Dashboard": Dashboard,
    "DepthChart": DepthChart,
    "FilmRoom": FilmRoom,
    "GamePlan": GamePlan,
    "GameSchedule": GameSchedule,
    "InGameAssistant": InGameAssistant,
    "Login": Login,
    "Messages": Messages,
    "NxAnnouncement": NxAnnouncement,
    "NxLab": NxLab,
    "NxPlay": NxPlay,
    "PerformanceAnalytics": PerformanceAnalytics,
    "Playbook": Playbook,
    "PlayerDevelopment": PlayerDevelopment,
    "PlayerHealth": PlayerHealth,
    "Playlists": Playlists,
    "Practice": Practice,
    "Recruiting": Recruiting,
    "Reports": Reports,
    "Roster": Roster,
    "Scouting": Scouting,
    "Settings": Settings,
    "StrengthConditioning": StrengthConditioning,
    "UserManagement": UserManagement,
    "PlayerPortal": PlayerPortal,
    "ParentPortal": ParentPortal,
}

export const pagesConfig = {
    // Default landing page; Layout further routes ADs to ADPortal.
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};