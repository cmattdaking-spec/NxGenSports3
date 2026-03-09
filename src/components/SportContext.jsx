import { createContext, useContext } from "react";

export const SportContext = createContext({
  activeSport: "football",
  user: null,
  isAD: false,
  isHeadCoach: false,
  isSuperAdmin: false,
  canEditAll: false,
  teamId: null,
  sportFilter: {},
  switchSport: () => {},
});

export const useSport = () => useContext(SportContext);