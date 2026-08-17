type RoleLookup = {
  data: { user_id: string } | null
  error: { message: string } | null
}

export function resolveAuthenticatedRoles<UserType>(
  user: UserType,
  adminResult: RoleLookup,
  openerResult: RoleLookup,
) {
  return {
    user,
    isAdmin: !adminResult.error && Boolean(adminResult.data),
    isOpener: !openerResult.error && Boolean(openerResult.data),
    error: adminResult.error ?? openerResult.error,
  }
}
