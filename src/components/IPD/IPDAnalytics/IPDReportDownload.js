import React, { useState, useContext, useEffect } from "react";
import {
  Modal,
  Box,
  Typography,
  Button,
  Stack,
  Checkbox,
  FormControlLabel,
  Divider,
  FormGroup,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import IPDBedBarOverview from "./IPDBedBarOverview";
import IPDBedGraphOccupancy from "./IPDBedGraphOccupancy";
import IPDWardWiseRevenue from "./IPDWardWiseRevenue";
import IPDAdmissionAnalytics from "./IPDAdmissionAnalytics";
import IPDRevenueAnalyticsDetail from "./IPDRevenueAnalyticsDetail";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// IMPORT YOUR CONTEXT
import { IPDFilterContext } from "./IPDFilterContext";
import IPDWardWiseOccupancy from "./IPDWardWiseOccupancy";
import IPDDoctorRevenueAnalytics from "./IPDDoctorRevenue";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxHeight: "90vh",
  overflowY: "auto",
  bgcolor: "background.paper",
  borderRadius: 3,
  boxShadow: 24,
  p: 4,
  zIndex: 10,
};

const reportList = [
  { id: "admissionAnalytics", label: "Admission Analytics" },
  { id: "wardWiseRevenue", label: "Ward Revenue" },
  { id: "wardOccupancy", label: "Ward Occupancy" },
  { id: "bedOccupancy", label: "Bed Occupancy" },
  { id: "bedOverview", label: "Bed Overview" },
  { id: "doctorRevenueAnalytics", label: "Doctor Revenue" },
];

const formatDt = (d) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const getDateRangeString = (filterType, customStart, customEnd) => {
  if (filterType === "custom" && customStart && customEnd) {
    const formatCustom = (dateStr) => {
      const [y, m, day] = dateStr.split("-");
      return `${day}-${m}-${y}`;
    };
    return `${formatCustom(customStart)} to ${formatCustom(customEnd)}`;
  }

  const today = new Date();
  let pastDate = new Date(today);

  switch (filterType) {
    case "7days":
      pastDate.setDate(today.getDate() - 7);
      break;
    case "1month":
      pastDate.setMonth(today.getMonth() - 1);
      break;
    case "3months":
      pastDate.setMonth(today.getMonth() - 3);
      break;
    case "6months":
      pastDate.setMonth(today.getMonth() - 6);
      break;
    case "1year":
      pastDate.setFullYear(today.getFullYear() - 1);
      break;
    case "currentmonth":
      pastDate = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    default:
      pastDate = new Date(today.getFullYear(), today.getMonth(), 1);
  }

  return `${formatDt(pastDate)} to ${formatDt(today)}`;
};

const IPDReportDownload = ({ open, handleClose }) => {
  const { filters, analytics } = useContext(IPDFilterContext);
  const [selectedReports, setSelectedReports] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (open) {
      console.log("Analytics Prop Received:", analytics);
    }
  }, [open, analytics]);

  const formattedDateRange = getDateRangeString(
    filters.filter_type,
    filters.start_date,
    filters.end_date,
  );

  const filterStr = `Branch: ${filters.branch_name === "all" ? "All Branches" : filters.branch_name}  |  Date: ${formattedDateRange}`;

  const rawAmount =
    analytics?.total_bill_amount ||
    analytics?.totalBillAmount ||
    analytics?.data?.total_bill_amount ||
    0;

  const parsedRevenue =
    Number(String(rawAmount).replace(/[^0-9.-]+/g, "")) || 0;
  const totalRevenueFormatted = new Intl.NumberFormat("en-IN").format(
    parsedRevenue,
  );

  useEffect(() => {
    if (open) {
      setIsReady(false);
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [selectedReports, open]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedReports(reportList.map((item) => item.id));
    } else {
      setSelectedReports([]);
    }
  };

  const handleCheckboxChange = (id) => {
    setSelectedReports((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleDownload = async () => {
    setIsGenerating(true);

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const companyName =
        localStorage.getItem("companyName") || "Hospital Report";
      const dateStr = new Date().toLocaleString();

      // ==========================================
      // NEW PAGE CHUNKING LOGIC
      // ==========================================
      const chunks = [];

      // Page 1 gets ONLY the main default dashboard
      chunks.push(["dashboardDefault"]);

      // The rest of the pages get 2 selected components each
      for (let i = 0; i < selectedReports.length; i += 2) {
        chunks.push(selectedReports.slice(i, i + 2));
      }
      // ==========================================

      for (let i = 0; i < chunks.length; i++) {
        if (i > 0) pdf.addPage();

        // Draw Header
        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");
        pdf.text("Dashboard Reports", pageWidth / 2, 14, { align: "center" });
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "normal");
        pdf.text(companyName, pageWidth / 2, 21, { align: "center" });
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "italic");
        pdf.text(
          `Selected Filters : ( ${filterStr || "All"} )`,
          pageWidth / 2,
          28,
          { align: "center" },
        );
        pdf.setLineWidth(0.5);
        pdf.setDrawColor(200, 200, 200);
        pdf.line(10, 34, pageWidth - 10, 34);

        // Draw Footer
        pdf.line(10, pageHeight - 15, pageWidth - 10, pageHeight - 15);
        pdf.setFontSize(8);
        pdf.text(`Printed on: ${dateStr}`, 10, pageHeight - 10);
        pdf.text(
          `Page ${i + 1} of ${chunks.length}`,
          pageWidth - 10,
          pageHeight - 10,
          { align: "right" },
        );

        let currentY = 38;

        for (let j = 0; j < chunks[i].length; j++) {
          const compId = chunks[i][j];
          const element = document.getElementById(`hidden-print-${compId}`);

          if (element) {
            // Yield to browser thread
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const canvas = await html2canvas(element, {
              scale: 2,
              useCORS: true,
              backgroundColor: "#ffffff",
              logging: false,
              windowWidth: 1200,
            });

            const imgData = canvas.toDataURL("image/png");
            const imgProps = pdf.getImageProperties(imgData);
            const pdfImgWidth = pageWidth - 20;
            const pdfImgHeight =
              (imgProps.height * pdfImgWidth) / imgProps.width;

            if (currentY + pdfImgHeight > pageHeight - 20 && j > 0) {
              pdf.addPage();
              currentY = 20;
            }

            pdf.addImage(
              imgData,
              "PNG",
              10,
              currentY,
              pdfImgWidth,
              pdfImgHeight,
            );
            currentY += pdfImgHeight + 10;
          }
        }
      }
      const today = new Date();
      const formattedDate = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;

      pdf.save(`${companyName} IPD Reports ${formattedDate}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("An error occurred while generating the PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {/* --- MAIN MODAL UI --- */}
        <Box sx={style}>
          <Box
            sx={{
              position: "sticky",
              top: 0,
              bgcolor: "#ffff",
              zIndex: "100000",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h5" fontWeight={700} mb={1}>
                Download IPD Report
              </Typography>
              <Button
                variant="outlined"
                onClick={handleClose}
                disabled={isGenerating}
                sx={{
                  minWidth: "10px",
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#64748b",
                  border: "none",
                }}
              >
                <Tooltip title="Close" placement="left" arrow>
                  ✕
                </Tooltip>
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", flexWrap: "wrap" }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedReports.length === reportList.length}
                      indeterminate={
                        selectedReports.length > 0 &&
                        selectedReports.length < reportList.length
                      }
                      onChange={handleSelectAll}
                      sx={{
                        color: "#3f6f7a",
                        "&.Mui-checked": {
                          color: "#3f6f7a",
                        },
                      }}
                    />
                  }
                  label={<b>Select All</b>}
                />
                <FormGroup
                  sx={{ display: "flex", flexDirection: "row", gap: 0.5 }}
                >
                  {reportList.map((report) => (
                    <FormControlLabel
                      key={report.id}
                      control={
                        <Checkbox
                          checked={selectedReports.includes(report.id)}
                          onChange={() => handleCheckboxChange(report.id)}
                          sx={{
                            color: "#3f6f7a",
                            "&.Mui-checked": {
                              color: "#3f6f7a",
                            },
                          }}
                        />
                      }
                      label={report.label}
                      sx={{
                        "& .MuiFormControlLabel-label": {
                          color: selectedReports.includes(report.id)
                            ? "#3f6f7a"
                            : "inherit",
                          fontWeight: selectedReports.includes(report.id)
                            ? 600
                            : 400,
                        },
                      }}
                    />
                  ))}
                </FormGroup>
              </Box>

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  onClick={handleDownload}
                  disabled={isGenerating || !isReady}
                  startIcon={
                    isGenerating && (
                      <CircularProgress size={20} color="#fff" />
                    )
                  }
                  sx={{
                    backgroundColor: "#3f6f7a",
                    color: "#fff",
                  }}
                >
                  <span  style={{
                    // backgroundColor: "#3f6f7a",
                    color: "#fff",
                  }}>

                    {isGenerating
                    ? "Generating..."
                    : !isReady
                      ? "Loading Data..."
                      : "Download PDF"}
                  </span>
                </Button>
              </Stack>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" fontWeight={700} mb={2}>
                Report Layout Preview
              </Typography>
              <Typography
                variant="body1"
                fontWeight={600}
                color="textSecondary"
                mb={0.5}
              >
                Selected Filters : ( {filterStr} )
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              width: "100%",
              overflowX: "auto",
              opacity: isGenerating ? 0.5 : 1,
              transition: "opacity 0.3s",
            }}
          >
            <Box
              sx={{
                minWidth: "1000px",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                pb: 2,
              }}
            >
              <Box
                sx={{
                  p: 4,
                  minHeight: "150px",
                  border: "1px solid #ddd",
                  borderRadius: 2,
                  bgcolor: "#ebf0f1",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "1.8rem",
                    fontWeight: 800,
                    color: "#3f6f7a",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <LocalHospitalIcon sx={{ fontSize: "2.5rem" }} /> Total
                  Hospital Revenue
                </Typography>
                <Typography
                  sx={{
                    fontSize: "3rem",
                    fontWeight: "bold",
                    color: "#22C55E",
                  }}
                >
                  ₹ {totalRevenueFormatted}
                </Typography>
              </Box>

              <Box
                sx={{
                  border: "1px solid #ddd",
                  borderRadius: 2,
                  p: 2,
                  bgcolor: "#fafafa",
                }}
              >
                <IPDRevenueAnalyticsDetail previewMode />
              </Box>

              {selectedReports.includes("admissionAnalytics") && (
                <Box
                  sx={{
                    border: "1px solid #ddd",
                    borderRadius: 2,
                    p: 2,
                    bgcolor: "#fafafa",
                    minHeight: "450px",
                  }}
                >
                  <IPDAdmissionAnalytics />
                </Box>
              )}
              {selectedReports.includes("wardWiseRevenue") && (
                <Box
                  sx={{
                    border: "1px solid #ddd",
                    borderRadius: 2,
                    p: 2,
                    bgcolor: "#fafafa",
                    minHeight: "450px",
                  }}
                >
                  <IPDWardWiseRevenue />
                </Box>
              )}
              {selectedReports.includes("bedOccupancy") && (
                <Box
                  sx={{
                    border: "1px solid #ddd",
                    borderRadius: 2,
                    p: 2,
                    bgcolor: "#fafafa",
                    minHeight: "450px",
                  }}
                >
                  <IPDBedGraphOccupancy />
                </Box>
              )}
              {selectedReports.includes("bedOverview") && (
                <Box
                  sx={{
                    border: "1px solid #ddd",
                    borderRadius: 2,
                    p: 2,
                    bgcolor: "#fafafa",
                    minHeight: "450px",
                  }}
                >
                  <IPDBedBarOverview />
                </Box>
              )}

              {selectedReports.includes("wardOccupancy") && (
                <Box
                  id="hidden-print-wardOccupancy"
                  sx={{
                    border: "1px solid #ddd",
                    borderRadius: 2,
                    p: 2,
                    bgcolor: "#fafafa",
                    mt: 2,
                    minHeight: "450px",
                  }}
                >
                  <IPDWardWiseOccupancy />
                </Box>
              )}

              {selectedReports.includes("doctorRevenueAnalytics") && (
                <Box
                  id="hidden-print-doctorRevenueAnalytics"
                  sx={{
                    border: "1px solid #ddd",
                    borderRadius: 2,
                    p: 2,
                    bgcolor: "#fafafa",
                    mt: 2,
                    minHeight: "450px",
                  }}
                >
                  <IPDDoctorRevenueAnalytics />
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* --- HIDDEN PRINT CONTAINER --- */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "1100px",
            zIndex: -100,
            pointerEvents: "none",
            bgcolor: "#ffffff",
          }}
        >
          <Box
            id="hidden-print-dashboardDefault"
            sx={{ display: "flex", flexDirection: "column", gap: 3, p: 2 }}
          >
            <Box
              sx={{
                p: 4,
                border: "1px solid #ddd",
                borderRadius: 2,
                bgcolor: "#ebf0f1",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography
                sx={{
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  color: "#3f6f7a",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <LocalHospitalIcon sx={{ fontSize: "2.5rem" }} /> Total Hospital
                Revenue
              </Typography>
              <Typography
                sx={{ fontSize: "3rem", fontWeight: "bold", color: "#22C55E" }}
              >
                ₹ {totalRevenueFormatted}
              </Typography>
            </Box>
            <Box
              sx={{
                border: "1px solid #ddd",
                borderRadius: 2,
                p: 2,
                bgcolor: "#fafafa",
              }}
            >
              <IPDRevenueAnalyticsDetail previewMode />
            </Box>
          </Box>

          {selectedReports.includes("admissionAnalytics") && (
            <Box
              id="hidden-print-admissionAnalytics"
              sx={{
                border: "1px solid #ddd",
                borderRadius: 2,
                p: 2,
                bgcolor: "#fafafa",
                mt: 2,
                minHeight: "450px",
              }}
            >
              <IPDAdmissionAnalytics />
            </Box>
          )}

          {selectedReports.includes("wardWiseRevenue") && (
            <Box
              id="hidden-print-wardWiseRevenue"
              sx={{
                border: "1px solid #ddd",
                borderRadius: 2,
                p: 2,
                bgcolor: "#fafafa",
                mt: 2,
                minHeight: "450px",
              }}
            >
              <IPDWardWiseRevenue />
            </Box>
          )}

          {selectedReports.includes("bedOccupancy") && (
            <Box
              id="hidden-print-bedOccupancy"
              sx={{
                border: "1px solid #ddd",
                borderRadius: 2,
                p: 2,
                bgcolor: "#fafafa",
                mt: 2,
                minHeight: "450px",
              }}
            >
              <IPDBedGraphOccupancy />
            </Box>
          )}

          {selectedReports.includes("bedOverview") && (
            <Box
              id="hidden-print-bedOverview"
              sx={{
                border: "1px solid #ddd",
                borderRadius: 2,
                p: 2,
                bgcolor: "#fafafa",
                mt: 2,
                minHeight: "450px",
              }}
            >
              <IPDBedBarOverview />
            </Box>
          )}

          {selectedReports.includes("wardOccupancy") && (
            <Box
              id="hidden-print-wardOccupancy"
              sx={{
                border: "1px solid #ddd",
                borderRadius: 2,
                p: 2,
                bgcolor: "#fafafa",
                mt: 2,
                minHeight: "450px",
              }}
            >
              <IPDWardWiseOccupancy />
            </Box>
          )}

          {selectedReports.includes("doctorRevenueAnalytics") && (
            <Box
              id="hidden-print-doctorRevenueAnalytics"
              sx={{
                border: "1px solid #ddd",
                borderRadius: 2,
                p: 2,
                bgcolor: "#fafafa",
                mt: 2,
                minHeight: "450px",
              }}
            >
              <IPDDoctorRevenueAnalytics />
            </Box>
          )}
        </Box>
      </Box>
    </Modal>
  );
};

export default IPDReportDownload;
