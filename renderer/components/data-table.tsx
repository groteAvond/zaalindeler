import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  Table as TableType,
  Header,
  HeaderGroup,
  Cell,
  Row,
} from "@tanstack/react-table"

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  meta?: any
}

export function DataTable<T>({ columns, data, meta }: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta
  })

  return (
    <div className="w-full">
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup: HeaderGroup<T>) => (
            <tr key={headerGroup.id} className="border-b border-gray-200 dark:border-gray-800">
              {headerGroup.headers.map((header: Header<T, unknown>) => (
                <th 
                  key={header.id} 
                  className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row: Row<T>, i: number) => (
            <tr 
              key={row.id} 
              className={`
                border-b border-gray-200 dark:border-gray-800 last:border-0
                hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors
                ${i % 2 === 0 ? 'bg-gray-50/50 dark:bg-gray-900/50' : ''}
              `}
            >
              {row.getVisibleCells().map((cell: Cell<T, unknown>) => (
                <td key={cell.id} className="px-6 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
