// src/redux/dashboard/components/KPICard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";

/**
 * Color mapping matches your existing dashboard style
 */
const COLOR_MAP = {
  orange:  { bg: "bg-orange-50",  icon: "text-orange-500"  },
  gray:    { bg: "bg-gray-100",   icon: "text-gray-600"    },
  amber:   { bg: "bg-amber-50",   icon: "text-amber-500"   },
  pink:    { bg: "bg-pink-50",    icon: "text-pink-500"    },
  green:   { bg: "bg-green-50",   icon: "text-green-600"   },
  blue:    { bg: "bg-blue-50",    icon: "text-blue-600"    },
  coral:   { bg: "bg-orange-50",  icon: "text-orange-600"  },
  red:     { bg: "bg-red-50",     icon: "text-red-500"     },
};

function formatValue(value, format) {
  if (value === null || value === undefined) return "—";
  
  if (format === "currency") {
    return `₹${Number(value).toLocaleString("en-IN")}`;
  }
  
  if (format === "number") {
    return Number(value).toLocaleString("en-IN");
  }
  
  return value;
}

/**
 * KPICard - Renders ANY KPI widget from config
 * 
 * Same component renders ALL 8 KPIs on your dashboard.
 * Config drives icon, color, label, and action.
 */
export default function KPICard({ widget, data, loading }) {
  const navigate = useNavigate();
  const colors = COLOR_MAP[widget.color] || COLOR_MAP.gray;
  const IconComponent = Icons[widget.icon] || Icons.Activity;
  
  const value = data?.value;
  const billsCount = data?.bills_count;
  const isClickable = !!widget.action?.path;
  
  const handleClick = () => {
    if (isClickable) navigate(widget.action.path);
  };

  return (
    <div
      onClick={isClickable ? handleClick : undefined}
      className={`
        bg-white rounded-xl border border-gray-200 p-5
        ${isClickable ? "cursor-pointer hover:shadow-sm transition-shadow" : ""}
      `}
    >
      <div className="flex items-start gap-4">
        {/* Icon Circle */}
        <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0`}>
          <IconComponent className={`w-5 h-5 ${colors.icon}`} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-500 mb-1">
            {widget.title}
          </div>
          
          {loading ? (
            <div className="h-7 bg-gray-100 rounded animate-pulse w-24" />
          ) : (
            <div className="text-2xl font-semibold text-gray-900">
              {formatValue(value, widget.format)}
            </div>
          )}
          
          {/* Subtitle - "28 bills" or "At or below reorder" */}
          {widget.subtitle && !loading && (
            <div className="text-xs text-gray-500 mt-1">
              {widget.showBillsCount && billsCount 
                ? `${billsCount} bills` 
                : widget.subtitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}