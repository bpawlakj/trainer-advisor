// Branded `TrainerId` — compile-time enforcement of multi-tenant discipline.
// Per AGENTS.md: every query function takes `trainerId` as its first argument.
// Cast at the auth boundary (requireAuth helper) to mark a session-derived
// trainer id as authoritative, then propagate the branded type through the
// query layer so a plain string can't be accidentally substituted.
export type TrainerId = string & { readonly __brand: 'TrainerId' };
