type DatabaseError = {
  code?: string
  message: string
}

export function profileErrorMessage(error: DatabaseError) {
  if (error.code === '23505' && error.message.includes('profils_pseudo_unique_idx')) {
    return 'Ce pseudo est déjà utilisé. Choisis-en un autre.'
  }

  return error.message
}
