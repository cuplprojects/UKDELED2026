import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Spin, notification } from "antd";
import Layout from "../components/Layout";
import { api } from "../stores/apiStore";
import {
  FaSearch,
  FaFilter,
  FaTimes,
  FaChalkboardTeacher,
  FaChair,
  FaBuilding,
  FaDoorOpen,
  FaUserGraduate,
  FaCheckCircle,
  FaThLarge,
  FaList,
  FaArrowLeft,
  FaArrowRight,
  FaInfoCircle,
  FaUndo,
  FaTh,
  FaWheelchair,
  FaPenFancy
} from "react-icons/fa";

export default function SeatMatrix() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters State
  const [selectedCity, setSelectedCity] = useState(searchParams.get("city") || "");
  const [selectedCentre, setSelectedCentre] = useState(searchParams.get("centre") || "");
  const [selectedRoom, setSelectedRoom] = useState(searchParams.get("room") || "");
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"

  // Layout Format State: "auto" (as allocated in DB) | "6x4" (6 seats/row) | "4x6" (4 seats/row)
  const [layoutFormat, setLayoutFormat] = useState("auto");

  // Previous View Tracker (for Back button)
  const [prevFilters, setPrevFilters] = useState(null);

  // Filter Dropdown Options
  const [filterOptions, setFilterOptions] = useState({
    cities: [],
    centres: [],
    rooms: [],
    totalAllottedCandidates: 0,
  });
  const [loadingFilters, setLoadingFilters] = useState(true);

  // Matrix Query Results
  const [matrixData, setMatrixData] = useState({
    summary: {
      totalCandidates: 0,
      totalRooms: 0,
      minRollNumber: null,
      maxRollNumber: null,
      selectedCityName: "",
      selectedCentreName: "",
      selectedRoomNumber: null,
    },
    roomSummaries: [],
    candidates: [],
    grid: null,
    pagination: {
      totalCount: 0,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    },
  });
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Quick Candidate Lookup State
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState("");

  // Candidate Detail Modal
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Helper: Save current filter state before navigating / searching
  const saveCurrentFiltersAsPrev = () => {
    setPrevFilters({
      selectedCity,
      selectedCentre,
      selectedRoom,
      searchTerm,
    });
  };

  // Helper: Back to previous view
  const handleBackToPrevious = () => {
    if (prevFilters) {
      setSelectedCity(prevFilters.selectedCity ?? "");
      setSelectedCentre(prevFilters.selectedCentre ?? "");
      setSelectedRoom(prevFilters.selectedRoom ?? "");
      setSearchTerm(prevFilters.searchTerm ?? "");
      setPrevFilters(null);
    } else {
      // Default fallback: clear room selection and search to return to broader centre/city view
      setSelectedRoom("");
      setSearchTerm("");
    }
    setLookupResult(null);
    setLookupError("");
  };

  // Load filter options on mount
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    setLoadingFilters(true);
    try {
      const res = await api.get("/api/SeatMatrix/filters");
      if (res.data?.success && res.data?.data) {
        setFilterOptions(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load seat matrix filters:", err);
      notification.warning({
        message: "Notice",
        description: "Could not load complete filter metadata. Direct search is still available.",
      });
    } finally {
      setLoadingFilters(false);
    }
  };

  // Filtered dropdown lists based on selection
  const availableCentres = useMemo(() => {
    if (!selectedCity) return filterOptions.centres;
    return filterOptions.centres.filter(
      (c) =>
        c.cityCode === selectedCity ||
        String(parseInt(c.cityCode, 10)) === String(parseInt(selectedCity, 10))
    );
  }, [filterOptions.centres, selectedCity]);

  const availableRooms = useMemo(() => {
    return filterOptions.rooms.filter((r) => {
      const cityMatches =
        !selectedCity ||
        r.cityCode === selectedCity ||
        String(parseInt(r.cityCode, 10)) === String(parseInt(selectedCity, 10));
      const centreMatches =
        !selectedCentre ||
        r.centreCode === selectedCentre ||
        String(parseInt(r.centreCode, 10)) === String(parseInt(selectedCentre, 10));
      return cityMatches && centreMatches;
    });
  }, [filterOptions.rooms, selectedCity, selectedCentre]);

  // Only query when both City and Centre are selected, OR a direct search is active
  const isFilterReady = Boolean((selectedCity && selectedCentre) || searchTerm.trim());

  // Fetch Matrix Data when filters change
  const fetchMatrixData = async (page = 1, size = pageSize) => {
    if (!isFilterReady) {
      setMatrixData({
        summary: {
          totalCandidates: 0,
          totalRooms: 0,
          minRollNumber: null,
          maxRollNumber: null,
          selectedCityName: "",
          selectedCentreName: "",
          selectedRoomNumber: null,
        },
        roomSummaries: [],
        candidates: [],
        grid: null,
        pagination: {
          totalCount: 0,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        },
      });
      return;
    }

    setLoadingMatrix(true);
    try {
      const params = {
        page,
        pageSize: viewMode === "grid" ? 0 : size, // Fetch all when in grid view to construct complete room layout
      };
      if (selectedCity) params.cityCode = selectedCity;
      if (selectedCentre) params.centreCode = selectedCentre;
      if (selectedRoom) params.roomNumber = parseInt(selectedRoom, 10);
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get("/api/SeatMatrix/matrix", { params });
      if (res.data?.success) {
        setMatrixData(res.data);
        setCurrentPage(res.data.pagination?.page || 1);
      }
    } catch (err) {
      console.error("Failed to load seat matrix data:", err);
      notification.error({
        message: "Error",
        description: "Failed to load seat matrix. Please try again.",
      });
    } finally {
      setLoadingMatrix(false);
    }
  };

  useEffect(() => {
    if (isFilterReady) {
      fetchMatrixData(1, pageSize);
    } else {
      setMatrixData((prev) => ({
        ...prev,
        summary: { ...prev.summary, totalCandidates: 0, totalRooms: 0 },
        candidates: [],
        grid: null,
      }));
    }

    // Sync URL params
    const newParams = {};
    if (selectedCity) newParams.city = selectedCity;
    if (selectedCentre) newParams.centre = selectedCentre;
    if (selectedRoom) newParams.room = selectedRoom;
    if (searchTerm) newParams.search = searchTerm;
    setSearchParams(newParams, { replace: true });
  }, [selectedCity, selectedCentre, selectedRoom, viewMode, searchTerm]);

  // Room grouping & dynamic layout calculation for 6x4, 4x6, and auto
  const roomGroups = useMemo(() => {
    if (!matrixData.candidates || matrixData.candidates.length === 0) return [];

    const map = new Map();
    matrixData.candidates.forEach((cand) => {
      const roomKey = cand.roomNumber ?? 0;
      if (!map.has(roomKey)) {
        map.set(roomKey, {
          roomNumber: cand.roomNumber,
          cityCode: cand.cityCode,
          cityName: cand.cityName,
          centreCode: cand.centreCode,
          centreName: cand.centreName,
          candidates: [],
        });
      }
      map.get(roomKey).candidates.push(cand);
    });

    const groups = Array.from(map.values()).sort(
      (a, b) => (a.roomNumber || 0) - (b.roomNumber || 0)
    );

    return groups.map((room) => {
      const cands = room.candidates;
      const totalInRoom = cands.length;
      const minRoll = Math.min(...cands.map((c) => c.rollNumber));
      const maxRoll = Math.max(...cands.map((c) => c.rollNumber));

      let gridRows = [];

      if (layoutFormat === "4x6") {
        // 4 Columns per Row
        const cols = 4;
        const rowCount = Math.ceil(totalInRoom / cols);
        const sorted = [...cands].sort((a, b) => a.rollNumber - b.rollNumber);
        for (let r = 0; r < rowCount; r++) {
          const rowNum = r + 1;
          const seats = [];
          for (let col = 0; col < cols; col++) {
            const idx = r * cols + col;
            if (idx < totalInRoom) {
              const c = sorted[idx];
              seats.push({
                seatIndex: idx + 1,
                seatRow: rowNum,
                seatNumber: idx + 1,
                isOccupied: true,
                candidate: c,
              });
            }
          }
          gridRows.push({ rowNumber: rowNum, seats });
        }
      } else if (layoutFormat === "6x4") {
        // 6 Columns per Row
        const cols = 6;
        const rowCount = Math.ceil(totalInRoom / cols);
        const sorted = [...cands].sort((a, b) => a.rollNumber - b.rollNumber);
        for (let r = 0; r < rowCount; r++) {
          const rowNum = r + 1;
          const seats = [];
          for (let col = 0; col < cols; col++) {
            const idx = r * cols + col;
            if (idx < totalInRoom) {
              const c = sorted[idx];
              seats.push({
                seatIndex: idx + 1,
                seatRow: rowNum,
                seatNumber: idx + 1,
                isOccupied: true,
                candidate: c,
              });
            }
          }
          gridRows.push({ rowNumber: rowNum, seats });
        }
      } else {
        // "auto": Use database allocated SeatRow if present
        const hasDbRows = cands.some((c) => c.seatRow && c.seatRow > 0);
        if (hasDbRows) {
          const rowMap = new Map();
          cands.forEach((c) => {
            const rNum = c.seatRow || 1;
            if (!rowMap.has(rNum)) rowMap.set(rNum, []);
            rowMap.get(rNum).push(c);
          });
          const sortedRowKeys = Array.from(rowMap.keys()).sort((a, b) => a - b);
          sortedRowKeys.forEach((rNum) => {
            const inRow = rowMap
              .get(rNum)
              .sort(
                (a, b) =>
                  (a.seatNumber || a.rollNumber) - (b.seatNumber || b.rollNumber)
              );
            gridRows.push({
              rowNumber: rNum,
              seats: inRow.map((c, i) => ({
                seatIndex: i + 1,
                seatRow: rNum,
                seatNumber: c.seatNumber || i + 1,
                isOccupied: true,
                candidate: c,
              })),
            });
          });
        } else {
          // Default fallback: 6 columns
          const cols = 6;
          const rowCount = Math.ceil(totalInRoom / cols);
          const sorted = [...cands].sort((a, b) => a.rollNumber - b.rollNumber);
          for (let r = 0; r < rowCount; r++) {
            const rowNum = r + 1;
            const seats = [];
            for (let col = 0; col < cols; col++) {
              const idx = r * cols + col;
              if (idx < totalInRoom) {
                seats.push({
                  seatIndex: idx + 1,
                  seatRow: rowNum,
                  seatNumber: idx + 1,
                  isOccupied: true,
                  candidate: sorted[idx],
                });
              }
            }
            gridRows.push({ rowNumber: rowNum, seats });
          }
        }
      }

      const maxCols = Math.max(
        ...gridRows.map((r) => r.seats.length),
        layoutFormat === "4x6" ? 4 : 6
      );

      return {
        ...room,
        totalCandidates: totalInRoom,
        minRoll,
        maxRoll,
        gridRows,
        maxCols,
      };
    });
  }, [matrixData.candidates, layoutFormat]);

  // Handle Search Input submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    saveCurrentFiltersAsPrev();
    fetchMatrixData(1, pageSize);
  };

  const handleClearFilters = () => {
    saveCurrentFiltersAsPrev();
    setSelectedCity("");
    setSelectedCentre("");
    setSelectedRoom("");
    setSearchTerm("");
    setLookupResult(null);
    setSearchParams({}, { replace: true });
  };

  // Quick Candidate Lookup
  const handleLookup = async (e) => {
    e.preventDefault();
    if (!lookupQuery.trim() || lookupQuery.trim().length < 2) {
      setLookupError("Please enter at least 2 characters (Roll No, Reg No, or Candidate Name).");
      return;
    }
    setLookupError("");
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const res = await api.get("/api/SeatMatrix/lookup", {
        params: { query: lookupQuery.trim() },
      });
      if (res.data?.success && res.data.data?.length > 0) {
        setLookupResult(res.data.data);
      } else {
        setLookupError("No seat allotment found for the entered details.");
      }
    } catch (err) {
      setLookupError(err.response?.data?.message || "Candidate seat allotment record not found.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSelectFromLookup = (cand) => {
    saveCurrentFiltersAsPrev();
    if (cand.cityCode) setSelectedCity(cand.cityCode);
    if (cand.centreCode) setSelectedCentre(cand.centreCode);
    if (cand.roomNumber) setSelectedRoom(String(cand.roomNumber));
    setSelectedCandidate(cand);
    setLookupResult(null);
  };

  const handleRoomTabClick = (roomNumStr) => {
    saveCurrentFiltersAsPrev();
    setSelectedRoom(roomNumStr);
  };

  // Indicates whether a drill-down/search is currently active to show the Back button
  const hasDrillDown = Boolean(selectedRoom || searchTerm.trim() || prevFilters);

  return (
    <Layout>
      {/* Top Banner / Breadcrumb */}
      <div className="bg-gradient-to-r from-[#085f9e] via-[#0b72be] to-[#085f9e] text-white py-6 px-4 sm:px-8 border-b-4 border-amber-400 print:hidden shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300 mb-1">
              <span>DELED 2026</span>
              <span>•</span>
              <span>EXAMINATION SEAT ALLOTMENT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <FaChair className="text-amber-400 w-7 h-7" />
              <span>परीक्षा सीट मैट्रिक्स (Seat Matrix & Room Layout)</span>
            </h1>
            <p className="text-sm sm:text-base text-blue-100 mt-1 max-w-3xl">
              अभ्यर्थी, केंद्र व्यवस्थापक एवं कक्ष निरीक्षक यहाँ से परीक्षा शहर, केंद्र अथवा कक्ष संख्या चुनकर परीक्षार्थियों की बैठक व्यवस्था देख सकते हैं।
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 w-full flex-1">
        {/* Back Navigation Bar (Appears whenever searching, selecting room, or having previous view) */}
        {hasDrillDown && (
          <div className="mb-4 bg-amber-50 border-2 border-amber-300 rounded-xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs print:hidden animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={handleBackToPrevious}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black rounded-lg shadow transition cursor-pointer text-xs sm:text-sm"
              >
                <FaArrowLeft className="w-3.5 h-3.5 text-slate-950" />
                <span>← Previous View (वापस जाएं)</span>
              </button>

              <div className="text-xs text-amber-950 font-semibold flex items-center gap-2 flex-wrap">
                <span className="text-gray-500">Active View:</span>
                {selectedRoom && (
                  <span className="bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded">
                    Room: {selectedRoom}
                  </span>
                )}
                {searchTerm && (
                  <span className="bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded">
                    Filter: "{searchTerm}"
                  </span>
                )}
                {selectedCentre && (
                  <span className="bg-white text-gray-700 border border-amber-200 px-2 py-0.5 rounded">
                    Centre: {matrixData.summary.selectedCentreName || selectedCentre}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleClearFilters}
              className="text-xs font-bold text-red-700 hover:text-red-900 flex items-center gap-1 cursor-pointer underline"
            >
              <FaUndo className="w-3 h-3" /> Reset All Filters
            </button>
          </div>
        )}

        {/* Quick Candidate Finder Card */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-amber-50/40 border border-blue-200 rounded-xl p-4 sm:p-5 mb-6 shadow-sm print:hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-base">
                <FaSearch className="text-blue-600 w-4 h-4" />
                <span>त्वरित परीक्षार्थी खोज (Quick Candidate Seat Finder)</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                अपना अनुक्रमांक (Roll No), पंजीकरण संख्या (Reg No) या नाम दर्ज कर अपना परीक्षा कक्ष एवं सीट संख्या तुरंत जानें।
              </p>
            </div>

            <form onSubmit={handleLookup} className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  placeholder="Roll No / Reg No / Name..."
                  className="w-full px-3.5 py-2 pl-9 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
                />
                <FaSearch className="absolute left-3 top-3 text-gray-400 w-3.5 h-3.5" />
              </div>
              <button
                type="submit"
                disabled={lookupLoading}
                className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {lookupLoading ? <Spin size="small" /> : <FaCheckCircle className="w-4 h-4" />}
                <span>Find Seat</span>
              </button>
            </form>
          </div>

          {lookupError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs sm:text-sm flex items-center gap-2">
              <FaInfoCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{lookupError}</span>
            </div>
          )}

          {/* Lookup Results Popup / Card */}
          {lookupResult && lookupResult.length > 0 && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Matched Allotments ({lookupResult.length})</span>
                <button
                  onClick={() => setLookupResult(null)}
                  className="text-gray-400 hover:text-gray-600 text-xs flex items-center gap-1 cursor-pointer"
                >
                  <FaTimes className="w-3 h-3" /> Dismiss
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {lookupResult.map((c) => (
                  <div
                    key={c.allotmentId}
                    className="bg-white border-2 border-blue-400 rounded-lg p-3.5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded">
                          Roll: {c.rollNumber}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">Reg: {c.registrationNo}</span>
                      </div>
                      <h4 className="font-extrabold text-gray-900 text-base">{c.fullName}</h4>
                      <p className="text-xs text-gray-600">Father: {c.fatherName}</p>

                      <div className="mt-2.5 pt-2.5 border-t border-gray-100 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <FaBuilding className="text-blue-500 w-3 h-3 shrink-0" />
                          <span className="font-medium truncate">{c.centreName || `Centre ${c.centreCode}`}</span>
                        </div>
                        <div className="flex items-center justify-between text-blue-900 font-bold bg-blue-50 p-2 rounded">
                          <span className="flex items-center gap-1">
                            <FaDoorOpen className="text-blue-600 w-3.5 h-3.5" /> Room: {c.roomNumber || "N/A"}
                          </span>
                          <span className="flex items-center gap-1">
                            <FaChair className="text-amber-600 w-3.5 h-3.5" /> Seat: {c.seatNumber || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectFromLookup(c)}
                      className="mt-3 w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs"
                    >
                      <FaThLarge className="w-3 h-3" />
                      <span>View in Room Layout</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Filters Bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-xs mb-6 print:hidden">
          <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <FaFilter className="text-blue-600 w-3.5 h-3.5" />
              <span>फ़िल्टर विकल्प (Filter Seat Matrix)</span>
            </div>
            {(selectedCity || selectedCentre || selectedRoom || searchTerm) && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <FaTimes className="w-3 h-3" /> Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Filter: Exam City */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                परीक्षा शहर (Exam City)
              </label>
              <select
                value={selectedCity}
                onChange={(e) => {
                  saveCurrentFiltersAsPrev();
                  setSelectedCity(e.target.value);
                  setSelectedCentre("");
                  setSelectedRoom("");
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- सभी परीक्षा शहर (All Cities) --</option>
                {filterOptions.cities.map((city) => (
                  <option key={city.cityCode} value={city.cityCode}>
                    {city.cityCode} - {city.cityName} ({city.candidateCount} Seats)
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Exam Centre */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                परीक्षा केंद्र (Exam Centre)
              </label>
              <select
                value={selectedCentre}
                disabled={!selectedCity}
                onChange={(e) => {
                  saveCurrentFiltersAsPrev();
                  setSelectedCentre(e.target.value);
                  setSelectedRoom("");
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!selectedCity
                    ? "-- पहले परीक्षा शहर चुनें (Select City First) --"
                    : "-- परीक्षा केंद्र चुनें (Select Exam Centre) --"}
                </option>
                {availableCentres.map((centre) => (
                  <option key={`${centre.cityCode}-${centre.centreCode}`} value={centre.centreCode}>
                    {centre.centreCode} - {centre.centreName} ({centre.candidateCount} Seats)
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Room Number */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                कक्ष संख्या (Room Number)
              </label>
              <select
                value={selectedRoom}
                disabled={!selectedCity || !selectedCentre}
                onChange={(e) => {
                  saveCurrentFiltersAsPrev();
                  setSelectedRoom(e.target.value);
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!selectedCity
                    ? "-- पहले परीक्षा शहर चुनें --"
                    : !selectedCentre
                    ? "-- पहले परीक्षा केंद्र चुनें --"
                    : "-- सभी कक्ष (All Rooms) --"}
                </option>
                {availableRooms.map((r) => (
                  <option key={`${r.cityCode}-${r.centreCode}-${r.roomNumber}`} value={r.roomNumber}>
                    Room {r.roomNumber} ({r.candidateCount} Candidates)
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Candidate Search */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                खोजें (Roll / Reg / Name)
              </label>
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type & press Enter..."
                  className="w-full px-3 py-2 pl-8 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <FaSearch className="absolute left-2.5 top-3 text-gray-400 w-3 h-3" />
              </form>
            </div>
          </div>
        </div>

        {/* If Filter is NOT ready (Neither City+Centre selected, nor Search entered) */}
        {!isFilterReady ? (
          <div className="bg-white border-2 border-dashed border-blue-200 rounded-2xl p-8 sm:p-12 text-center shadow-xs my-4">
            {!selectedCity ? (
              <div>
                <div className="w-16 h-16 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#085f9e] shadow-xs">
                  <FaBuilding className="w-8 h-8" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2">
                  परीक्षा शहर एवं परीक्षा केंद्र का चयन करें
                </h3>
                <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto mb-6">
                  कक्ष संख्या (Rooms) एवं परीक्षार्थियों की बैठक व्यवस्था (Seat Matrix) देखने के लिए कृपया ऊपर दिए गए फ़िल्टर से <strong>परीक्षा शहर (Exam City)</strong> एवं <strong>परीक्षा केंद्र (Exam Centre)</strong> का चयन करें।
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
                  <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">1</span>
                    <div>
                      <h4 className="font-bold text-xs text-blue-900 uppercase">Step 1: Exam City</h4>
                      <p className="text-[11px] text-gray-600 mt-0.5">पहले परीक्षा शहर चुनें</p>
                    </div>
                  </div>
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0">2</span>
                    <div>
                      <h4 className="font-bold text-xs text-amber-900 uppercase">Step 2: Exam Centre</h4>
                      <p className="text-[11px] text-gray-600 mt-0.5">इसके बाद परीक्षा केंद्र चुनें</p>
                    </div>
                  </div>
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">3</span>
                    <div>
                      <h4 className="font-bold text-xs text-emerald-900 uppercase">Step 3: Seat Matrix</h4>
                      <p className="text-[11px] text-gray-600 mt-0.5">कक्ष एवं सीट योजना देखें</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-600 shadow-xs">
                  <FaDoorOpen className="w-8 h-8" />
                </div>
                <div className="inline-block px-3 py-1 bg-blue-100 text-blue-900 font-bold text-xs rounded-full uppercase mb-2">
                  City Selected: {filterOptions.cities.find((c) => c.cityCode === selectedCity)?.cityName || selectedCity}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2">
                  कृपया परीक्षा केंद्र (Exam Centre) का चयन करें
                </h3>
                <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto">
                  कक्ष एवं परीक्षार्थियों की बैठक व्यवस्था देखने के लिए कृपया ऊपर दिए गए ड्रॉपडाउन से <strong>परीक्षा केंद्र (Exam Centre)</strong> चुनें।
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Toolbar: Summary + Layout Format (4x6 / 6x4 / Auto) + View Toggle */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
              {/* Summary Stats */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-semibold text-gray-600">
                  कुल आवंटित परीक्षार्थी: <strong className="text-blue-900 font-extrabold text-base">{matrixData.summary.totalCandidates}</strong>
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-sm font-semibold text-gray-600">
                  कुल कक्ष: <strong className="text-blue-900 font-extrabold text-base">{matrixData.summary.totalRooms}</strong>
                </span>
                {matrixData.summary.minRollNumber && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded">
                      Roll Range: {matrixData.summary.minRollNumber} - {matrixData.summary.maxRollNumber}
                    </span>
                  </>
                )}
              </div>

              {/* Right Controls: Layout Format Selector & View Mode */}
              <div className="flex items-center gap-3 flex-wrap print:hidden self-end lg:self-auto">
                {/* Grid Layout Format Toggle (6x4 vs 4x6 vs Auto) */}
                {viewMode === "grid" && (
                  <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <span className="text-[11px] font-bold text-gray-500 uppercase px-2 flex items-center gap-1">
                      <FaTh className="w-2.5 h-2.5 text-gray-400" />
                      <span>प्रारूप (Format):</span>
                    </span>
                    <button
                      onClick={() => setLayoutFormat("auto")}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                        layoutFormat === "auto"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-gray-700 hover:bg-gray-200"
                      }`}
                      title="Default DB Seating Order"
                    >
                      Auto
                    </button>
                    <button
                      onClick={() => setLayoutFormat("6x4")}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                        layoutFormat === "6x4"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-gray-700 hover:bg-gray-200"
                      }`}
                      title="6 Seats per Row × 4 Rows"
                    >
                      6 × 4
                    </button>
                    <button
                      onClick={() => setLayoutFormat("4x6")}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                        layoutFormat === "4x6"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-gray-700 hover:bg-gray-200"
                      }`}
                      title="4 Seats per Row × 6 Rows"
                    >
                      4 × 6
                    </button>
                  </div>
                )}

                {/* View Mode Toggle: Grid vs Table */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <FaThLarge className="w-3.5 h-3.5" />
                    <span>Room Grid</span>
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                      viewMode === "table"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <FaList className="w-3.5 h-3.5" />
                    <span>List Table</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Print-Only Official Header */}
            <div className="hidden print:block mb-6 text-center border-b-2 border-gray-800 pb-4">
              <h2 className="text-xl font-black uppercase tracking-tight">UTTARAKHAND BOARD OF SCHOOL EDUCATION, RAMNAGAR (NAINITAL)</h2>
              <h3 className="text-base font-bold">D.El.Ed. ENTRANCE EXAMINATION 2026 - SEATING PLAN / MATRIX</h3>
              <div className="mt-2 text-xs font-semibold flex items-center justify-around">
                <span>City: {matrixData.summary.selectedCityName || matrixData.summary.selectedCityCode || "All"}</span>
                <span>Centre: {matrixData.summary.selectedCentreName || matrixData.summary.selectedCentreCode || "All"}</span>
                <span>Room: {matrixData.summary.selectedRoomNumber || "All Rooms"}</span>
                <span>Total Candidates: {matrixData.summary.totalCandidates}</span>
              </div>
            </div>

            {/* Content Area */}
            {loadingMatrix ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Spin size="large" />
                <p className="text-sm font-semibold text-gray-600">सीट मैट्रिक्स लोड हो रहा है, कृपया प्रतीक्षा करें...</p>
              </div>
            ) : matrixData.summary.totalCandidates === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-xs">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
                  <FaChair className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-extrabold text-gray-800 mb-1">कोई सीट आवंटन रिकॉर्ड नहीं मिला</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
                  चयनित फ़िल्टर के अनुसार कोई परीक्षार्थी उपलब्ध नहीं है। कृपया फ़िल्टर बदलें या सभी विकल्प रीसेट करें।
                </p>
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm shadow cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : viewMode === "grid" ? (
          /* ============================================================== */
          /* GRID VIEW: ROOM-WISE SEATING MATRICES WITH VISUAL BIFURCATION  */
          /* ============================================================== */
          <div className="space-y-8">
            {/* Quick Room Selector Tabs */}
            {matrixData.roomSummaries && matrixData.roomSummaries.length > 1 && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs print:hidden">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FaDoorOpen className="text-blue-600 w-3.5 h-3.5" />
                    <span>कक्ष चुनें (Select Room):</span>
                  </span>
                  {selectedRoom && (
                    <button
                      onClick={() => handleRoomTabClick("")}
                      className="text-xs text-blue-600 hover:underline font-bold cursor-pointer"
                    >
                      Show All Rooms (सभी कक्ष दिखाएं)
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleRoomTabClick("")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      !selectedRoom
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100"
                    }`}
                  >
                    All Rooms ({matrixData.roomSummaries.length})
                  </button>
                  {matrixData.roomSummaries.map((rs) => (
                    <button
                      key={rs.roomNumber}
                      onClick={() => handleRoomTabClick(String(rs.roomNumber))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
                        selectedRoom === String(rs.roomNumber)
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100"
                      }`}
                    >
                      <FaDoorOpen className="w-3 h-3" />
                      <span>Room {rs.roomNumber}</span>
                      <span className="text-[10px] bg-white text-blue-800 px-1.5 py-0.2 rounded-full font-mono font-bold">
                        {rs.totalCandidates}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Render Each Room with Clear Visual Bifurcation */}
            {roomGroups.map((room, roomIdx) => {
              const isSingleRoomFocused = Boolean(selectedRoom);

              return (
                <div
                  key={room.roomNumber ?? roomIdx}
                  className="bg-white border-2 border-blue-200 rounded-2xl shadow-sm overflow-hidden transition-all"
                >
                  {/* Visual Bifurcation Room Header */}
                  <div className="bg-gradient-to-r from-[#074b7c] via-[#085f9e] to-[#0b72be] text-white p-4 sm:p-5 border-b-4 border-amber-400">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Left: Big Room Badge & Subtitle */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-xs rounded-xl flex items-center justify-center shrink-0 border border-white/30 text-amber-300 shadow-inner">
                          <FaDoorOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                              ROOM {room.roomNumber || "ALL"}
                            </h3>
                            <span className="text-xs font-bold bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              {room.totalCandidates} Candidates Allotted
                            </span>
                          </div>
                          <p className="text-xs text-blue-100 mt-0.5 font-medium">
                            Centre: {room.centreName || `Centre ${room.centreCode}`} • City: {room.cityName || `City ${room.cityCode}`}
                          </p>
                        </div>
                      </div>

                      {/* Middle & Right: Roll Range & Action */}
                      <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
                        {room.minRoll && (
                          <div className="bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg text-xs font-mono">
                            <span className="text-blue-200 mr-1.5">Roll:</span>
                            <strong className="text-white">{room.minRoll}</strong>
                            <span className="text-blue-300 mx-1">→</span>
                            <strong className="text-white">{room.maxRoll}</strong>
                          </div>
                        )}

                        {/* Room Focus / Back Button */}
                        {!isSingleRoomFocused ? (
                          <button
                            onClick={() => handleRoomTabClick(String(room.roomNumber))}
                            className="px-3 py-1.5 bg-white text-blue-900 hover:bg-blue-50 rounded-lg text-xs font-bold shadow-xs transition cursor-pointer print:hidden flex items-center gap-1.5"
                          >
                            <span>Focus this Room</span>
                            <FaArrowRight className="w-2.5 h-2.5" />
                          </button>
                        ) : (
                          <button
                            onClick={handleBackToPrevious}
                            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-black shadow-xs transition cursor-pointer print:hidden flex items-center gap-1.5"
                          >
                            <FaArrowLeft className="w-2.5 h-2.5" />
                            <span>Back to All Rooms</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Room Interior Content */}
                  <div className="p-4 sm:p-6 bg-[#fafcff]">
                    {/* Classroom Front Blackboard / Entrance Marker */}
                    <div className="max-w-md mx-auto mb-6">
                      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-800 text-emerald-100 py-2 px-4 rounded-xl shadow-xs text-center border-b-4 border-emerald-950 flex items-center justify-center gap-2">
                        <FaChalkboardTeacher className="w-4 h-4 text-emerald-300" />
                        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-white">
                          [ परीक्षा कक्ष प्रवेश द्वार / श्यामपट्ट (Front / Blackboard / Entrance) ]
                        </span>
                      </div>
                    </div>

                    {/* Interactive Seat Matrix Grid (Strictly 1 Row per Row) */}
                    <div className="overflow-x-auto pb-4">
                      <div className="space-y-3 min-w-max">
                        {room.gridRows.map((row) => (
                          <div
                            key={row.rowNumber}
                            className="flex items-center gap-3 py-1"
                          >
                            {/* Row Label */}
                            <div className="w-16 sm:w-20 shrink-0 flex items-center justify-center">
                              <span className="text-xs font-black uppercase tracking-wider text-gray-700 bg-gray-100 border border-gray-200 px-2.5 py-2 rounded-md shadow-2xs whitespace-nowrap">
                                ROW {row.rowNumber}
                              </span>
                            </div>

                            {/* Seats in this row - strictly ONE single row */}
                            <div
                              className="grid gap-2.5 sm:gap-3 flex-1"
                              style={{
                                gridTemplateColumns: `repeat(${room.maxCols}, minmax(210px, 1fr))`,
                              }}
                            >
                              {row.seats.map((seat) => {
                                const cand = seat.candidate;
                                if (!cand) return null;

                                return (
                                  <div
                                    key={seat.seatIndex}
                                    onClick={() => setSelectedCandidate(cand)}
                                    className="group relative bg-white hover:bg-blue-50/50 border-2 border-sky-300 hover:border-blue-600 rounded-xl p-3 shadow-2xs hover:shadow-md transition-all cursor-pointer select-none flex flex-col justify-between"
                                  >
                                    {/* Seat Header: Desk No and Roll Badge */}
                                    <div className="flex items-center justify-between mb-2 gap-1">
                                      <span className="text-[11px] font-black text-blue-900 bg-blue-100/90 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                                        <FaChair className="w-2.5 h-2.5 text-blue-700" />
                                        <span>Seat #{seat.seatNumber}</span>
                                      </span>
                                      <span className="font-mono text-xs font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded shrink-0">
                                        {cand.rollNumber}
                                      </span>
                                    </div>

                                    {/* Candidate Name */}
                                    <h4
                                      className="font-extrabold text-gray-900 text-xs sm:text-sm truncate group-hover:text-blue-900 uppercase tracking-tight"
                                      title={cand.fullName}
                                    >
                                      {cand.fullName}
                                    </h4>

                                    {/* Father Name / Reg No */}
                                    <p
                                      className="text-[11px] text-gray-500 truncate mt-0.5 font-medium"
                                      title={`S/D/W: ${cand.fatherName}`}
                                    >
                                      S/D/W: {cand.fatherName}
                                    </p>

                                    {/* Meta Info Badges */}
                                    {(() => {
                                      const candIsPH = Boolean(cand.isPhysicallyHandicapped ?? cand.IsPhysicallyHandicapped);
                                      const candIsScribe = Boolean(cand.scribeRequired ?? cand.ScribeRequired);
                                      const candDisability = cand.disabilityType || cand.DisabilityType || "";
                                      return (
                                        <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-600 gap-1 flex-wrap">
                                          <span className="font-mono font-medium text-gray-600 truncate">
                                            {cand.registrationNo}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            {candIsPH && (
                                              <span
                                                className="font-black text-[9px] bg-purple-100 text-purple-800 border border-purple-200 px-1 py-0.2 rounded flex items-center gap-0.5"
                                                title={`PH: ${candDisability || "Yes"}`}
                                              >
                                                <FaWheelchair className="w-2.5 h-2.5" /> PH
                                              </span>
                                            )}
                                            {candIsScribe && (
                                              <span
                                                className="font-black text-[9px] bg-rose-100 text-rose-800 border border-rose-200 px-1 py-0.2 rounded flex items-center gap-0.5"
                                                title="Scribe Required"
                                              >
                                                <FaPenFancy className="w-2.5 h-2.5" /> Scribe
                                              </span>
                                            )}
                                            {cand.category && (
                                              <span
                                                className="font-bold text-blue-900 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded truncate max-w-[110px]"
                                                title={cand.category}
                                              >
                                                {cand.category}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ============================================================== */
          /* TABLE VIEW: TABULAR CANDIDATE SEATING DIRECTORY                 */
          /* ============================================================== */
          <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#085f9e] text-white uppercase text-[11px] font-bold tracking-wider">
                    <th className="py-3 px-3 border-b border-blue-800 text-center w-12">#</th>
                    <th className="py-3 px-3 border-b border-blue-800">Roll Number</th>
                    <th className="py-3 px-3 border-b border-blue-800">Reg No</th>
                    <th className="py-3 px-3 border-b border-blue-800">Candidate Name</th>
                    <th className="py-3 px-3 border-b border-blue-800">Father's Name</th>
                    <th className="py-3 px-3 border-b border-blue-800">Exam City</th>
                    <th className="py-3 px-3 border-b border-blue-800">Centre</th>
                    <th className="py-3 px-3 border-b border-blue-800 text-center">Room No</th>
                    <th className="py-3 px-3 border-b border-blue-800 text-center">Seat / Desk</th>
                    <th className="py-3 px-3 border-b border-blue-800">Category</th>
                    <th className="py-3 px-3 border-b border-blue-800 text-center print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {matrixData.candidates.map((cand, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr
                        key={cand.allotmentId}
                        className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedCandidate(cand)}
                      >
                        <td className="py-2.5 px-3 text-center text-gray-500 font-mono">{rowNumber}</td>
                        <td className="py-2.5 px-3 font-mono font-black text-blue-900">{cand.rollNumber}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-600">{cand.registrationNo}</td>
                        <td className="py-2.5 px-3 font-bold text-gray-900">
                          {(() => {
                            const isCandPH = Boolean(cand.isPhysicallyHandicapped ?? cand.IsPhysicallyHandicapped);
                            const isCandScribe = Boolean(cand.scribeRequired ?? cand.ScribeRequired);
                            const candDis = cand.disabilityType || cand.DisabilityType || "";
                            return (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{cand.fullName}</span>
                                {isCandPH && (
                                  <span
                                    className="font-black text-[9px] bg-purple-100 text-purple-800 border border-purple-200 px-1 py-0.2 rounded inline-flex items-center gap-0.5"
                                    title={`PH: ${candDis || "Yes"}`}
                                  >
                                    <FaWheelchair className="w-2.5 h-2.5" /> PH
                                  </span>
                                )}
                                {isCandScribe && (
                                  <span
                                    className="font-black text-[9px] bg-rose-100 text-rose-800 border border-rose-200 px-1 py-0.2 rounded inline-flex items-center gap-0.5"
                                    title="Scribe Required"
                                  >
                                    <FaPenFancy className="w-2.5 h-2.5" /> Scribe
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">{cand.fatherName}</td>
                        <td className="py-2.5 px-3 text-gray-700">{cand.cityName || cand.cityCode}</td>
                        <td className="py-2.5 px-3 text-gray-700 max-w-[200px] truncate" title={cand.centreName}>
                          {cand.centreName || cand.centreCode}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-extrabold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                            {cand.roomNumber || "-"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                            {cand.seatNumber ? `#${cand.seatNumber}` : "-"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">{cand.category || "-"}</td>
                        <td className="py-2.5 px-3 text-center print:hidden" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedCandidate(cand)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded text-xs font-bold transition cursor-pointer"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {matrixData.pagination.totalPages > 1 && (
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
                <span className="text-xs text-gray-600">
                  Showing Page <strong>{matrixData.pagination.page}</strong> of{" "}
                  <strong>{matrixData.pagination.totalPages}</strong> ({matrixData.pagination.totalCount} total)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => fetchMatrixData(currentPage - 1, pageSize)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                  >
                    <FaArrowLeft className="w-3 h-3" /> Prev
                  </button>
                  <span className="text-xs font-bold text-gray-800 px-2">
                    {currentPage} / {matrixData.pagination.totalPages}
                  </span>
                  <button
                    disabled={currentPage >= matrixData.pagination.totalPages}
                    onClick={() => fetchMatrixData(currentPage + 1, pageSize)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                  >
                    Next <FaArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </>
    )}

        {/* Candidate Detail Modal */}
        {selectedCandidate && (
          <div
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
            onClick={() => setSelectedCandidate(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                    <FaUserGraduate className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg leading-tight">{selectedCandidate.fullName}</h3>
                    <p className="text-xs text-blue-200 font-mono">Roll No: {selectedCandidate.rollNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 text-sm">
                {/* Seating Highlight Card */}
                <div className="bg-gradient-to-br from-amber-50 to-blue-50 border-2 border-amber-300 rounded-xl p-4 flex items-center justify-around text-center">
                  <div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase block">Room Number</span>
                    <strong className="text-2xl font-black text-blue-900">
                      {selectedCandidate.roomNumber || "N/A"}
                    </strong>
                  </div>
                  <div className="w-px h-10 bg-amber-200"></div>
                  <div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase block">Seat / Desk</span>
                    <strong className="text-2xl font-black text-amber-700">
                      #{selectedCandidate.seatNumber || selectedCandidate.rollNumber}
                    </strong>
                  </div>
                  <div className="w-px h-10 bg-amber-200"></div>
                  <div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase block">Seat Row</span>
                    <strong className="text-2xl font-black text-gray-800">
                      {selectedCandidate.seatRow || "Row 1"}
                    </strong>
                  </div>
                </div>

                {/* Special Assistance Banner (PH / Scribe) */}
                {(() => {
                  const candIsPH = Boolean(selectedCandidate.isPhysicallyHandicapped ?? selectedCandidate.IsPhysicallyHandicapped);
                  const candIsScribe = Boolean(selectedCandidate.scribeRequired ?? selectedCandidate.ScribeRequired);
                  const candDisability = selectedCandidate.disabilityType || selectedCandidate.DisabilityType || "";
                  const candMultiDisability = selectedCandidate.multiDisabilityType || selectedCandidate.MultiDisabilityType || "";

                  return (
                    <>
                      {(candIsPH || candIsScribe) && (
                        <div className="bg-purple-50 border border-purple-300 rounded-xl p-3.5 flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-200 flex items-center justify-center shrink-0 text-purple-800">
                            <FaWheelchair className="w-4 h-4" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <h4 className="font-extrabold text-xs text-purple-950 uppercase tracking-wide">
                              Special Assistance Candidate / दिव्यांग परीक्षार्थी
                            </h4>
                            <div className="flex flex-wrap gap-2 text-xs pt-0.5">
                              {candIsPH && (
                                <span className="bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded font-bold">
                                  PH: {candDisability || "Yes"}
                                  {candMultiDisability ? ` (${candMultiDisability})` : ""}
                                </span>
                              )}
                              {candIsScribe && (
                                <span className="bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 rounded font-black flex items-center gap-1">
                                  <FaPenFancy className="w-3 h-3 text-rose-700" />
                                  Scribe Required / लेखक आवश्यक
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Candidate Info Grid */}
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-medium">Registration Number:</span>
                          <span className="font-mono font-bold text-gray-800">{selectedCandidate.registrationNo}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-medium">Father's Name:</span>
                          <span className="font-bold text-gray-800">{selectedCandidate.fatherName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-medium">Category / Gender:</span>
                          <span className="font-bold text-gray-800">
                            {selectedCandidate.category || "General"} / {selectedCandidate.gender || "N/A"}
                          </span>
                        </div>

                        {/* PH & Scribe Info */}
                        <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                          <span className="text-gray-500 font-medium">Physically Handicapped (PH):</span>
                          {candIsPH ? (
                            <span className="font-bold text-purple-800 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded">
                              YES {candDisability ? `— ${candDisability}` : ""}
                            </span>
                          ) : (
                            <span className="font-semibold text-gray-600">No</span>
                          )}
                        </div>

                        {candMultiDisability && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 font-medium">Multi-Disability Type:</span>
                            <span className="font-bold text-purple-900">{candMultiDisability}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-medium">Scribe Required:</span>
                          {candIsScribe ? (
                            <span className="font-black text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded inline-flex items-center gap-1">
                              <FaPenFancy className="w-2.5 h-2.5 text-rose-600" /> YES (Required / आवश्यक)
                            </span>
                          ) : (
                            <span className="font-semibold text-gray-600">No</span>
                          )}
                        </div>
                        <div className="pt-2 border-t border-gray-200">
                          <span className="text-gray-500 font-medium block mb-0.5">Exam Centre:</span>
                          <span className="font-bold text-gray-900 block">{selectedCandidate.centreName}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 font-medium block mb-0.5">Exam City:</span>
                          <span className="font-bold text-gray-900 block">{selectedCandidate.cityName}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end">
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
