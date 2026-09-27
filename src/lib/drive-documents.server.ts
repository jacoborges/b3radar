import type { Portfolio } from "./portfolio.functions";
import type { SimPortfolio } from "./sim-portfolio.functions";
import type { SectorPreference } from "./user-settings.functions";

export interface UserSettingsDocument {
  brapiTokenCiphertext: string | null;
  sectorPreference: SectorPreference | null;
}

export const EMPTY_PORTFOLIOS: Portfolio[] = [];
export const EMPTY_SIMULATIONS: SimPortfolio[] = [];
export const EMPTY_USER_SETTINGS: UserSettingsDocument = {
  brapiTokenCiphertext: null,
  sectorPreference: null,
};
