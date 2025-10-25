"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MedicalRecordsPage;
/**
 * Medical Records List Page
 * Displays patient's medical records with search, filtering, and pagination
 */
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const outline_1 = require("@heroicons/react/24/outline");
const statusColors = {
    DRAFT: 'bg-gray-100 text-gray-800',
    PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
    SIGNED: 'bg-green-100 text-green-800',
    AMENDED: 'bg-blue-100 text-blue-800',
    ADDENDUM: 'bg-purple-100 text-purple-800',
};
const statusLabels = {
    DRAFT: 'Borrador',
    PENDING_REVIEW: 'Pendiente',
    SIGNED: 'Firmado',
    AMENDED: 'Enmendado',
    ADDENDUM: 'Adenda',
};
function MedicalRecordsPage() {
    const router = (0, navigation_1.useRouter)();
    const [records, setRecords] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    // Filters and pagination
    const [search, setSearch] = (0, react_1.useState)('');
    const [page, setPage] = (0, react_1.useState)(1);
    const [totalPages, setTotalPages] = (0, react_1.useState)(1);
    const [totalCount, setTotalCount] = (0, react_1.useState)(0);
    const [showFilters, setShowFilters] = (0, react_1.useState)(false);
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('');
    const [startDate, setStartDate] = (0, react_1.useState)('');
    const [endDate, setEndDate] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        fetchRecords();
    }, [page, search, statusFilter, startDate, endDate]);
    const fetchRecords = async () => {
        try {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '10',
            });
            if (search)
                params.append('search', search);
            if (statusFilter)
                params.append('status', statusFilter);
            if (startDate)
                params.append('startDate', startDate);
            if (endDate)
                params.append('endDate', endDate);
            const response = await fetch(`/api/portal/records?${params.toString()}`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Error al cargar registros');
            }
            if (data.success && data.data) {
                setRecords(data.data.records);
                setTotalPages(data.data.pagination.totalPages);
                setTotalCount(data.data.pagination.totalCount);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
            console.error('Error fetching records:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleSearch = (value) => {
        setSearch(value);
        setPage(1); // Reset to first page on search
    };
    const handleRecordClick = (recordId) => {
        router.push(`/portal/dashboard/records/${recordId}`);
    };
    const clearFilters = () => {
        setSearch('');
        setStatusFilter('');
        setStartDate('');
        setEndDate('');
        setPage(1);
    };
    return (<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => router.push('/portal/dashboard')} className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors">
            <outline_1.ChevronLeftIcon className="h-5 w-5 mr-1"/>
            Volver al Dashboard
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            =Ë Mis Registros Médicos
          </h1>
          <p className="text-gray-600">
            {totalCount > 0
            ? `${totalCount} registro${totalCount !== 1 ? 's' : ''} en total`
            : 'No hay registros'}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1 relative">
              <outline_1.MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"/>
              <input type="text" placeholder="Buscar en registros médicos..." value={search} onChange={(e) => handleSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
            </div>

            {/* Filter Toggle */}
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <outline_1.FunnelIcon className="h-5 w-5"/>
              Filtros
              {(statusFilter || startDate || endDate) && (<span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {[statusFilter, startDate, endDate].filter(Boolean).length}
                </span>)}
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (<div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <select value={statusFilter} onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
            }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">Todos los estados</option>
                    <option value="DRAFT">Borrador</option>
                    <option value="PENDING_REVIEW">Pendiente</option>
                    <option value="SIGNED">Firmado</option>
                    <option value="AMENDED">Enmendado</option>
                    <option value="ADDENDUM">Adenda</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Desde
                  </label>
                  <input type="date" value={startDate} onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
            }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hasta
                  </label>
                  <input type="date" value={endDate} onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
            }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>

              {/* Clear Filters */}
              {(statusFilter || startDate || endDate || search) && (<button onClick={clearFilters} className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Limpiar todos los filtros
                </button>)}
            </div>)}
        </div>

        {/* Records List */}
        {loading ? (<div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>) : error ? (<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">{error}</p>
            <button onClick={fetchRecords} className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors">
              Reintentar
            </button>
          </div>) : records.length === 0 ? (<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <outline_1.DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4"/>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No se encontraron registros
            </h3>
            <p className="text-gray-600">
              {search || statusFilter || startDate || endDate
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Tus registros médicos aparecerán aquí'}
            </p>
          </div>) : (<div className="space-y-4">
            {records.map((record) => (<div key={record.id} onClick={() => handleRecordClick(record.id)} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Chief Complaint */}
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                      {record.chiefComplaint || 'Sin motivo de consulta'}
                    </h3>

                    {/* Date and Clinician */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <outline_1.CalendarIcon className="h-4 w-4"/>
                        <span>
                          {(0, date_fns_1.format)(new Date(record.createdAt), "d 'de' MMMM, yyyy", {
                    locale: locale_1.es,
                })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <outline_1.UserIcon className="h-4 w-4"/>
                        <span>
                          Dr. {record.clinician.firstName} {record.clinician.lastName}
                          {record.clinician.specialty && ` - ${record.clinician.specialty}`}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[record.status]}`}>
                        {statusLabels[record.status]}
                      </span>
                    </div>
                  </div>

                  {/* Arrow Icon */}
                  <div className="ml-4">
                    <outline_1.ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors"/>
                  </div>
                </div>
              </div>))}
          </div>)}

        {/* Pagination */}
        {totalPages > 1 && (<div className="mt-8 flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <button onClick={() => setPage(page - 1)} disabled={page === 1} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <outline_1.ChevronLeftIcon className="h-4 w-4"/>
              Anterior
            </button>

            <span className="text-sm text-gray-600">
              Página {page} de {totalPages}
            </span>

            <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Siguiente
              <outline_1.ChevronRightIcon className="h-4 w-4"/>
            </button>
          </div>)}
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map