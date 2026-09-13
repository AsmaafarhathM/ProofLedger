'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/common/status-badge';
import { EmptyState } from '@/components/common/empty-state';
import { apiClient } from '@/lib/api-client';
import { Organization } from '@/lib/types';
import { ArrowRight, Building2, Plus, Users } from 'lucide-react';

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchOrganizations = async () => {
    try {
      const data = await apiClient.get<any>('/organizations');
      const list = Array.isArray(data) ? data : data?.organizations || data?.data || [];
      setOrganizations(list);
    } catch (err) {
      console.error('Failed to load organizations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await fetchOrganizations();
    })();
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')) {
      setSlug(autoSlug);
    }
  };

  const handleSlugChange = (val: string) => {
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const sanitizedSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');

    if (!name.trim() || !sanitizedSlug) {
      setError('Name and a valid lowercase slug (e.g. cybersafe) are required');
      return;
    }

    setIsCreating(true);
    try {
      await apiClient.post('/organizations', { name, slug: sanitizedSlug, description });
      setIsModalOpen(false);
      setName('');
      setSlug('');
      setDescription('');
      fetchOrganizations();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create organization';
      setError(errorMsg);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Organizations
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Multi-tenant agency & forensic lab entities.
            </p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Organization
          </Button>
        </div>

        {/* Organizations Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 rounded-2xl bg-zinc-900/40 animate-pulse border border-zinc-800"
              />
            ))}
          </div>
        ) : organizations.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-8 h-8" />}
            title="No Organizations Found"
            description="You are not a member of any organization yet. Create your first forensic organization to begin."
            action={
              <Button
                onClick={() => setIsModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Create Organization
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <Card
                key={org.id}
                className="bg-zinc-900/60 border-zinc-800 hover:border-emerald-500/40 transition-all duration-200 flex flex-col justify-between"
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    {org.userRole && <StatusBadge status={org.userRole} />}
                  </div>
                  <CardTitle>{org.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {org.description || `Slug: ${org.slug}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-800/60 pt-4 mt-2">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>{org._count?.members || 1} Members</span>
                    </div>
                    <Link
                      href={`/organizations/${org.id}`}
                      className="text-emerald-400 font-medium hover:underline flex items-center gap-1"
                    >
                      Open Org <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Organization Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Create Forensic Organization"
          description="Setup a multi-tenant organization to manage cases and assign investigator roles."
        >
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <Input
              label="Organization Name"
              placeholder="e.g. Metro Digital Forensics Lab"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />

            <Input
              label="Organization Slug"
              placeholder="metro-forensics-lab"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              helperText="Unique identifier used in API URLs (must be lowercase)"
              required
            />

            <Input
              label="Description (Optional)"
              placeholder="Primary cybercrime unit"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="flex justify-end gap-3 mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isCreating}>
                Create Organization
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
