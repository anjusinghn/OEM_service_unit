import type { DemoState } from "@kaz/shared"

export interface OEMAdapter {
  name: string
  create(): DemoState
  tick(state: DemoState): DemoState
}
