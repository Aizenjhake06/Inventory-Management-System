import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { withAuth } from '@/lib/api-helpers'

/**
 * GET /api/dept-manager/agents
 * Returns list of operations agents assigned to a channel.
 * Used to populate the agent dropdown on the Agent Performance page.
 */
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    if (user.role !== 'dept-manager' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const channel = searchParams.get('channel') || user.assignedChannel

    if (!channel) {
      return NextResponse.json([])
    }

    // Fetch operations agents for this channel
    const { data: opsUsers, error } = await supabaseAdmin
      .from('users')
      .select('username, display_name, assigned_channel, role')
      .ilike('assigned_channel', channel)
      .in('role', ['operations', 'dept-manager'])
      .order('display_name', { ascending: true })

    if (error) {
      console.error('[DeptManager Agents] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
    }

    return NextResponse.json(
      (opsUsers || []).map(a => ({
        username: a.username,
        displayName: a.role === 'dept-manager' ? `${a.display_name || a.username} (Dept. Head)` : (a.display_name || a.username),
        assignedChannel: a.assigned_channel,
        isManager: a.role === 'dept-manager'
      }))
    )
  } catch (error) {
    console.error('[DeptManager Agents] Exception:', error)
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
  }
})
