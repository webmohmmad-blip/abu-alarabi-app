/**
 * objectAcl.ts — ACL policy types and helpers.
 *
 * The actual ACL enforcement is not used by any production route.
 * Production access control is handled at the API/auth middleware layer.
 *
 * NOTE: The @google-cloud/storage File type has been removed.
 *       ACL functions now operate on a generic StorageFile interface
 *       satisfied by R2File in objectStorage.ts.
 */

// ── Interfaces ────────────────────────────────────────────────────────────────

/** Any storage file object that supports reading custom metadata. */
export interface StorageFile {
  getMetadata(): Promise<[{ metadata?: Record<string, string> }]>;
  setMetadata?(opts: { metadata: Record<string, string> }): Promise<void>;
}

// ── Access group types (extend as needed for future use) ─────────────────────

export enum ObjectAccessGroupType {}

export interface ObjectAccessGroup {
  type: ObjectAccessGroupType;
  id: string;
}

export enum ObjectPermission {
  READ = 'read',
  WRITE = 'write',
}

export interface ObjectAclRule {
  group: ObjectAccessGroup;
  permission: ObjectPermission;
}

export interface ObjectAclPolicy {
  owner: string;
  visibility: 'public' | 'private';
  aclRules?: ObjectAclRule[];
}

// ── ACL metadata key ──────────────────────────────────────────────────────────

const ACL_POLICY_METADATA_KEY = 'custom:aclPolicy';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isPermissionAllowed(
  requested: ObjectPermission,
  granted: ObjectPermission,
): boolean {
  if (requested === ObjectPermission.READ) {
    return [ObjectPermission.READ, ObjectPermission.WRITE].includes(granted);
  }
  return granted === ObjectPermission.WRITE;
}

// ── Public functions ──────────────────────────────────────────────────────────

/**
 * Stores an ACL policy in object custom metadata.
 *
 * NOTE: R2/S3 does not support in-place metadata updates — a CopyObject
 * operation is needed. Since no production route calls this, it is a no-op stub.
 */
export async function setObjectAclPolicy(
  _objectFile: StorageFile,
  _aclPolicy: ObjectAclPolicy,
): Promise<void> {
  // Stub — see note above
}

/**
 * Reads the ACL policy from object custom metadata.
 */
export async function getObjectAclPolicy(
  objectFile: StorageFile,
): Promise<ObjectAclPolicy | null> {
  try {
    const [meta] = await objectFile.getMetadata();
    const raw = meta?.metadata?.[ACL_POLICY_METADATA_KEY];
    if (!raw) return null;
    return JSON.parse(raw) as ObjectAclPolicy;
  } catch {
    return null;
  }
}

/**
 * Checks whether a user can access an object under its ACL policy.
 */
export async function canAccessObject({
  userId,
  objectFile,
  requestedPermission,
}: {
  userId?: string;
  objectFile: StorageFile;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy) return false;

  if (
    aclPolicy.visibility === 'public' &&
    requestedPermission === ObjectPermission.READ
  ) {
    return true;
  }

  if (!userId) return false;
  if (aclPolicy.owner === userId) return true;

  for (const rule of aclPolicy.aclRules ?? []) {
    if (isPermissionAllowed(requestedPermission, rule.permission)) {
      return true;
    }
  }

  return false;
}
