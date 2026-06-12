-- Allow any short reaction token (emoji or named tapback) so reaction sets
-- (couple / friends / professional) can store emoji directly.
alter table public.message_reactions
  drop constraint if exists message_reactions_reaction_check;
alter table public.message_reactions
  add constraint message_reactions_reaction_check
  check (char_length(reaction) between 1 and 32);
