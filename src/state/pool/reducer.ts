// eslint-disable-next-line no-unused-vars
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { initialState } from './type'
export const tokens = createSlice({
  name: 'pool',
  initialState,
  reducers: {
    setCurrentPoolInfo: (
      state,
      action: PayloadAction<{
        cToken: string
        dTokens: string[]
        logicAddress?: string
      }>
    ) => {
      state.cToken = action.payload.cToken
      state.dTokens = action.payload.dTokens
      state.logicAddress = action.payload.logicAddress
    }
  }
})

// Actions
export const {
  setCurrentPoolInfo
} = tokens.actions

export default tokens.reducer
