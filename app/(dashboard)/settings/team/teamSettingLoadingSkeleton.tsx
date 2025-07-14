import { TableCell, TableRow } from "@/components/ui/table";

export function TeamSettingLoadingSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <div className="h-5 w-[180px] rounded bg-secondary animate-skeleton" />
          </TableCell>
          <TableCell>
            <div className="h-5 w-[120px] rounded bg-secondary animate-skeleton" />
          </TableCell>
          <TableCell>
            <div className="h-5 w-[80px] rounded bg-secondary animate-skeleton" />
          </TableCell>
          <TableCell>
            <div className="h-5 w-[100px] rounded bg-secondary animate-skeleton" />
          </TableCell>
          <TableCell>
            <div className="flex gap-2">
              <div className="h-5 w-[80px] rounded bg-secondary animate-skeleton" />
              <div className="h-5 w-[90px] rounded bg-secondary animate-skeleton" />
            </div>
          </TableCell>
          <TableCell>
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded bg-secondary animate-skeleton" />
              <div className="h-8 w-8 rounded bg-secondary animate-skeleton" />
            </div>
          </TableCell>
          <TableCell>
            <div className="h-5 w-[60px] rounded bg-secondary animate-skeleton" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
