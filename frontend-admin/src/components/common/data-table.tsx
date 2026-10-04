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
  /** 每页条数：非服务端模式下作为初始值，服务端模式下为受控值 */
  pageSize?: number;
  onRowClick?: (row: TData) => void;
  getRowId?: (row: TData) => string;
  rowClassName?: (row: TData) => string | undefined;
  showPagination?: boolean;
  showColumnToggle?: boolean;
  showSearch?: boolean;
  className?: string;
  /**
   * 服务端分页模式：传入 `total` 与 `onPageChange` 后，DataTable 不再使用内置的
   * `getPaginationRowModel`，分页状态完全由调用方（通常是后端返回的 page/pageSize/total）驱动。
   */
  total?: number;
  page?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  /**
   * 服务端搜索模式：传入 `onSearchChange` 后，搜索框变为受控组件，
   * 关键字交给后端（`globalFilter` 不再对当前页做本地过滤）。
   */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
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
  onRowClick,
  getRowId,
  rowClassName,
  showPagination = true,
  showColumnToggle = true,
  showSearch = true,
  className,
  total,
  page,
  pageSize: controlledPageSize = 10,
  onPageChange,
  onPageSizeChange,
  searchValue,
  onSearchChange,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: controlledPageSize,
  });

  const manualPagination = total !== undefined && typeof onPageChange === "function";
  const manualFiltering = typeof onSearchChange === "function";
  const searchTerm = manualFiltering ? (searchValue ?? "") : globalFilter;
  const effectivePageSize = manualPagination ? controlledPageSize : pagination.pageSize;
  const paginationState = manualPagination
    ? { pageIndex: Math.max(0, (page ?? 1) - 1), pageSize: effectivePageSize }
    : pagination;

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

  const globalFilterFn = React.useCallback(
    (row: Row<TData>, _columnId: string, filterValue: unknown) => {
      const needle = String(filterValue ?? "")
        .trim()
        .toLowerCase();
      if (!needle) return true;
      return JSON.stringify(row.original).toLowerCase().includes(needle);
    },
    [],
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      ...(manualFiltering ? {} : { globalFilter }),
      ...(manualPagination ? { pagination: paginationState } : {}),
    },
    enableRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    ...(manualFiltering ? {} : { onGlobalFilterChange: setGlobalFilter }),
    onPaginationChange: manualPagination
      ? (updater) => {
          const next = typeof updater === "function" ? updater(paginationState) : updater;
          if (next.pageSize !== paginationState.pageSize) onPageSizeChange?.(next.pageSize);
          if (next.pageIndex !== paginationState.pageIndex) onPageChange?.(next.pageIndex + 1);
        }
      : setPagination,
    globalFilterFn,
    manualPagination,
    manualFiltering,
    pageCount: manualPagination
      ? Math.max(1, Math.ceil((total ?? 0) / Math.max(1, effectivePageSize)))
      : undefined,
    rowCount: manualPagination ? (total ?? 0) : undefined,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    initialState: { pagination: { pageSize: controlledPageSize } },
  });

  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
  const pageIndex = table.getState().pagination.pageIndex;

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {showSearch ? (
          <SearchInput
            value={searchTerm}
            onChange={
              manualFiltering ? (onSearchChange as (value: string) => void) : setGlobalFilter
            }
            placeholder={searchPlaceholder}
            className="w-full sm:w-64"
          />
        ) : null}
        {toolbar}
        <div className="ml-auto flex items-center gap-1.5">
          {enableRowSelection && selectedRows.length > 0 && bulkActions ? (
            <div className="border-primary/30 bg-primary/5 mr-1 flex items-center gap-1.5 rounded-md border px-2 py-1">
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
                  <Columns3 />列
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
                      {typeof column.columnDef.header === "string"
                        ? column.columnDef.header
                        : column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() === 150 ? undefined : header.getSize() }}
                    >
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
                    title={emptyTitle ?? (searchTerm ? "没有匹配的记录" : "暂无数据")}
                    description={
                      emptyDescription ??
                      (searchTerm
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
          page={manualPagination ? (page ?? 1) : pageIndex + 1}
          pageSize={effectivePageSize}
          total={manualPagination ? (total ?? 0) : table.getFilteredRowModel().rows.length}
          onPageChange={(nextPage) =>
            manualPagination ? onPageChange?.(nextPage) : table.setPageIndex(nextPage - 1)
          }
          onPageSizeChange={
            manualPagination ? onPageSizeChange : (nextSize) => table.setPageSize(nextSize)
          }
        />
      ) : null}
    </div>
  );
}
