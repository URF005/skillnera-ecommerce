import { IconButton, Tooltip } from '@mui/material'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { MaterialReactTable, MRT_ShowHideColumnsButton, MRT_ToggleDensePaddingButton, MRT_ToggleFullScreenButton, MRT_ToggleGlobalFilterButton, useMaterialReactTable } from 'material-react-table'
import Link from 'next/link'
import React, { useState } from 'react'
import RecyclingIcon from '@mui/icons-material/Recycling';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import useDeleteMutation from '@/hooks/useDeleteMutation'
import ButtonLoading from '../ButtonLoading'
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import { showToast } from '@/lib/showToast'
import { download, generateCsv, mkConfig } from 'export-to-csv'
const Datatable = ({
    queryKey,
    fetchUrl,
    columnsConfig,
    initialPageSize = 10,
    exportEndpoint,
    deleteEndpoint,
    deleteType,
    trashView,
    createAction,
    showExport = true,
}) => {

    // filter , sorting and pagination states 
    const [columnFilters, setColumnFilters] = useState([])
    const [globalFilter, setGlobalFilter] = useState('')
    const [sorting, setSorting] = useState([])
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: initialPageSize
    })

    // Row selection state  
    const [rowSelection, setRowSelection] = useState({})

    // Export loading state 
    const [exportLoading, setExportLoading] = useState(false)

    // handle delete method  
    const deleteMutation = useDeleteMutation(queryKey, deleteEndpoint)

    // delete method 
    const handleDelete = (ids, deleteType) => {
        let c
        if (deleteType === 'PD') {
            c = confirm('Are you sure you want to delete the data permanently?')
        } else {
            c = confirm('Are you sure you want to move data into trash?')
        }

        if (c) {
            deleteMutation.mutate({ ids, deleteType })
            setRowSelection({})
        }
    }


    // export method  

    const handleExport = async (selectedRows) => {
        setExportLoading(true)
        try {
            const csvConfig = mkConfig({
                fieldSeparator: ',',
                decimalSeparator: '.',
                useKeysAsHeaders: true,
                filename: 'csv-data'
            })

            let csv

            if (Object.keys(rowSelection).length > 0) {
                // export only selected rows  
                const rowData = selectedRows.map((row) => row.original)
                csv = generateCsv(csvConfig)(rowData)
            } else {
                // export all data  
                const { data: response } = await axios.get(exportEndpoint)
                if (!response.success) {
                    throw new Error(response.message)
                }

                const rowData = response.data
                csv = generateCsv(csvConfig)(rowData)
            }

            download(csvConfig)(csv)

        } catch (error) {
            console.log(error)
            showToast('error', error.message)
        } finally {
            setExportLoading(false)
        }
    }


    // Data fetching logics 

    const {
        data: { data = [], meta } = {},
        isError,
        isRefetching,
        isLoading
    } = useQuery({
        queryKey: [queryKey, { columnFilters, globalFilter, pagination, sorting }],
        queryFn: async () => {
            const url = new URL(fetchUrl, process.env.NEXT_PUBLIC_BASE_URL)
            url.searchParams.set(
                'start',
                `${pagination.pageIndex * pagination.pageSize}`,
            );
            url.searchParams.set('size', `${pagination.pageSize}`);
            url.searchParams.set('filters', JSON.stringify(columnFilters ?? []));
            url.searchParams.set('globalFilter', globalFilter ?? '');
            url.searchParams.set('sorting', JSON.stringify(sorting ?? []));
            url.searchParams.set('deleteType', deleteType);

            const { data: response } = await axios.get(url.href)
            return response
        },

        placeholderData: keepPreviousData,
    })



    // init table  

    const table = useMaterialReactTable({
        columns: columnsConfig,
        data,
        enableRowSelection: true,
        columnFilterDisplayMode: 'popover',
        paginationDisplayMode: 'pages',
        enableColumnOrdering: true,
        enableStickyHeader: true,
        enableStickyFooter: true,
        initialState: { showColumnFilters: true },
        manualFiltering: true,
        manualPagination: true,
        manualSorting: true,
        muiToolbarAlertBannerProps: isError
            ? {
                color: 'error',
                children: 'Error loading data',
            }
            : undefined,

        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        rowCount: meta?.totalRowCount ?? 0,
        onRowSelectionChange: setRowSelection,
        state: {
            columnFilters,
            globalFilter,
            isLoading,
            pagination,
            showAlertBanner: isError,
            showProgressBars: isRefetching,
            sorting,
            rowSelection
        },

        getRowId: (originalRow) => originalRow._id,

        // inside useMaterialReactTable({ ... })
        renderToolbarInternalActions: ({ table }) => {
            const hasTrash = Boolean(trashView);            // ✅ guard for recycle-bin link
            const hasDelete = Boolean(deleteEndpoint);      // ✅ guard for delete actions
            const selected = table.getIsSomeRowsSelected() || table.getIsAllRowsSelected();

            return (
                <>
                    {/* built in buttons */}
                    <MRT_ToggleGlobalFilterButton table={table} />
                    <MRT_ShowHideColumnsButton table={table} />
                    <MRT_ToggleFullScreenButton table={table} />
                    <MRT_ToggleDensePaddingButton table={table} />

                    {/* ♻️ Recycle Bin: only render if trashView is provided */}
                    {hasTrash && deleteType !== 'PD' && (
                        <Tooltip title="Recycle Bin">
                            <Link href={trashView}>
                                <IconButton>
                                    <RecyclingIcon />
                                </IconButton>
                            </Link>
                        </Tooltip>
                    )}

                    {/* 🗑️ Soft delete button: only if deleteEndpoint is provided AND we're in SD mode */}
                    {hasDelete && deleteType === 'SD' && (
                        <Tooltip title="Delete Selected">
                            <IconButton
                                disabled={!selected}
                                onClick={() => handleDelete(Object.keys(rowSelection), deleteType)}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    )}

                    {/* 🧹 Trash view actions: only if deleteEndpoint is provided AND we're in PD mode */}
                    {hasDelete && deleteType === 'PD' && (
                        <>
                            <Tooltip title="Restore Selected">
                                <IconButton
                                    disabled={!selected}
                                    onClick={() => handleDelete(Object.keys(rowSelection), 'RSD')}
                                >
                                    <RestoreFromTrashIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Permanently Delete Selected">
                                <IconButton
                                    disabled={!selected}
                                    onClick={() => handleDelete(Object.keys(rowSelection), deleteType)}
                                >
                                    <DeleteForeverIcon />
                                </IconButton>
                            </Tooltip>
                        </>
                    )}
                </>
            );
        },


        enableRowActions: true,
        positionActionsColumn: 'last',
        renderRowActionMenuItems: ({ row }) => createAction(row, deleteType, handleDelete),

        renderTopToolbarCustomActions: ({ table }) => {
            if (!showExport) return null;   // ⬅️ hide on demand
            const selectedRows = table.getSelectedRowModel().rows;
            const canExportSelected = selectedRows.length > 0;
            const canExportAll = Boolean(exportEndpoint);
            return (
                <Tooltip title={canExportAll || canExportSelected ? "" : "Select rows to export"}>
                    <span>
                        <ButtonLoading
                            type="button"
                            text={<><SaveAltIcon fontSize='25' /> Export</>}
                            loading={exportLoading}
                            onClick={() => handleExport(selectedRows)}
                            className="cursor-pointer"
                            disabled={!canExportAll && !canExportSelected}
                        />
                    </span>
                </Tooltip>
            );
        },
    })

    return (
        <MaterialReactTable table={table} />
    )
}

export default Datatable