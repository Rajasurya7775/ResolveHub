import React from 'react';

export interface IssueTableFiltersProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  projectFilter: string;
  onProjectChange: (val: string) => void;
  projectOptions: string[];
  typeFilter: string;
  onTypeChange: (val: string) => void;
  dateFilter: string;
  onDateChange: (val: string) => void;
  shiftFilter: string;
  onShiftChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  onClearFilters: () => void;
  onExportCsv?: () => void;
  isExporting?: boolean;
}

export const IssueTableFilters: React.FC<IssueTableFiltersProps> = ({
  searchTerm,
  onSearchChange,
  projectFilter,
  onProjectChange,
  projectOptions,
  typeFilter,
  onTypeChange,
  dateFilter,
  onDateChange,
  shiftFilter,
  onShiftChange,
  statusFilter,
  onStatusChange,
  onClearFilters,
  onExportCsv,
  isExporting = false
}) => {
  return (
    <div className="bg-white rounded-3 border border-light-subtle shadow-sm p-2.5 mb-2.5 flex-shrink-0">
      <div className="row g-2.5 align-items-end">
        {/* Filter 1: Issue ID / Title */}
        <div className="col-12 col-sm-6 col-lg-3">
          <label className="filter-label-sm">1. Issue ID / Title</label>
          <div className="input-group input-group-sm">
            <span
              className="input-group-text bg-light text-muted border-end-0 py-1"
              style={{ borderRadius: '8px 0 0 8px' }}
            >
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control filter-control-sm border-start-0"
              style={{ borderRadius: '0 8px 8px 0' }}
              placeholder="Search ID or Title..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        {/* Filter 2: Project */}
        <div className="col-6 col-sm-6 col-lg-2">
          <label className="filter-label-sm">2. Project</label>
          <select
            className="form-select filter-control-sm"
            value={projectFilter}
            onChange={(e) => onProjectChange(e.target.value)}
          >
            <option value="All">All Projects</option>
            {projectOptions.length > 0 ? (
              projectOptions.map((proj) => {
                const projName =
                  typeof proj === 'string'
                    ? proj
                    : (proj as any)?.project_name || (proj as any)?.name || String(proj);
                return (
                  <option key={projName} value={projName}>
                    {projName}
                  </option>
                );
              })
            ) : (
              <>
                <option value="Nokia Production Dashboard">Nokia Production</option>
                <option value="Manufacturing Analytics">Manufacturing</option>
                <option value="Inventory Monitoring">Inventory</option>
                <option value="Network Monitoring">Network</option>
              </>
            )}
          </select>
        </div>

        {/* Filter 3: Issue Type */}
        <div className="col-6 col-sm-6 col-lg-2">
          <label className="filter-label-sm">3. Issue Type</label>
          <select
            className="form-select filter-control-sm"
            value={typeFilter}
            onChange={(e) => onTypeChange(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="Front-end">Front-end</option>
            <option value="Backend">Backend</option>
            <option value="Database">Database</option>
            <option value="Hardware">Hardware</option>
            <option value="Others">Others</option>
          </select>
        </div>

        {/* Filter 4: Date */}
        <div className="col-6 col-sm-6 col-lg-2">
          <label className="filter-label-sm">4. Date</label>
          <input
            type="date"
            className="form-control filter-control-sm"
            value={dateFilter}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>

        {/* Filter 5: Shift */}
        <div className="col-6 col-sm-4 col-lg-1" style={{ minWidth: '95px' }}>
          <label className="filter-label-sm">5. Shift</label>
          <select
            className="form-select filter-control-sm"
            value={shiftFilter}
            onChange={(e) => onShiftChange(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Shift-A">Shift-A</option>
            <option value="Shift-B">Shift-B</option>
            <option value="Shift-C">Shift-C</option>
            <option value="General">General</option>
          </select>
        </div>

        {/* Filter 6: Status */}
        <div className="col-6 col-sm-4 col-lg-1" style={{ minWidth: '95px' }}>
          <label className="filter-label-sm">6. Status</label>
          <select
            className="form-select filter-control-sm"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Open">Open</option>
            <option value="In progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="On Hold">On Hold</option>
            <option value="Escalated">Escalated</option>
          </select>
        </div>

        {/* Action Buttons: Reset & CSV */}
        <div className="col-12 col-sm-4 col-lg-1 d-flex gap-1.5 ms-auto justify-content-end">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm filter-control-sm px-2.5 flex-grow-1 d-flex align-items-center justify-content-center gap-1"
            onClick={onClearFilters}
            title="Reset all filters"
          >
            <i className="bi bi-x-circle"></i>
            <span className="d-none d-sm-inline">Reset</span>
          </button>

          {onExportCsv && (
            <button
              type="button"
              className="btn btn-outline-success btn-sm filter-control-sm px-2.5 d-flex align-items-center justify-content-center"
              onClick={onExportCsv}
              title="Export visible issues to CSV"
              disabled={isExporting}
            >
              <i className="bi bi-download"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssueTableFilters;
