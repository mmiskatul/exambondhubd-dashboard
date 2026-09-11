import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  /** Real count of broadcast notifications, filled in from the API. */
  unreadNotificationsCount: number;
  notificationsLoaded: boolean;
}

// Starts at zero: the badge only appears once real data says so. It used to be
// hardcoded to 3, so the Navbar always showed an unread dot that meant nothing.
const initialState: UIState = {
  unreadNotificationsCount: 0,
  notificationsLoaded: false,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setNotificationsCount: (state, action: PayloadAction<number>) => {
      state.unreadNotificationsCount = action.payload;
      state.notificationsLoaded = true;
    },
    clearNotificationsCount: (state) => {
      state.unreadNotificationsCount = 0;
    },
  },
});

export const { setNotificationsCount, clearNotificationsCount } = uiSlice.actions;
export default uiSlice.reducer;
