// IPDFilterContext.js
import React, { createContext, useState } from "react";

// Create and export the context
export const IPDFilterContext = createContext();

// Make sure your Provider component looks something like this:
export const IPDFilterProvider = ({ children }) => {
  // Your existing filters state
  const [filters, setFilters] = useState({
    branch_name: "all",
    filter_type: "currentmonth",
    start_date: "",
    end_date: ""
  });

  // 1. ADD ANALYTICS STATE HERE
  const [analytics, setAnalytics] = useState({});

  return (
    <IPDFilterContext.Provider 
      value={{ 
        filters, 
        setFilters, 
        analytics,       // 2. Export it in the value object
        setAnalytics     // Export the setter
      }}
    >
      {children}
    </IPDFilterContext.Provider>
  );
};