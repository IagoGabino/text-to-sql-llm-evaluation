import { Card } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Database } from 'lucide-react';

interface ResultsTableProps {
  data: Array<Record<string, any>>;
  columns: string[];
}

const ResultsTable = ({ data, columns }: ResultsTableProps) => {
  if (!data || data.length === 0) {
    return (
      <Card className="p-8 text-center animate-fade-in">
        <Database className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No results to display</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden animate-fade-in">
      <div className="px-4 py-3 border-b border-border bg-card">
        <h3 className="text-sm font-semibold text-foreground">Query Results</h3>
        <p className="text-xs text-muted-foreground mt-1">{data.length} rows returned</p>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0">
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col} className="font-semibold text-foreground">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIndex) => (
              <TableRow 
                key={rowIndex}
                className="hover:bg-muted/50 transition-colors"
              >
                {columns.map((col) => (
                  <TableCell key={col} className="text-sm">
                    {row[col] !== null && row[col] !== undefined 
                      ? String(row[col]) 
                      : <span className="text-muted-foreground italic">null</span>
                    }
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default ResultsTable;
