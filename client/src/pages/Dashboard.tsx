import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Fetch documents
  const { data: documentsData, isLoading: docsLoading } = trpc.legal.listDocuments.useQuery({
    limit,
    offset,
  });

  // Fetch statistics
  const { data: stats } = trpc.legal.getStatistics.useQuery();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Legal Intelligence Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor collected legal documents and extracted entities</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDocuments || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Favorable Verdicts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.verdictDistribution?.find((v: any) => v.verdict === "favorable")?.count || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Rejected Verdicts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.verdictDistribution?.find((v: any) => v.verdict === "rejected")?.count || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((stats?.averageConfidence as number || 0) / 100).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Documents</CardTitle>
          <CardDescription>Latest collected legal documents</CardDescription>
        </CardHeader>
        <CardContent>
          {docsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="animate-spin" />
            </div>
          ) : documentsData?.documents && documentsData.documents.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date Collected</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentsData.documents.map((doc: any) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <Badge variant="outline">{doc.source}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate">{doc.typeDocument}</TableCell>
                      <TableCell>{new Date(doc.dateCollecte).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {doc.niveauConfianceExtraction ? (
                          <span className="text-sm">{doc.niveauConfianceExtraction}%</span>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No documents found</div>
          )}

          {/* Pagination */}
          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              variant="outline"
            >
              Previous
            </Button>
            <Button
              onClick={() => setOffset(offset + limit)}
              disabled={!documentsData?.documents || documentsData.documents.length < limit}
              variant="outline"
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
