import React, { useState, useEffect } from "react";
import { api } from "../stores/apiStore";
import { notification } from "antd";
import {
  FaSearch,
  FaFilter,
  FaFileCsv,
  FaEye,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaClock,
  FaFilePdf,
  FaLock,
  FaSync,
  FaList,
  FaChartBar,
  FaTimes,
  FaUser,
  FaSave,
  FaQuestionCircle,
} from "react-icons/fa";

const BOOKLET_SERIES = ["All", "A", "B", "C", "D"];
const STATUS_OPTIONS = ["All", "Submitted", "Under Review", "Accepted", "Rejected"];

const AdminObjectionTracker = () => {
  // View mode: 'table' or 'summary'
  const [viewMode, setViewMode] = useState("table");

  // Data state
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [kpi, setKpi] = useState({
    totalObjections: 0,
    uniqueCandidates: 0,
    distinctQuestions: 0,
    finalSubmittedCount: 0,
    draftCount: 0,
    underReviewCount: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    submittedCount: 0,
  });

  // Question-wise summary data
  const [summaryData, setSummaryData] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [questionFilter, setQuestionFilter] = useState("");
  const [finalSubmitFilter, setFinalSubmitFilter] = useState("All");

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("Under Review");
  const [bulkRemarks, setBulkRemarks] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Single review modal
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("Submitted");
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Proof document modal
  const [proofModalUrl, setProofModalUrl] = useState(null);
  const [proofModalTitle, setProofModalTitle] = useState("");

  // Fetch individual submissions
  const fetchObjections = async (targetPage = page) => {
    try {
      setLoading(true);
      const params = {
        page: targetPage,
        pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (seriesFilter !== "All") params.bookletSeries = seriesFilter;
      if (statusFilter !== "All") params.status = statusFilter;
      if (questionFilter && !isNaN(parseInt(questionFilter, 10))) {
        const qNum = parseInt(questionFilter, 10);
        if (qNum >= 1 && qNum <= 200) {
          params.questionNo = qNum;
        }
      }
      if (finalSubmitFilter !== "All") params.isFinalSubmitted = finalSubmitFilter === "Final Submitted";

      const res = await api.get("/api/AdminObjection", { params });
      if (res.data) {
        setItems(res.data.items || []);
        setTotalCount(res.data.totalCount || 0);
        setPage(res.data.page || 1);
        setTotalPages(res.data.totalPages || 1);
        if (res.data.kpi) setKpi(res.data.kpi);
      }
    } catch (err) {
      console.error("Error fetching admin objections:", err);
      notification.error({
        message: "Failed to Fetch Objections",
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch grouped question summary
  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      const params = {};
      if (seriesFilter !== "All") params.bookletSeries = seriesFilter;

      const res = await api.get("/api/AdminObjection/count-summary", { params });
      if (res.data) {
        setSummaryData(res.data);
      }
    } catch (err) {
      console.error("Error fetching count summary:", err);
      notification.error({
        message: "Failed to load question summary",
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "table") {
      fetchObjections(1);
    } else {
      fetchSummary();
    }
  }, [viewMode, seriesFilter, statusFilter, finalSubmitFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (questionFilter) {
      const q = parseInt(questionFilter, 10);
      if (isNaN(q) || q < 1 || q > 200) {
        notification.warning({
          message: "Invalid Question Filter",
          description: "Question Number must be between 1 and 200.",
        });
        return;
      }
    }
    if (viewMode === "table") {
      fetchObjections(1);
    } else {
      fetchSummary();
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setSeriesFilter("All");
    setStatusFilter("All");
    setQuestionFilter("");
    setFinalSubmitFilter("All");
    setSelectedIds([]);
  };

  // Selection toggle
  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(items.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Bulk status update
  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) {
      notification.warning({ message: "No rows selected", description: "Please select at least one objection." });
      return;
    }
    try {
      setBulkSubmitting(true);
      const res = await api.post("/api/AdminObjection/bulk-status", {
        ids: selectedIds,
        status: bulkStatus,
        remarks: bulkRemarks || null,
      });

      notification.success({
        message: "Bulk Status Updated",
        description: res.data?.message || `Updated ${selectedIds.length} objections.`,
      });
      setSelectedIds([]);
      setBulkRemarks("");
      await fetchObjections(page);
    } catch (err) {
      notification.error({
        message: "Bulk Update Failed",
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Single status review
  const openReviewModal = (item) => {
    setReviewItem(item);
    setReviewStatus(item.status || "Submitted");
    setReviewRemarks(item.adminRemarks || "");
  };

  const handleSaveReview = async () => {
    if (!reviewItem) return;
    try {
      setReviewSubmitting(true);
      await api.post(`/api/AdminObjection/${reviewItem.id}/status`, {
        status: reviewStatus,
        remarks: reviewRemarks || null,
      });

      notification.success({
        message: "Status Updated",
        description: `Objection for Question #${reviewItem.questionNo} updated to '${reviewStatus}'.`,
      });
      setReviewItem(null);
      await fetchObjections(page);
    } catch (err) {
      notification.error({
        message: "Update Failed",
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Proof viewer
  const handleViewProof = async (id, title) => {
    try {
      const res = await api.get(`/api/AdminObjection/document/${id}`, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);
      setProofModalUrl(blobUrl);
      setProofModalTitle(title || `Document for Objection #${id}`);
    } catch (err) {
      notification.error({
        message: "Unable to load document",
        description: err.response?.data?.message || "File could not be found or read.",
      });
    }
  };

  // CSV Export
  const handleExportCsv = async () => {
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (seriesFilter !== "All") params.bookletSeries = seriesFilter;
      if (statusFilter !== "All") params.status = statusFilter;
      if (questionFilter) params.questionNo = parseInt(questionFilter, 10);

      const res = await api.get("/api/AdminObjection/export", {
        params,
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `UKDELED_Objections_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      notification.success({ message: "CSV Export Started", description: "File downloaded successfully." });
    } catch (err) {
      notification.error({ message: "Export Failed", description: err.message });
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase">
              UK D.El.Ed. Entrance Exam 2026
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              Answer Key Objections (Q. 1 - 200)
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            उत्तर कुंजी आपत्ति प्रबंधन ट्रैकर
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor, review, filter, and bulk process candidate provisional answer key challenges across questions 1 to 200.
          </p>
        </div>

        {/* View Toggle & Refresh / Export */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-200/70 p-1 rounded-xl flex items-center">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FaList /> Submissions
            </button>
            <button
              type="button"
              onClick={() => setViewMode("summary")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === "summary"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FaChartBar /> Question Summary
            </button>
          </div>

          <button
            type="button"
            onClick={() => (viewMode === "table" ? fetchObjections(page) : fetchSummary())}
            className="p-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition cursor-pointer"
            title="Refresh Data"
          >
            <FaSync className={loading || summaryLoading ? "animate-spin" : ""} />
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FaFileCsv /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Total Objections</span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">{kpi.totalObjections}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{kpi.finalSubmittedCount} Locked</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Candidates</span>
          <span className="text-xl font-extrabold text-blue-700 mt-1 block">{kpi.uniqueCandidates}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Unique Challengers</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Questions</span>
          <span className="text-xl font-extrabold text-indigo-700 mt-1 block">{kpi.distinctQuestions}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Questions Contested (1-200)</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Submitted</span>
          <span className="text-xl font-extrabold text-sky-600 mt-1 block">{kpi.submittedCount}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Pending Review</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Under Review</span>
          <span className="text-xl font-extrabold text-purple-600 mt-1 block">{kpi.underReviewCount}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">With Committee</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Accepted</span>
          <span className="text-xl font-extrabold text-emerald-600 mt-1 block">{kpi.acceptedCount}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Approved Claims</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Rejected</span>
          <span className="text-xl font-extrabold text-rose-600 mt-1 block">{kpi.rejectedCount}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Disallowed Claims</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Search Candidate Name, Reg No, Roll No..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Series Filter */}
          <div className="sm:col-span-2">
            <select
              value={seriesFilter}
              onChange={(e) => setSeriesFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500"
            >
              {BOOKLET_SERIES.map((s) => (
                <option key={s} value={s}>
                  Series: {s}
                </option>
              ))}
            </select>
          </div>

          {/* Question No Filter (1-200) */}
          <div className="sm:col-span-2">
            <input
              type="number"
              min="1"
              max="200"
              placeholder="Q. No (1-200)"
              value={questionFilter}
              onChange={(e) => setQuestionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  Status: {st}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="sm:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex-1"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="p-2 border border-slate-300 rounded-xl text-slate-500 hover:bg-slate-100 text-xs cursor-pointer"
              title="Reset Filters"
            >
              <FaTimes />
            </button>
          </div>
        </form>

        {/* Bulk Action Toolbar */}
        {selectedIds.length > 0 && viewMode === "table" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-blue-700 text-white rounded-lg text-xs font-extrabold">
                {selectedIds.length} Selected
              </span>
              <span className="text-xs font-semibold text-blue-900">
                Bulk action on selected objections:
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="px-3 py-1.5 border border-blue-300 rounded-lg text-xs font-semibold bg-white text-slate-800"
              >
                <option value="Under Review">Mark Under Review</option>
                <option value="Accepted">Mark Accepted</option>
                <option value="Rejected">Mark Rejected</option>
                <option value="Submitted">Mark Submitted</option>
              </select>

              <input
                type="text"
                placeholder="Committee Remarks (optional)..."
                value={bulkRemarks}
                onChange={(e) => setBulkRemarks(e.target.value)}
                className="px-3 py-1.5 border border-blue-300 rounded-lg text-xs bg-white text-slate-800 w-56"
              />

              <button
                type="button"
                onClick={handleBulkUpdate}
                disabled={bulkSubmitting}
                className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {bulkSubmitting ? "Updating..." : "Apply to Selected"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {viewMode === "table" ? (
        /* Submissions Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-[11px] text-slate-600">
                <tr>
                  <th className="py-3.5 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={items.length > 0 && selectedIds.length === items.length}
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-3">Candidate / Reg No</th>
                  <th className="py-3.5 px-3 text-center">Series</th>
                  <th className="py-3.5 px-3 text-center">Question (1 - 200)</th>
                  <th className="py-3.5 px-3 text-center">Claimed Option</th>
                  <th className="py-3.5 px-3 text-center">Evidence Proof</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-3 text-center">Locked</th>
                  <th className="py-3.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-500">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      Loading submissions...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-500">
                      <FaQuestionCircle className="text-3xl text-slate-300 mx-auto mb-2" />
                      No objections found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => handleSelectRow(item.id)}
                          className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-900">{item.candidateName || "Candidate"}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Reg: {item.registrationNo}</span>
                          {item.rollNo && <span className="font-bold text-blue-700">Roll: {item.rollNo}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-900 font-extrabold rounded text-xs">
                          {item.bookletSeries}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold rounded-md text-xs">
                          Q. {item.questionNo}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-extrabold text-emerald-700">{item.candidateAnswer}</td>
                      <td className="py-3 px-3 text-center">
                        {item.documentPath ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleViewProof(
                                item.id,
                                `Reg: ${item.registrationNo} | Series ${item.bookletSeries} | Q. ${item.questionNo}`
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-bold text-[11px] transition cursor-pointer"
                          >
                            <FaFilePdf /> View Proof
                          </button>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            item.status === "Accepted"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.status === "Rejected"
                              ? "bg-rose-100 text-rose-800"
                              : item.status === "Under Review"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {item.status || "Submitted"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.isFinalSubmitted ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px]">
                            <FaLock /> Yes
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Draft</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => openReviewModal(item)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing <span className="font-bold">{items.length}</span> of{" "}
              <span className="font-bold">{totalCount}</span> total objections (Page {page} of {totalPages})
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchObjections(page - 1)}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
              >
                Previous
              </button>
              <span className="font-bold px-2">{page}</span>
              <button
                type="button"
                onClick={() => fetchObjections(page + 1)}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Question-wise Grouped Summary View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-800">
              प्रश्न-वार एवं सीरीज-वार आपत्ति विश्लेषण (Question 1-200 & Series Analytics)
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Total Contested Questions: {summaryData.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 border-b border-slate-200 uppercase font-bold text-[11px] text-slate-600">
                <tr>
                  <th className="py-3 px-3">Series</th>
                  <th className="py-3 px-3 text-center">Question No (1 - 200)</th>
                  <th className="py-3 px-3 text-center">Total Challenges</th>
                  <th className="py-3 px-3 text-center">Unique Candidates</th>
                  <th className="py-3 px-3">Breakup of Claims</th>
                  <th className="py-3 px-3 text-center">Review Status Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {summaryLoading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-500">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      Computing grouped analysis...
                    </td>
                  </tr>
                ) : summaryData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-500">
                      No question summaries found.
                    </td>
                  </tr>
                ) : (
                  summaryData.map((item, idx) => (
                    <tr key={`${item.bookletSeries}-${item.questionNo}-${idx}`} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-extrabold text-blue-800">{item.bookletSeries}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold rounded-md text-xs">
                          Q. {item.questionNo}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-black text-blue-700 text-sm">
                        {item.totalChallenges}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-600">{item.uniqueCandidates}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1.5">
                          {item.claimedOptions?.map((co) => (
                            <span
                              key={co.option}
                              className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold"
                            >
                              {co.option}: <span className="font-extrabold">{co.count}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold" title="Accepted">
                            Acc: {item.acceptedCount}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold" title="Rejected">
                            Rej: {item.rejectedCount}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold" title="Under Review">
                            Rev: {item.underReviewCount}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review & Status Modal */}
      {reviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <span>Review Objection:</span>
                  <span className="text-yellow-400">Series {reviewItem.bookletSeries} - Q. {reviewItem.questionNo}</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Candidate: {reviewItem.candidateName} (Reg: {reviewItem.registrationNo} | Roll: {reviewItem.rollNo || "-"})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewItem(null)}
                className="text-white hover:text-red-400 font-bold text-lg cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Question Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block uppercase text-[10px]">Series</span>
                  <span className="font-bold text-slate-800 text-sm">{reviewItem.bookletSeries}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase text-[10px]">Question No</span>
                  <span className="font-bold text-blue-700 text-sm">#{reviewItem.questionNo}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase text-[10px]">Claimed Option</span>
                  <span className="font-bold text-emerald-700 text-sm">{reviewItem.candidateAnswer}</span>
                </div>
              </div>

              {/* Justification Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  अभ्यर्थी द्वारा प्रस्तुत विवरण (Candidate Academic Justification):
                </label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {reviewItem.description || "No detailed explanation provided."}
                </div>
              </div>

              {/* Documentary Proof Button */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  संलग्न साक्ष्य दस्तावेज (Documentary Evidence):
                </label>
                {reviewItem.documentPath ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleViewProof(
                        reviewItem.id,
                        `Proof for Reg ${reviewItem.registrationNo} - Q. ${reviewItem.questionNo}`
                      )
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition cursor-pointer"
                  >
                    <FaFilePdf /> साक्ष्य पूर्वावलोकन देखें (Inspect Evidence Document)
                  </button>
                ) : (
                  <p className="text-slate-400 italic">No proof file attached by candidate.</p>
                )}
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  समिति निर्णय स्थिति (Review Status) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["Submitted", "Under Review", "Accepted", "Rejected"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setReviewStatus(st)}
                      className={`py-2 text-center rounded-lg font-bold text-xs border transition cursor-pointer ${
                        reviewStatus === st
                          ? st === "Accepted"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : st === "Rejected"
                            ? "bg-rose-600 text-white border-rose-600"
                            : st === "Under Review"
                            ? "bg-purple-600 text-white border-purple-600"
                            : "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Committee Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  विशेषज्ञ समिति टिप्पणी (Committee Remarks / Notes):
                </label>
                <textarea
                  rows="3"
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder="विषय विशेषज्ञ समिति की आधिकारिक टिप्पणी दर्ज करें..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReviewItem(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReview}
                disabled={reviewSubmitting}
                className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <FaSave /> {reviewSubmitting ? "Saving..." : "Save Status & Remarks"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof Document Preview Modal */}
      {proofModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="max-w-4xl w-full h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-sm flex items-center gap-2">
                <FaFilePdf /> {proofModalTitle || "Proof Document Preview"}
              </span>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(proofModalUrl);
                  setProofModalUrl(null);
                }}
                className="text-white hover:text-red-400 font-bold text-lg cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 p-2">
              <iframe src={proofModalUrl} title="Document Preview" className="w-full h-full rounded border-0" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminObjectionTracker;
