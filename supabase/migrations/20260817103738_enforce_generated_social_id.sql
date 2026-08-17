revoke insert on public.profils from authenticated;

grant insert (user_id, pseudo, classement_public, partage_activite)
on public.profils
to authenticated;

comment on column public.profils.id_public is
  'Identifiant social aléatoire généré exclusivement par la base, immuable et distinct du UUID Auth.';
