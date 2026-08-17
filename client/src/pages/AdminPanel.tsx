import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function AdminPanel() {
  const { user, isAuthenticated } = useAuth();
  const [selectedSource, setSelectedSource] = useState("wikipedia");
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is admin
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="p-6">
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Access denied. Only administrators can access this panel.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const triggerScrapingMutation = trpc.legal.triggerScraping.useMutation({
    onSuccess: (data) => {
      setJobStatus(`Scraping job started: ${data.jobId}`);
      setIsLoading(false);
    },
    onError: (error) => {
      setJobStatus(`Error: ${error.message}`);
      setIsLoading(false);
    },
  });

  const triggerExtractionMutation = trpc.legal.triggerExtraction.useMutation({
    onSuccess: (data) => {
      setJobStatus(`Extraction job started: ${data.jobId}`);
      setIsLoading(false);
    },
    onError: (error) => {
      setJobStatus(`Error: ${error.message}`);
      setIsLoading(false);
    },
  });

  const handleTriggerScraping = async () => {
    setIsLoading(true);
    setJobStatus(null);
    await triggerScrapingMutation.mutateAsync({ source: selectedSource });
  };

  const handleTriggerExtraction = async () => {
    setIsLoading(true);
    setJobStatus(null);
    await triggerExtractionMutation.mutateAsync({});
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-gray-600 mt-2">Manage scraping and extraction jobs</p>
      </div>

      {/* Status Message */}
      {jobStatus && (
        <Alert className={jobStatus.includes("Error") ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}>
          {jobStatus.includes("Error") ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className={jobStatus.includes("Error") ? "text-red-800" : "text-green-800"}>
            {jobStatus}
          </AlertDescription>
        </Alert>
      )}

      {/* Job Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scraping Job */}
        <Card>
          <CardHeader>
            <CardTitle>Trigger Scraping Job</CardTitle>
            <CardDescription>Collect legal documents from selected source</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Source</label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wikipedia">Wikipedia</SelectItem>
                  <SelectItem value="legifrance">Légifrance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleTriggerScraping}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                "Start Scraping"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Extraction Job */}
        <Card>
          <CardHeader>
            <CardTitle>Trigger Extraction Job</CardTitle>
            <CardDescription>Extract legal entities from collected documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              This will process all documents and extract legal entities using AI.
            </p>
            <Button
              onClick={handleTriggerExtraction}
              disabled={isLoading}
              className="w-full"
              variant="secondary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                "Start Extraction"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Job History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
          <CardDescription>Monitor job execution history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Job history tracking coming soon
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
