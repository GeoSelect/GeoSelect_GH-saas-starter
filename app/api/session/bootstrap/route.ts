import { NextResponse } from 'next/server';
import { supabaseRoute } from '@/lib/supabase/server';
import { getEnabledFeatures } from '@/lib/features/flags';
import { getUserPermissions } from '@/lib/permissions/check';
import { getEnvironment } from '@/lib/config/environment';
import { isMaintenanceMode } from '@/lib/operations/flags';

type BootstrapResponse = {
  ok: true;
  user: { id: string; email: string | null } | null;
  account: { id: string; name: string } | null;
  role: string | null;
  permissions: string[];
  features: Record<string, boolean>;
  entitlements: {
    plan_tier: string;
    features: Record<string, any>;
    limits: Record<string, any>;
    overrides: Record<string, any>;
  } | null;
  system: {
    maintenance_mode: boolean;
    environment: string;
  };
};

export async function POST() {
  const supabase = await supabaseRoute();


  // 1) Who is the user?
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) {
    // This surfaces cookie/session issues clearly
    return NextResponse.json({ ok: false, error: userErr.message }, { status: 401 });
  }
  const user = userData?.user ?? null;

  // Anonymous bootstrap is allowed (CCP-00 returns nulls)
  if (!user) {
    const res: BootstrapResponse = {
      ok: true,
      user: null,
      account: null,
      role: null,
      permissions: [],
      features: getEnabledFeatures(null, null, null),
      entitlements: null,
      system: {
        maintenance_mode: isMaintenanceMode(),
        environment: getEnvironment()
      }
    };
    return NextResponse.json(res);
  }

  // 2) Find an account membership (first account is fine for v0)
  const { data: au, error: auErr } = await supabase
    .from('account_users')
    .select('account_id, role')
    .eq('user_id', user.id)
    .limit(1);

  if (auErr) {
    return NextResponse.json({ ok: false, error: auErr.message }, { status: 500 });
  }

  const membership = au?.[0] ?? null;
  if (!membership) {
    const res: BootstrapResponse = {
      ok: true,
      user: { id: user.id, email: user.email ?? null },
      account: null,
      role: null,
      permissions: [],
      features: getEnabledFeatures({ id: user.id, email: user.email }, null, null),
      entitlements: null,
      system: {
        maintenance_mode: isMaintenanceMode(),
        environment: getEnvironment()
      }
    };
    return NextResponse.json(res);
  }

  // 3) Load account (RLS enforced)
  const { data: acct, error: acctErr } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('id', membership.account_id)
    .single();

  if (acctErr) {
    return NextResponse.json({ ok: false, error: acctErr.message }, { status: 500 });
  }

  // 4) Load entitlements (RLS enforced)
  const { data: ent, error: entErr } = await supabase
    .from('entitlements')
    .select('plan_tier, features, limits, overrides')
    .eq('account_id', membership.account_id)
    .maybeSingle();

  if (entErr) {
    return NextResponse.json({ ok: false, error: entErr.message }, { status: 500 });
  }

  const entitlements = ent
    ? {
        plan_tier: ent.plan_tier,
        features: (ent.features ?? {}) as any,
        limits: (ent.limits ?? {}) as any,
        overrides: (ent.overrides ?? {}) as any
      }
    : {
        plan_tier: 'free',
        features: {},
        limits: {},
        overrides: {}
      };

  const userObj = { id: user.id, email: user.email ?? null };
  const accountObj = { id: acct.id, name: acct.name };
  const role = membership.role ?? null;

  const res: BootstrapResponse = {
    ok: true,
    user: userObj,
    account: accountObj,
    role: role,
    permissions: getUserPermissions(role),
    features: getEnabledFeatures(userObj, accountObj, entitlements),
    entitlements: entitlements,
    system: {
      maintenance_mode: isMaintenanceMode(),
      environment: getEnvironment()
    }
  };

  return NextResponse.json(res);
}
