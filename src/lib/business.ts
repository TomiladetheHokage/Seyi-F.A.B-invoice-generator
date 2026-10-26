// ============================================================
// SEYI F.A.B — business settings
//
// This is the ONE place to edit the business details that appear
// on every invoice: branding, bank accounts and the closing
// message. Change the values below and every new invoice picks
// them up automatically — no other code needs to change.
// ============================================================

import defaultLogoUrl from "@/assets/SEYI(FAB)-logo-Picsart-AiImageEnhancer.jpg";

export const BUSINESS = {
  /** Business name shown on the app and every PDF. */
  name: "SEYI F.A.B",
  /** Slogan shown under the business name. */
  slogan: "For Glory and Beauty.",
  /** Friendly message printed at the bottom of every invoice. */
  closingMessage: "Thanks and God bless you.",
  /**
   * Default logo shown in the app and embedded in every PDF.
   * Replace the file `src/assets/seyi-fab-logo.png` to change it
   * for the whole business; users can also pick a one-off logo
   * per invoice in the app.
   */
  logoUrl: defaultLogoUrl,
  /**
   * Bank accounts printed in the payment section of every invoice.
   * NOTE: the account numbers below are placeholders — replace
   * them with the real business account numbers before going live.
   */
  bankAccounts: [
    { bank: "Opay", accountNumber: "8128665790", accountName: "Yemi-Oyebola Oluseyi" },
    { bank: "Providus", accountNumber: "1808739398", accountName: "Yemi-Oyebola Oluseyi" },
    { bank: "GTBank", accountNumber: "0001912707", accountName: "Yemi-Oyebola Oluseyi" },
  ],
} as const;
