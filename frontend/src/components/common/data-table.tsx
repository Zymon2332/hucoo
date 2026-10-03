"use client";

import * as React from "react";
import { Columns3, X } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { SearchInput } from "@/components/common/search-input";
import { cn } from "@/lib/utils";

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  isLoading?: boolean;
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  enableRowSelection?: boolean;
  bulkActions?: (rows: TData[], clearSelection: () => void) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  pageSize?: number;
  onRowClick?: (row: TData) => void;
  getRowId?: (row: TData) => string;
  rowClassName?: (row: TData) => string | undefined;
  showPagination?: boolean;
  showColumnToggle?: boolean;
  showSearch?: boolean;
  className?: string;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder = "搜索…",
  toolbar,
  enableRowSelection = false,
  bulkActions,
  emptyTitle,
  emptyDescription,
  emptyAction,
  pageSize = 10,
  onRowClick,
  getRowId,
  rowClassName,
  showPagination = true,
  showColumnToggle = true,
  showSearch = true,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const selectionColumn = React.useMemo<ColumnDef<TData, unknown>>(
    () => ({
      id: "select",
      size: 36,
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(value === true)}
          aria-label="全选当前页"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(value === true)}
          onClick={(event) => event.stopPropagation()}
          aria-label="选择该行"
        />
      ),
    }),
    [],
  );

  const tableColumns = React.useMemo(
    () => (enableRowSelection ? [selectionColumn, ...columns] : columns),
    [columns, enableRowSelection, selectionColumn],
  );

  const globalFilterFn = React.useCallback((row: Row<TData>, _columnId: string, filterValue: unknown) => {
    const needle = String(filterValue ?? "").trim().toLowerCase();
    if (!needle) return true;
    return JSON.stringify(row.original).toLowerCase().includes(needle);
  }, []);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting, columnVisibility, rowSelection, globalFilter },
    enableRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
  const pageIndex = table.getState().pagination.pageIndex;

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {showSearch ? (
          <SearchInput
            value={globalFilter}
            onChange={setGlobalFilter}
            placeholder={searchPlaceholder}
            className="w-full sm:w-64"
          />
        ) : null}
        {toolbar}
        <div className="ml-auto flex items-center gap-1.5">
          {enableRowSelection && selectedRows.length > 0 && bulkActions ? (
            <div className="mr-1 flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2 py-1">
              <span className="num text-2xs font-medium">已选 {selectedRows.length} 项</span>
              {bulkActions(selectedRows, () => table.resetRowSelection())}
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="取消选择"
                onClick={() => table.resetRowSelection()}
              >
                <X />
              </Button>
            </div>
          ) : null}
          {showColumnToggle ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-2xs">
                  <Columns3 />
                  列
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>显示列</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllLeafColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(value === true)}
                      onSelect={(event) => event.preventDefault()}
                    >
                      {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id} style={{ width: header.getSize() === 150 ? undefined : header.getSize() }}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="hover:text-foreground flex cursor-pointer items-center gap-1 transition-colors"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span className="text-2xs">
                            {sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : ""}
                          </span>
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`}>
                  {tableColumns.map((_column, columnIndex) => (
                    <TableCell key={`skeleton-cell-${columnIndex}`}>
                      <Skeleton className="h-3.5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={tableColumns.length} className="p-0">
                  <EmptyState
                    title={emptyTitle ?? (globalFilter ? "没有匹配的记录" : "暂无数据")}
                    description={
                      emptyDescription ??
                      (globalFilter
                        ? "尝试更换关键词或清空筛选条件。"
                        : "还没有任何记录，创建第一条数据后这里会显示列表。")
                    }
                    action={emptyAction}
                    className="m-4 border-0"
                  />
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(onRowClick && "cursor-pointer", rowClassName?.(row.original))}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination ? (
        <Pagination
          page={pageIndex + 1}
          pageSize={table.getState().pagination.pageSize}
          total={table.getFilteredRowModel().rows.length}
          onPageChange={(nextPage) => table.setPageIndex(nextPage - 1)}
          onPageSizeChange={(nextSize) => table.setPageSize(nextSize)}
        />
      ) : null}
    </div>
  );
}
