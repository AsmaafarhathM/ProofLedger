'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { AlertTriangle, FileCheck, ShieldCheck, Upload } from 'lucide-react';

export default function EvidenceUploadPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = use(params);
  const router = useRouter();

  const [evidenceNumber, setEvidenceNumber] = useState(
    () => `EVD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError('Please select a digital evidence file to upload');
      return;
    }
    if (!evidenceNumber.trim() || !title.trim()) {
      setError('Evidence number and title are required');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('evidenceNumber', evidenceNumber);
      formData.append('title', title);
      if (description) formData.append('description', description);

      const res = await apiClient.postForm<{ evidence?: { id: string }; id?: string }>(
        `/cases/${caseId}/evidence`,
        formData,
      );
      const evId = res.evidence?.id || res.id;
      router.push(`/evidence/${evId}`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Evidence upload failed';
      setError(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Secure Evidence Upload
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Upload binary evidence to MinIO Object Storage with SHA-256 integrity digest.
          </p>
        </div>

        <Card className="bg-zinc-900/80 border-zinc-800 backdrop-blur-2xl">
          <CardHeader>
            <CardTitle>Upload Evidence File</CardTitle>
            <CardDescription>
              SHA-256 cryptographic hash will be automatically computed and stored immutably.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* File Dropzone */}
              <div className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-950/50 hover:border-emerald-500/50 transition-colors text-center cursor-pointer relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  required
                />
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/20">
                  <Upload className="w-6 h-6" />
                </div>
                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <span className="font-semibold text-sm text-zinc-100 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-zinc-400 mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Binary file'}
                    </span>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">
                      Click or drag evidence file here
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Supports disk dumps, PCAP captures, server logs, documents, images
                    </p>
                  </div>
                )}
              </div>

              <Input
                label="Evidence Number"
                placeholder="EVD-2026-1001"
                value={evidenceNumber}
                onChange={(e) => setEvidenceNumber(e.target.value)}
                required
              />

              <Input
                label="Evidence Title"
                placeholder="e.g. Server Disk Image Dump"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <Input
                label="Description (Optional)"
                placeholder="Details regarding collection method, hardware serial, location"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="flex justify-end gap-3 mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isUploading}
                  leftIcon={<ShieldCheck className="w-4 h-4" />}
                >
                  Upload & Compute SHA-256
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
