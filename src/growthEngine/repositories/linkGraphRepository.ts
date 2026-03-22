/**
 * Link Graph Repository
 *
 * Data access layer for surface link graph.
 */

import {
  GrowthSurfaceLinkGraph,
  GrowthSurfaceLinkType,
} from '../types';

export interface LinkGraphFilter {
  fromSurfaceId?: string;
  toSurfaceId?: string;
  linkType?: GrowthSurfaceLinkType[];
  isActive?: boolean;
}

/**
 * Create a new link
 */
export async function createLink(
  data: Omit<GrowthSurfaceLinkGraph, 'id' | 'createdAt'>
): Promise<GrowthSurfaceLinkGraph> {
  const id = crypto.randomUUID();
  const now = new Date();

  const link: GrowthSurfaceLinkGraph = {
    id,
    ...data,
    createdAt: now,
  };

  await saveLink(link);
  return link;
}

/**
 * Get link by ID
 */
export async function getLinkById(id: string): Promise<GrowthSurfaceLinkGraph | null> {
  return findLinkById(id);
}

/**
 * Get outbound links from a surface
 */
export async function getOutboundLinks(
  fromSurfaceId: string,
  activeOnly: boolean = true
): Promise<GrowthSurfaceLinkGraph[]> {
  const all = await getAllLinks();

  return all.filter(link => {
    if (link.fromSurfaceId !== fromSurfaceId) return false;
    if (activeOnly && !link.isActive) return false;
    return true;
  });
}

/**
 * Get inbound links to a surface
 */
export async function getInboundLinks(
  toSurfaceId: string,
  activeOnly: boolean = true
): Promise<GrowthSurfaceLinkGraph[]> {
  const all = await getAllLinks();

  return all.filter(link => {
    if (link.toSurfaceId !== toSurfaceId) return false;
    if (activeOnly && !link.isActive) return false;
    return true;
  });
}

/**
 * Check if link exists
 */
export async function linkExists(
  fromSurfaceId: string,
  toSurfaceId: string,
  linkType?: GrowthSurfaceLinkType
): Promise<boolean> {
  const all = await getAllLinks();

  return all.some(link =>
    link.fromSurfaceId === fromSurfaceId &&
    link.toSurfaceId === toSurfaceId &&
    (linkType === undefined || link.linkType === linkType)
  );
}

/**
 * Update link
 */
export async function updateLink(
  id: string,
  data: Partial<GrowthSurfaceLinkGraph>
): Promise<GrowthSurfaceLinkGraph | null> {
  const existing = await findLinkById(id);
  if (!existing) return null;

  const updated: GrowthSurfaceLinkGraph = {
    ...existing,
    ...data,
  };

  await saveLink(updated);
  return updated;
}

/**
 * Delete link
 */
export async function deleteLink(id: string): Promise<boolean> {
  return removeLink(id);
}

/**
 * Delete links from a surface
 */
export async function deleteOutboundLinks(fromSurfaceId: string): Promise<number> {
  const all = await getAllLinks();
  let deleted = 0;

  for (const link of all) {
    if (link.fromSurfaceId === fromSurfaceId) {
      await removeLink(link.id);
      deleted++;
    }
  }

  return deleted;
}

/**
 * List links with filters
 */
export async function listLinks(
  filter: LinkGraphFilter = {},
  limit: number = 100,
  offset: number = 0
): Promise<{
  data: GrowthSurfaceLinkGraph[];
  total: number;
}> {
  let links = await getAllLinks();

  // Apply filters
  if (filter.fromSurfaceId) {
    links = links.filter(l => l.fromSurfaceId === filter.fromSurfaceId);
  }
  if (filter.toSurfaceId) {
    links = links.filter(l => l.toSurfaceId === filter.toSurfaceId);
  }
  if (filter.linkType?.length) {
    links = links.filter(l => filter.linkType!.includes(l.linkType));
  }
  if (filter.isActive !== undefined) {
    links = links.filter(l => l.isActive === filter.isActive);
  }

  // Sort by created date descending
  links.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const total = links.length;
  const data = links.slice(offset, offset + limit);

  return { data, total };
}

// ============================================================================
// In-Memory Storage
// ============================================================================

const linkStore: Map<string, GrowthSurfaceLinkGraph> = new Map();

async function saveLink(link: GrowthSurfaceLinkGraph): Promise<void> {
  linkStore.set(link.id, link);
}

async function findLinkById(id: string): Promise<GrowthSurfaceLinkGraph | null> {
  return linkStore.get(id) ?? null;
}

async function removeLink(id: string): Promise<boolean> {
  return linkStore.delete(id);
}

async function getAllLinks(): Promise<GrowthSurfaceLinkGraph[]> {
  return Array.from(linkStore.values());
}

/**
 * Seed test data
 */
export function seedTestLinks(links: GrowthSurfaceLinkGraph[]): void {
  for (const link of links) {
    linkStore.set(link.id, link);
  }
}
