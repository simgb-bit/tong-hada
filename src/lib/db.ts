// 통 HADA - 데이터 액세스 레이어 (Repository)
//
// 동작 방식
//  1. VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 설정되면 SupabaseRepository 사용
//  2. 미설정(로컬 데모) 이면 InMemoryRepository 로 폴백
//
// 두 구현 모두 동일한 Repository 인터페이스를 따르므로 상위 코드는 백엔드를 신경 쓰지 않습니다.
// (localStorage 는 사용하지 않습니다.)

import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { buildSeedBundle } from '@/lib/seed'
import type {
  Attachment,
  Employee,
  Organization,
  Tong,
  TongInput,
  TongSummary,
  TongTypeDef,
} from '@/types'

export interface FullDataset {
  organizations: Organization[]
  employees: Employee[]
  tongs: Tong[]
  inputs: TongInput[]
  summaries: TongSummary[]
  tongTypes: TongTypeDef[]
  attachments: Attachment[]
}

export interface Repository {
  /** 백엔드 모드 (UI 표시용) */
  mode: 'supabase' | 'memory'
  /** 전체 데이터를 한 번에 로드. 비어 있으면 시드 데이터를 주입한다. */
  loadAll(): Promise<FullDataset>

  upsertTong(tong: Tong): Promise<void>
  deleteTong(id: string): Promise<void>

  addInput(input: TongInput): Promise<void>

  upsertSummary(summary: TongSummary): Promise<void>

  upsertTongType(typeDef: TongTypeDef): Promise<void>
  deleteTongType(id: string): Promise<void>

  addAttachment(att: Attachment): Promise<void>

  replaceEmployees(employees: Employee[]): Promise<void>
}

export function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory 구현 (데모용 폴백)
// ─────────────────────────────────────────────────────────────────────────────
class InMemoryRepository implements Repository {
  mode = 'memory' as const
  private data: FullDataset = buildSeedBundle()

  async loadAll(): Promise<FullDataset> {
    return structuredClone(this.data)
  }

  async upsertTong(tong: Tong): Promise<void> {
    const i = this.data.tongs.findIndex((t) => t.id === tong.id)
    if (i >= 0) this.data.tongs[i] = tong
    else this.data.tongs.push(tong)
  }

  async deleteTong(id: string): Promise<void> {
    this.data.tongs = this.data.tongs.filter((t) => t.id !== id)
    this.data.inputs = this.data.inputs.filter((x) => x.tong_id !== id)
    this.data.summaries = this.data.summaries.filter((x) => x.tong_id !== id)
    this.data.attachments = this.data.attachments.filter((x) => x.tong_id !== id)
  }

  async addInput(input: TongInput): Promise<void> {
    this.data.inputs.push(input)
  }

  async upsertSummary(summary: TongSummary): Promise<void> {
    const i = this.data.summaries.findIndex((s) => s.tong_id === summary.tong_id)
    if (i >= 0) this.data.summaries[i] = summary
    else this.data.summaries.push(summary)
  }

  async upsertTongType(typeDef: TongTypeDef): Promise<void> {
    const i = this.data.tongTypes.findIndex((t) => t.id === typeDef.id)
    if (i >= 0) this.data.tongTypes[i] = typeDef
    else this.data.tongTypes.push(typeDef)
  }

  async deleteTongType(id: string): Promise<void> {
    this.data.tongTypes = this.data.tongTypes.filter((t) => t.id !== id)
  }

  async addAttachment(att: Attachment): Promise<void> {
    this.data.attachments.push(att)
  }

  async replaceEmployees(employees: Employee[]): Promise<void> {
    this.data.employees = employees
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase 구현
// ─────────────────────────────────────────────────────────────────────────────
class SupabaseRepository implements Repository {
  mode = 'supabase' as const

  private get client() {
    if (!supabase) throw new Error('Supabase client is not configured')
    return supabase
  }

  async loadAll(): Promise<FullDataset> {
    const c = this.client
    const [orgs, emps, tongs, inputs, summaries, types, atts] = await Promise.all([
      c.from('organizations').select('*'),
      c.from('employees').select('*'),
      c.from('tongs').select('*'),
      c.from('tong_inputs').select('*'),
      c.from('tong_summaries').select('*'),
      c.from('tong_types').select('*'),
      c.from('attachments').select('*'),
    ])

    const dataset: FullDataset = {
      organizations: (orgs.data ?? []) as Organization[],
      employees: (emps.data ?? []) as Employee[],
      tongs: (tongs.data ?? []) as Tong[],
      inputs: (inputs.data ?? []) as TongInput[],
      summaries: (summaries.data ?? []) as TongSummary[],
      tongTypes: (types.data ?? []) as TongTypeDef[],
      attachments: (atts.data ?? []) as Attachment[],
    }

    // 최초 실행 시(조직 데이터가 비어 있으면) 시드 주입
    if (dataset.organizations.length === 0) {
      const seed = buildSeedBundle()
      // 외래키 의존성 순서대로 직렬 삽입한다.
      //  organizations → (employees, tongs) → (tong_inputs, tong_summaries)
      const fail = (label: string, error: unknown) => {
        if (error) throw new Error(`시드 주입 실패 (${label}): ${(error as { message?: string }).message ?? error}`)
      }

      fail('organizations', (await c.from('organizations').insert(seed.organizations)).error)
      const [empRes, tongRes, typeRes] = await Promise.all([
        c.from('employees').insert(seed.employees),
        c.from('tongs').insert(seed.tongs),
        c.from('tong_types').insert(seed.tongTypes),
      ])
      fail('employees', empRes.error)
      fail('tongs', tongRes.error)
      fail('tong_types', typeRes.error)
      const [inRes, sumRes] = await Promise.all([
        c.from('tong_inputs').insert(seed.inputs),
        c.from('tong_summaries').insert(seed.summaries),
      ])
      fail('tong_inputs', inRes.error)
      fail('tong_summaries', sumRes.error)

      return seed
    }

    return dataset
  }

  async upsertTong(tong: Tong): Promise<void> {
    const { error } = await this.client.from('tongs').upsert(tong)
    if (error) throw error
  }

  async deleteTong(id: string): Promise<void> {
    const { error } = await this.client.from('tongs').delete().eq('id', id)
    if (error) throw error
  }

  async addInput(input: TongInput): Promise<void> {
    const { error } = await this.client.from('tong_inputs').insert(input)
    if (error) throw error
  }

  async upsertSummary(summary: TongSummary): Promise<void> {
    const { error } = await this.client.from('tong_summaries').upsert(summary, { onConflict: 'tong_id' })
    if (error) throw error
  }

  async upsertTongType(typeDef: TongTypeDef): Promise<void> {
    const { error } = await this.client.from('tong_types').upsert(typeDef)
    if (error) throw error
  }

  async deleteTongType(id: string): Promise<void> {
    const { error } = await this.client.from('tong_types').delete().eq('id', id)
    if (error) throw error
  }

  async addAttachment(att: Attachment): Promise<void> {
    const { error } = await this.client.from('attachments').insert(att)
    if (error) throw error
  }

  async replaceEmployees(employees: Employee[]): Promise<void> {
    const c = this.client
    await c.from('employees').delete().neq('id', '')
    if (employees.length > 0) {
      const { error } = await c.from('employees').insert(employees)
      if (error) throw error
    }
  }
}

/** 환경에 맞는 단일 Repository 인스턴스 */
export const repo: Repository = isSupabaseConfigured
  ? new SupabaseRepository()
  : new InMemoryRepository()
