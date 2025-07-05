import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SessionsTableRowSkeleton = () => {
  return (
    <TableRow>
      {/* Title */}
      <TableCell className="font-medium">
        <Skeleton className="h-4 w-32 md:w-48" />
      </TableCell>
      {/* Status */}
      <TableCell>
        <Skeleton className="h-6 w-20" />
      </TableCell>
      {/* Created */}
      <TableCell>
        <div className="flex items-center gap-1">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-4 w-24" />
        </div>
      </TableCell>
      {/* Actions */}
      <TableCell className="text-right">
        <Skeleton className="h-8 w-16 ml-auto" />
      </TableCell>
    </TableRow>
  );
};

export const SessionsListSkeleton = ({ count = 5 }: { count?: number }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: count }, (_, i) => (
          <SessionsTableRowSkeleton key={i} />
        ))}
      </TableBody>
    </Table>
  );
};
