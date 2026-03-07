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
import AcademicEligibility from './pages/AcademicEligibility';
import Dashboard from './pages/Dashboard';
import DepthChart from './pages/DepthChart';
import FilmRoom from './pages/FilmRoom';
import GamePlan from './pages/GamePlan';
import GameSchedule from './pages/GameSchedule';
import InGameAssistant from './pages/InGameAssistant';
import Messages from './pages/Messages';
import PerformanceAnalytics from './pages/PerformanceAnalytics';
import Playbook from './pages/Playbook';
import PlayerDevelopment from './pages/PlayerDevelopment';
import PlayerHealth from './pages/PlayerHealth';
import Playlists from './pages/Playlists';
import Practice from './pages/Practice';
import Recruiting from './pages/Recruiting';
import Roster from './pages/Roster';
import Scouting from './pages/Scouting';
import Settings from './pages/Settings';
import StrengthConditioning from './pages/StrengthConditioning';
import UserManagement from './pages/UserManagement';
import NxLab from './pages/NxLab';
import NxGenSportsWebsite from './pages/NxGenSportsWebsite';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AcademicEligibility": AcademicEligibility,
    "Dashboard": Dashboard,
    "DepthChart": DepthChart,
    "FilmRoom": FilmRoom,
    "GamePlan": GamePlan,
    "GameSchedule": GameSchedule,
    "InGameAssistant": InGameAssistant,
    "Messages": Messages,
    "PerformanceAnalytics": PerformanceAnalytics,
    "Playbook": Playbook,
    "PlayerDevelopment": PlayerDevelopment,
    "PlayerHealth": PlayerHealth,
    "Playlists": Playlists,
    "Practice": Practice,
    "Recruiting": Recruiting,
    "Roster": Roster,
    "Scouting": Scouting,
    "Settings": Settings,
    "StrengthConditioning": StrengthConditioning,
    "UserManagement": UserManagement,
    "NxLab": NxLab,
    "NxGenSportsWebsite": NxGenSportsWebsite,
}

export const pagesConfig = {
    mainPage: "FilmRoom",
    Pages: PAGES,
    Layout: __Layout,
};