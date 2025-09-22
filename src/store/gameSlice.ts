import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type Level = 'low' | 'medium' | 'high'

export type GameState = {
  userId: string | null
  totalAmount: number
  betAmount: number
  betLevel: Level
  betSteps: number
  extra?: string
}

const initialState: GameState = {
  userId: null,
  totalAmount: 100000.00,
  betAmount: 2,
  betLevel: 'medium',
  betSteps: 1,
  extra: undefined,
}

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<{ userId: string; totalAmount: number }>) {
      state.userId = action.payload.userId
      state.totalAmount = action.payload.totalAmount
    },
    updateBalance(state, action: PayloadAction<number>){
      state.totalAmount = Math.max(0, state.totalAmount + action.payload)
    },
    setBetAmount(state, action: PayloadAction<number>){
      const v = Math.max(2, Math.min(200, Math.floor(action.payload)))
      state.betAmount = v
    },
    setBetLevel(state, action: PayloadAction<Level>){
      state.betLevel = action.payload
    },
    setBetSteps(state, action: PayloadAction<number>){
      state.betSteps = Math.max(1, action.payload | 0)
    },
    setExtra(state, action: PayloadAction<string>){
      state.extra = action.payload
    },
    applyBetResult(state, action: PayloadAction<any>){
      const data = action.payload
      if (typeof data.totalAmount === 'number') state.totalAmount = data.totalAmount
      if (typeof data.betSteps === 'number') state.betSteps = data.betSteps
      if (typeof data.extra === 'string') state.extra = data.extra
    }
  }
})

export const { setUser, updateBalance, setBetAmount, setBetLevel, setBetSteps, setExtra, applyBetResult } = gameSlice.actions
export default gameSlice.reducer


